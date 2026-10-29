import { ALL_KANA_LIST, SMALL_TSU, canFollowSokuon, isKnownKana, splitKana, toRomaji, usesOnly } from "@/lib/kana/hiragana";
import type { CharStat, WordStat } from "@/lib/progress/types";
import { LENGTH_BOUNDS, type Settings } from "@/lib/settings/types";
import { HIRAGANA_VOCAB } from "@/lib/vocab/hiragana-words";
import type { VocabWord } from "@/lib/vocab/types";
import { charWeight, focusChars, wordNeedsRetry } from "./adaptive";
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

// only kana we actually teach, in chart order. small っ needs something it can double
export function resolveEnabled(enabled: string[]): string[] {
  const set = new Set(enabled.filter(isKnownKana));
  if (set.has(SMALL_TSU) && ![...set].some(canFollowSokuon)) set.delete(SMALL_TSU);
  return ALL_KANA_LIST.filter((k) => set.has(k));
}

// small っ can't start or end a word and only goes before k/s/t/ch/p sounds.
// fix any bad spots in a random combo by swapping chars around
export function fixSokuon(ks: string[], enabled: string[], rng: Rng): string[] {
  const out = [...ks];
  const plain = enabled.filter((k) => k !== SMALL_TSU);
  const followers = enabled.filter(canFollowSokuon);
  const pick = (list: string[]) => list[randInt(rng, 0, list.length - 1)];
  for (let i = 0; i < out.length; i++) {
    if (out[i] !== SMALL_TSU) continue;
    if (i === 0 || i === out.length - 1 || out[i - 1] === SMALL_TSU || !followers.length) {
      out[i] = pick(plain);
    } else if (!canFollowSokuon(out[i + 1])) {
      out[i + 1] = pick(followers);
    }
  }
  return out;
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

  // chars you just missed or keep missing, pulled forward into this round
  const focus = focusChars(enabled, chars, 8, now);
  const focusSet = new Set(focus);

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
    const retry = (w: VocabWord) => wordNeedsRetry(words[w.id]);
    let fresh = pool.filter((w) => !used.has(w.id) || retry(w));
    if (fresh.length < wordCount) {
      // pool exhausted, start a new cycle but keep the last few out so nothing repeats instantly
      const keepOut = gen.usedWords
        .filter((id) => pool.some((w) => w.id === id))
        .slice(-Math.min(12, Math.floor(pool.length / 3)));
      gen.usedWords = keepOut;
      const keep = new Set(keepOut);
      fresh = pool.filter((w) => !keep.has(w.id) || retry(w));
    }
    const weight = (w: VocabWord) => {
      const ks = splitKana(w.kana);
      const avg = ks.reduce((s, k) => s + charWeight(chars[k], k, now), 0) / ks.length;
      const ws = words[w.id];
      const missBoost = ws ? ((ws.seen - ws.correct) / ws.seen) * 1.5 : 0.4;
      const base = avg + missBoost;
      return ks.some((k) => focusSet.has(k)) ? base * 3 : base; // has a char you just missed
    };
    // words you got wrong last time are guaranteed a spot (up to half the round)
    const retries = shuffle(fresh.filter(retry), rng).slice(0, Math.ceil(wordCount / 2));
    picked.push(...retries);
    const rest = fresh.filter((w) => !retries.includes(w));
    picked.push(...weightedSample(rest, weight, Math.min(wordCount - retries.length, rest.length), rng));
    if (retries.length) picked.splice(0, picked.length, ...shuffle(picked, rng)); // don't always lead with the retry
    gen.usedWords.push(...picked.map((w) => w.id));
    if (gen.usedWords.length > vocab.length) gen.usedWords = gen.usedWords.slice(-vocab.length);
  }

  const randomCount = settings.mode === "words" ? 0 : need - picked.length;
  const combos: string[] = [];
  const taken = new Set<string>(picked.map((w) => w.kana));
  const recent = new Set(gen.recentCombos);

  if (randomCount > 0 && focus.length) {
    // each focus char goes in twice, so only take as many as the round has room for
    const slots = Math.floor((randomCount * (minLen + maxLen)) / 2);
    gen.deck = withFocus(gen.deck, focus.slice(0, Math.max(1, Math.floor(slots / 3))), rng);
  }

  const draw = (): string => {
    if (gen.deck.length === 0) gen.deck = buildDeck(enabled, chars, rng, now);
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
    let fixed = enabled.includes(SMALL_TSU) ? fixSokuon(ks, enabled, rng) : ks;
    let combo = fixed.join("");
    // dodge repeats from this round / recent rounds by nudging one char
    let tries = 0;
    while ((taken.has(combo) || recent.has(combo)) && tries < 10 && enabled.length > 1) {
      fixed[randInt(rng, 0, fixed.length - 1)] = enabled[randInt(rng, 0, enabled.length - 1)];
      if (enabled.includes(SMALL_TSU)) fixed = fixSokuon(fixed, enabled, rng);
      combo = fixed.join("");
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
      focus: focus.length ? focus : undefined,
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

// every enabled char once, weak ones up to 3 times, shuffled. draining the deck
// guarantees every enabled char appears before any repeats pile up
export function buildDeck(enabled: string[], stats: Record<string, CharStat>, rng: Rng, now = Date.now()): string[] {
  const deck: string[] = [];
  for (const k of enabled) {
    deck.push(k);
    const s = stats[k];
    if (!s?.seen) continue;
    const w = charWeight(s, k, now);
    if (w >= 3.5) deck.push(k);
    if (w >= 5.5) deck.push(k);
  }
  return shuffle(deck, rng);
}

// put each focus char near the front of the deck twice: once early, once a bit later.
// one existing copy of it is pulled out so it doesn't pile up
export function withFocus(deck: string[], focus: string[], rng: Rng): string[] {
  const rest = [...deck];
  for (const k of focus) {
    const i = rest.indexOf(k);
    if (i >= 0) rest.splice(i, 1);
  }
  const early = shuffle(focus, rng);
  const late = shuffle(focus, rng);
  const out: string[] = [];
  // focus, filler, focus, filler... then the second copies, all early enough to land this round
  for (const k of early) out.push(k, ...rest.splice(0, 1));
  out.push(...late);
  return [...out, ...rest];
}

export interface RetryInput {
  missed: string[];
  settings: GenerateInput["settings"];
  chars: Record<string, CharStat>;
  avoid: Set<string>; // kana already in this round
  vocab?: VocabWord[];
  rng?: Rng;
}

// a fresh question built around kana you just missed, for later in the same round.
// a real word when one fits, otherwise a short combo with the missed kana in it
export function makeRetryQuestion(input: RetryInput): Omit<Question, "id"> | null {
  const { settings, chars, avoid } = input;
  const rng = input.rng ?? Math.random;
  const vocab = input.vocab ?? HIRAGANA_VOCAB;
  const enabled = resolveEnabled(settings.enabledChars);
  const missed = [...new Set(input.missed)].filter((k) => enabled.includes(k));
  if (!missed.length) return null;
  const [minLen, maxLen] = LENGTH_BOUNDS[settings.lengthRange];

  if (settings.mode !== "random") {
    const pool = wordsForChars(enabled, vocab).filter((w) => !avoid.has(w.kana) && splitKana(w.kana).some((k) => missed.includes(k)));
    const fit = pool.filter((w) => {
      const n = splitKana(w.kana).length;
      return n >= minLen && n <= maxLen;
    });
    const list = fit.length ? fit : pool;
    if (list.length) {
      const w = list[randInt(rng, 0, list.length - 1)];
      return { ...makeQuestion(w.kana, "word", w, settings, chars), retry: true };
    }
    if (settings.mode === "words") return null;
  }

  const plain = enabled.filter((k) => k !== SMALL_TSU);
  if (!plain.length) return null;
  const len = Math.max(minLen, Math.min(maxLen, missed.length + 1));
  for (let tries = 0; tries < 8; tries++) {
    const ks = missed.slice(0, len);
    while (ks.length < len) ks.push(plain[randInt(rng, 0, plain.length - 1)]);
    let combo = shuffle(ks, rng);
    if (combo.includes(SMALL_TSU)) combo = fixSokuon(combo, enabled, rng);
    const kana = combo.join("");
    if (avoid.has(kana) && tries < 7) continue;
    return { ...makeQuestion(kana, "random", VOCAB_BY_KANA.get(kana), settings, chars), retry: true };
  }
  return null;
}
