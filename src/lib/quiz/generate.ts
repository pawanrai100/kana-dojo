import {
  ALL_KANA_LIST,
  LONG_MARK,
  SMALL_TSU,
  SMALL_TSU_K,
  canFollowSokuon,
  isKnownKana,
  isSmallTsu,
  longVowelOf,
  scriptOf,
  splitKana,
  toHiragana,
  toKatakana,
  toRomaji,
  usesOnly,
} from "@/lib/kana/hiragana";
import type { CharStat, WordStat } from "@/lib/progress/types";
import { LENGTH_BOUNDS, activeChars, type Settings } from "@/lib/settings/types";
import { ALL_VOCAB } from "@/lib/vocab/all";
import { SENTENCES, type Sentence } from "@/lib/vocab/sentences";
import type { VocabWord } from "@/lib/vocab/types";
import { EMPTY_COACH, charWeight, focusChars, wordNeedsRetry, type CoachContext } from "./adaptive";
import { skillsOf } from "@/lib/coach/analyze";
import { randInt, shuffle, weightedSample, type Rng } from "./random";
import { rateQuestion } from "./timer";
import type { GeneratorState, Question, Round } from "./types";

export interface GenerateInput {
  // no script = use enabledChars exactly as given (drills, tower floors)
  settings: Pick<Settings, "mode" | "questionsPerRound" | "lengthRange" | "enabledChars" | "timerPace"> & { script?: Settings["script"] };
  chars: Record<string, CharStat>;
  words: Record<string, WordStat>;
  gen: GeneratorState;
  vocab?: VocabWord[];
  rng?: Rng;
  now?: number;
  coach?: CoachContext;
}

export type GenerateResult =
  | { ok: true; round: Round; gen: GeneratorState }
  | { ok: false; reason: "no-chars" | "no-words" | "no-sentences"; message: string };

const VOCAB_BY_KANA = new Map(ALL_VOCAB.map((w) => [w.kana, w]));

const isMark = (k: string) => isSmallTsu(k) || k === LONG_MARK;
const sameScript = (list: string[], k: string) => {
  const own = list.filter((x) => scriptOf(x) === scriptOf(k));
  return own.length ? own : list;
};

// only kana we actually teach, in chart order. small っ needs something it can double,
// and ー needs a katakana to stretch
export function resolveEnabled(enabled: string[]): string[] {
  const set = new Set(enabled.filter(isKnownKana));
  for (const t of [SMALL_TSU, SMALL_TSU_K])
    if (set.has(t) && ![...set].some((k) => canFollowSokuon(k) && scriptOf(k) === scriptOf(t))) set.delete(t);
  if (set.has(LONG_MARK) && ![...set].some((k) => scriptOf(k) === "katakana" && longVowelOf(k))) set.delete(LONG_MARK);
  return ALL_KANA_LIST.filter((k) => set.has(k));
}

// small っ can't start or end a word and only goes before k/s/t/ch/p sounds.
// ー has to follow a katakana with a vowel. fix any bad spots by swapping chars around
export function fixSokuon(ks: string[], enabled: string[], rng: Rng): string[] {
  const out = [...ks];
  const plain = enabled.filter((k) => !isMark(k));
  const pick = (list: string[]) => list[randInt(rng, 0, list.length - 1)];
  for (let i = 0; i < out.length; i++) {
    const k = out[i];
    if (isSmallTsu(k)) {
      const followers = enabled.filter((x) => canFollowSokuon(x) && scriptOf(x) === scriptOf(k));
      if (i === 0 || i === out.length - 1 || isMark(out[i - 1]) || !followers.length) out[i] = pick(sameScript(plain, k));
      else if (!canFollowSokuon(out[i + 1]) || scriptOf(out[i + 1]) !== scriptOf(k)) out[i + 1] = pick(followers);
    } else if (k === LONG_MARK) {
      const prev = out[i - 1];
      if (i === 0 || isMark(prev) || scriptOf(prev) !== "katakana" || !longVowelOf(prev)) out[i] = pick(sameScript(plain, k));
    }
  }
  return out;
}

export function wordsForChars(enabled: string[], vocab = ALL_VOCAB): VocabWord[] {
  const allowed = new Set(resolveEnabled(enabled));
  return vocab.filter((w) => usesOnly(w.kana, allowed));
}

export function generateRound(input: GenerateInput): GenerateResult {
  const rng = input.rng ?? Math.random;
  const now = input.now ?? Date.now();
  const { settings, chars, words } = input;
  const coach = input.coach ?? EMPTY_COACH;
  const vocab = input.vocab ?? ALL_VOCAB;
  const enabled = resolveEnabled(activeChars(settings));
  const need = settings.questionsPerRound;
  const [minLen, maxLen] = LENGTH_BOUNDS[settings.lengthRange];

  if (enabled.length === 0) {
    return { ok: false, reason: "no-chars", message: "Pick at least one character to practice." };
  }

  if (settings.mode === "sentences") return sentenceRound(input, enabled, rng, now);

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
  const focus = focusChars(enabled, chars, 8, now, coach);
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
      const avg = ks.reduce((s, k) => s + charWeight(chars[k], k, now, coach), 0) / ks.length;
      const ws = words[w.id];
      const missBoost = ws ? ((ws.seen - ws.correct) / ws.seen) * 1.5 : 0.4;
      let base = avg + missBoost;
      // words that practise a habit you're slipping on (long vowels, small っ...)
      if (coach.weakSkills.size && ks.some((_, i) => skillsOf(ks, i).some((sk) => coach.weakSkills.has(sk)))) base *= 1.8;
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
    if (gen.deck.length === 0) gen.deck = buildDeck(enabled, chars, rng, now, coach);
    return gen.deck.shift()!;
  };

  const mixed = new Set(enabled.map(scriptOf)).size > 1;
  // with both scripts on, each combo sticks to one: swap a kana for its twin, or draw again
  const inScript = (k: string, sc: string | undefined): string | undefined => {
    if (!mixed || !sc || scriptOf(k) === sc) return k;
    const twin = sc === "katakana" ? toKatakana(k) : toHiragana(k);
    return twin !== k && enabled.includes(twin) ? twin : undefined;
  };
  for (let i = 0; i < randomCount; i++) {
    const len = randInt(rng, minLen, maxLen);
    const ks: string[] = [];
    // both scripts on: each card flips a coin, so neither script drowns out the other
    let sc: string | undefined = mixed ? (rng() < 0.5 ? "hiragana" : "katakana") : undefined;
    for (let j = 0; j < len; j++) {
      let k = draw();
      for (let t = 0; t < 12 && !inScript(k, sc); t++) {
        gen.deck.push(k);
        k = draw();
      }
      k = inScript(k, sc) ?? k;
      sc ??= scriptOf(k);
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
    // the doubles dodge above can still pull in the other script, so clean up
    if (mixed) {
      const own = enabled.filter((x) => scriptOf(x) === sc && !isMark(x));
      for (let j = 0; j < ks.length; j++) ks[j] = inScript(ks[j], sc) ?? own[randInt(rng, 0, own.length - 1)];
    }
    let fixed = enabled.some(isMark) ? fixSokuon(ks, enabled, rng) : ks;
    let combo = fixed.join("");
    // dodge repeats from this round / recent rounds by nudging one char
    let tries = 0;
    while ((taken.has(combo) || recent.has(combo)) && tries < 10 && enabled.length > 1) {
      const at = randInt(rng, 0, fixed.length - 1);
      fixed[at] = sameScript(enabled, fixed[0])[randInt(rng, 0, sameScript(enabled, fixed[0]).length - 1)];
      if (enabled.some(isMark)) fixed = fixSokuon(fixed, enabled, rng);
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
export function buildDeck(enabled: string[], stats: Record<string, CharStat>, rng: Rng, now = Date.now(), coach: CoachContext = EMPTY_COACH): string[] {
  const deck: string[] = [];
  for (const k of enabled) {
    deck.push(k);
    const s = stats[k];
    if (!s?.seen) continue;
    const w = charWeight(s, k, now, coach);
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
  const vocab = input.vocab ?? ALL_VOCAB;
  const enabled = resolveEnabled(activeChars(settings));
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

  // stick to the script of what you missed
  const sc = scriptOf(missed[0]);
  const own = missed.filter((k) => scriptOf(k) === sc);
  const plain = enabled.filter((k) => !isMark(k) && scriptOf(k) === sc);
  if (!plain.length) return null;
  const len = Math.max(minLen, Math.min(maxLen, own.length + 1));
  for (let tries = 0; tries < 8; tries++) {
    const ks = own.slice(0, len);
    while (ks.length < len) ks.push(plain[randInt(rng, 0, plain.length - 1)]);
    let combo = shuffle(ks, rng);
    if (combo.some(isMark)) combo = fixSokuon(combo, enabled, rng);
    const kana = combo.join("");
    if (avoid.has(kana) && tries < 7) continue;
    return { ...makeQuestion(kana, "random", VOCAB_BY_KANA.get(kana), settings, chars), retry: true };
  }
  return null;
}

// reading mode: whole sentences you can read with the kana you have switched on
function sentenceRound(input: GenerateInput, enabled: string[], rng: Rng, now: number): GenerateResult {
  const { settings, chars } = input;
  const coach = input.coach ?? EMPTY_COACH;
  // sentences always need hiragana for the grammar bits, so katakana mode reads
  // sentences with katakana words in them, using your hiragana selection for the rest
  const katakanaOnly = settings.script === "katakana";
  const allowed = new Set(katakanaOnly ? resolveEnabled(settings.enabledChars) : enabled);
  const pool = SENTENCES.filter((s) => usesOnly(s.kana, allowed) && (!katakanaOnly || splitKana(s.kana).some((k) => scriptOf(k) === "katakana")));
  if (!pool.length) {
    return {
      ok: false,
      reason: "no-sentences",
      message: "No sentences fit the kana you have switched on yet. Turn on the basic 46 (and dakuten for lots more) on the chart.",
    };
  }
  const gen: GeneratorState = { deck: input.gen.deck, usedWords: [...input.gen.usedWords], recentCombos: [...input.gen.recentCombos] };
  const used = new Set(gen.usedWords);
  let fresh = pool.filter((s) => !used.has(s.id));
  if (fresh.length < Math.min(settings.questionsPerRound, pool.length)) {
    // seen them all lately, start over (but not with the last few)
    gen.usedWords = gen.usedWords.filter((id) => !id.startsWith("s:"));
    const recent = new Set([...used].filter((id) => id.startsWith("s:")).slice(-3));
    fresh = pool.filter((s) => !recent.has(s.id));
  }
  const focus = new Set(focusChars(enabled, chars, 8, now, coach));
  const weight = (s: Sentence) => {
    const ks = splitKana(s.kana);
    let w = ks.reduce((n, k) => n + charWeight(chars[k], k, now, coach), 0) / ks.length;
    if (ks.some((k) => focus.has(k))) w *= 2;
    if (coach.weakSkills.has("particles") && s.tokens.some((t) => t.particle && ["は", "を", "へ"].includes(t.kana))) w *= 1.8;
    return w;
  };
  const need = Math.min(settings.questionsPerRound, fresh.length);
  const picked = weightedSample(fresh, weight, need, rng);
  gen.usedWords.push(...picked.map((s) => s.id));
  gen.usedWords = gen.usedWords.slice(-600);

  const roundId = `${now.toString(36)}${Math.floor(rng() * 1e6).toString(36)}`;
  const notice =
    pool.length < settings.questionsPerRound
      ? `Only ${pool.length} sentence${pool.length === 1 ? "" : "s"} fit your kana so far. Turn on dakuten and combos on the chart to unlock a lot more.`
      : undefined;
  return {
    ok: true,
    gen,
    round: {
      id: roundId,
      createdAt: now,
      mode: "sentences",
      notice,
      questions: picked.map((s, i) => {
        const units = splitKana(s.kana);
        const rating = rateQuestion(units, "sentence", settings.timerPace, chars);
        return {
          id: `${roundId}-${i}`,
          kind: "sentence" as const,
          kana: s.kana,
          romaji: s.romaji,
          chars: units,
          meaning: s.meaning,
          tokens: s.tokens,
          difficulty: rating.difficulty,
          timeLimitSec: rating.timeLimitSec,
        };
      }),
    },
  };
}
