import { BASIC_KANA_LIST, isBasicHiragana, splitKana, toRomaji, usesOnly } from "@/lib/kana/hiragana";
import type { CharStat, WordStat } from "@/lib/progress/types";
import { LENGTH_BOUNDS, type Settings } from "@/lib/settings/types";
import { HIRAGANA_VOCAB } from "@/lib/vocab/hiragana-words";
import type { VocabWord } from "@/lib/vocab/types";
import { charWeight } from "./adaptive";
import { randInt, shuffle, weightedSample, type Rng } from "./random";
import { rateQuestion } from "./timer";
import type { GeneratorState, Question, Round } from "./types";

export interface GenerateInput {
  settings: Pick<Settings, "mode" | "questionsPerRound" | "lengthRange" | "enabledChars" | "timerPace">;
  chars: Record<string, CharStat>;
  words: Record<string, WordStat>;
  gen: GeneratorState;
  vocab?: VocabWord[];
  rng?: Rng;
  now?: number;
}

export type GenerateResult =
  | { ok: true; round: Round; gen: GeneratorState }
  | { ok: false; reason: "no-chars" | "no-words"; message: string };

const VOCAB_BY_KANA = new Map(HIRAGANA_VOCAB.map((w) => [w.kana, w]));

// v1 hard rule: only the 46 basic hiragana, whatever settings say
export function resolveEnabled(enabled: string[]): string[] {
  const set = new Set(enabled.filter(isBasicHiragana));
  return BASIC_KANA_LIST.filter((k) => set.has(k));
}

export function wordsForChars(enabled: string[], vocab = HIRAGANA_VOCAB): VocabWord[] {
  const allowed = new Set(resolveEnabled(enabled));
  return vocab.filter((w) => usesOnly(w.kana, allowed));
}

export function generateRound(input: GenerateInput): GenerateResult {
  const rng = input.rng ?? Math.random;
  const now = input.now ?? Date.now();
  const { settings, chars, words } = input;
  const vocab = input.vocab ?? HIRAGANA_VOCAB;
  const enabled = resolveEnabled(settings.enabledChars);
  const need = settings.questionsPerRound;
  const [minLen, maxLen] = LENGTH_BOUNDS[settings.lengthRange];

  if (enabled.length === 0) {
    return { ok: false, reason: "no-chars", message: "Pick at least one character to practice." };
  }

  const charPool = wordsForChars(enabled, vocab);
  if (settings.mode === "words" && charPool.length === 0) {
    return {
      ok: false,
      reason: "no-words",
      message:
        "No real words can be spelled with only the characters you picked. Add more rows, or switch to Random Combos to drill these characters.",
    };
  }

  const notices: string[] = [];
  const gen: GeneratorState = {
    deck: input.gen.deck.filter((k) => enabled.includes(k)),
    usedWords: [...input.gen.usedWords],
    recentCombos: [...input.gen.recentCombos],
  };

  // how many real words this round
  let wordTarget = 0;
  if (settings.mode === "words") wordTarget = need;
  else if (settings.mode === "mixed") wordTarget = rng() < 0.5 ? Math.floor(need / 2) : Math.ceil(need / 2);

  // length filter first, relax it if the selection is too small
  let pool = charPool.filter((w) => {
    const n = splitKana(w.kana).length;
    return n >= minLen && n <= maxLen;
  });
  if (wordTarget > 0 && pool.length < wordTarget && charPool.length > pool.length) {
    pool = charPool;
    if (settings.mode === "words") {
      notices.push(`Not many words fit the ${settings.lengthRange} length with your characters, so some lengths were relaxed.`);
    }
  }

  const wordCount = Math.min(wordTarget, pool.length);
  if (settings.mode === "words" && wordCount < need) {
    notices.push(
      `Only ${pool.length} real word${pool.length === 1 ? "" : "s"} fit your selected characters, so this round is shorter. Add more characters or try Random Combos for full rounds.`,
    );
  }
  if (settings.mode === "mixed" && wordCount < wordTarget) {
    notices.push("Few real words fit your characters, so the rest of this round is reading practice.");
  }

  // pick words: prefer ones not seen this cycle, nudged toward weak chars
  const picked: VocabWord[] = [];
  if (wordCount > 0) {
    const used = new Set(gen.usedWords);
    let fresh = pool.filter((w) => !used.has(w.id));
    if (fresh.length < wordCount) {
      // pool exhausted, start a new cycle but keep the last few out so nothing repeats instantly
      const keepOut = gen.usedWords
        .filter((id) => pool.some((w) => w.id === id))
        .slice(-Math.min(12, Math.floor(pool.length / 3)));
      gen.usedWords = keepOut;
      const keep = new Set(keepOut);
      fresh = pool.filter((w) => !keep.has(w.id));
    }
    const weight = (w: VocabWord) => {
      const ks = splitKana(w.kana);
      const avg = ks.reduce((s, k) => s + charWeight(chars[k], k), 0) / ks.length;
      const ws = words[w.id];
      const missBoost = ws ? ((ws.seen - ws.correct) / ws.seen) * 1.5 : 0.4;
      return avg + missBoost;
    };
    picked.push(...weightedSample(fresh, weight, Math.min(wordCount, fresh.length), rng));
    gen.usedWords.push(...picked.map((w) => w.id));
    if (gen.usedWords.length > vocab.length) gen.usedWords = gen.usedWords.slice(-vocab.length);
  }

  const randomCount = settings.mode === "words" ? 0 : need - picked.length;
  const combos: string[] = [];
  const taken = new Set<string>(picked.map((w) => w.kana));
  const recent = new Set(gen.recentCombos);

  const draw = (): string => {
    if (gen.deck.length === 0) gen.deck = buildDeck(enabled, chars, rng);
    return gen.deck.shift()!;
  };

  for (let i = 0; i < randomCount; i++) {
    const len = randInt(rng, minLen, maxLen);
    const ks: string[] = [];
    for (let j = 0; j < len; j++) {
      let k = draw();
      // avoid "ああ" style doubles when there's an alternative
      if (ks.length && k === ks[ks.length - 1] && enabled.length > 1) {
        const swapIdx = gen.deck.findIndex((d) => d !== k);
        if (swapIdx >= 0) {
          const alt = gen.deck.splice(swapIdx, 1)[0];
          gen.deck.unshift(k);
          k = alt;
        }
      }
      ks.push(k);
    }
    let combo = ks.join("");
    // dodge repeats from this round / recent rounds by nudging one char
    let tries = 0;
    while ((taken.has(combo) || recent.has(combo)) && tries < 10 && enabled.length > 1) {
      ks[randInt(rng, 0, ks.length - 1)] = enabled[randInt(rng, 0, enabled.length - 1)];
      combo = ks.join("");
      tries++;
    }
    taken.add(combo);
    combos.push(combo);
  }
  gen.recentCombos = [...gen.recentCombos, ...combos].slice(-300);

  const roundId = `${now.toString(36)}${Math.floor(rng() * 1e6).toString(36)}`;
  const items: Omit<Question, "id">[] = [
    ...picked.map((w) => makeQuestion(w.kana, "word", w, settings, chars)),
    ...combos.map((c) => makeQuestion(c, "random", VOCAB_BY_KANA.get(c), settings, chars)),
  ];
  const ordered = settings.mode === "mixed" ? shuffle(items, rng) : items;

  return {
    ok: true,
    gen,
    round: {
      id: roundId,
      createdAt: now,
      mode: settings.mode,
      questions: ordered.map((q, i) => ({ ...q, id: `${roundId}-${i}` })),
      notice: notices.length ? notices.join(" ") : undefined,
    },
  };
}

function makeQuestion(
  kana: string,
  kind: "word" | "random",
  word: VocabWord | undefined,
  settings: GenerateInput["settings"],
  stats: Record<string, CharStat>,
): Omit<Question, "id"> {
  const chars = splitKana(kana);
  const rating = rateQuestion(chars, kind, settings.timerPace, stats);
  return {
    kind,
    kana,
    romaji: toRomaji(kana),
    chars,
    meaning: word?.meaning,
    wordId: kind === "word" ? word?.id : undefined,
    difficulty: rating.difficulty,
    timeLimitSec: rating.timeLimitSec,
  };
}

// every enabled char once, weak ones twice, shuffled. draining the deck
// guarantees every enabled char appears before any repeats pile up
export function buildDeck(enabled: string[], stats: Record<string, CharStat>, rng: Rng): string[] {
  const deck: string[] = [];
  for (const k of enabled) {
    deck.push(k);
    const s = stats[k];
    if (s?.seen && charWeight(s, k) >= 2.5) deck.push(k);
  }
  return shuffle(deck, rng);
}
