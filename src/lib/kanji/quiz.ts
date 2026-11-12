import { isKnownKana, splitKana, toHiragana } from "@/lib/kana/hiragana";
import { checkAnswer } from "@/lib/quiz/validate";
import { shuffle, weightedSample, type Rng } from "@/lib/quiz/random";
import type { CharStat, WordStat } from "@/lib/progress/types";
import { isMastered } from "@/lib/progress/stats";
import { KANJI, getKanji, kanjiTwins, sayIt, wordsFor, type KanjiWord } from "./data";

export type KanjiKind = "meaning" | "reading" | "pick";
export type KanjiMode = "mixed" | KanjiKind;

export interface KanjiQuestion {
  id: string;
  kind: KanjiKind;
  kanji: string; // the kanji this card is about
  word?: KanjiWord; // reading cards
  options?: string[]; // pick cards: kanji to choose from
}

export interface KanjiResult {
  q: KanjiQuestion;
  correct: boolean;
  typed: string;
  ms: number;
}

export interface KanjiStats {
  kanji: Record<string, CharStat>;
  kanjiRead: Record<string, CharStat>;
  kanjiWords: Record<string, WordStat>;
}

// ---- answer checking ----

const NUMBERS: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 百: 100, 千: 1000, 万: 10000 };

const STOP = new Set(["to", "a", "an", "the", "be"]);

export function normMeaning(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .join(" ")
    .replace(/'/g, "");
}

const plural = (w: string) => w.replace(/(ies)$/, "y").replace(/(?<=[^s])s$/, "");

function close(a: string, b: string, fuzzy: boolean): boolean {
  if (a === b || plural(a) === plural(b)) return true;
  // one typo is fine on longer words (moutain, frend)
  if (!fuzzy || Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length] <= 1;
}

// does what you typed match one of this kanji's meanings? "sun", "the sun", "Day" all count
// fuzzy = allow one typo. off when checking against other kanji, so "right" isn't "eight"
export function meaningMatches(k: string, input: string, fuzzy = true): boolean {
  const kj = getKanji(k);
  const typed = normMeaning(input);
  if (!kj || !typed) return false;
  const digits = input.replace(/[,\s]/g, "");
  if (/^\d+$/.test(digits)) return NUMBERS[k] === Number(digits);
  // "sun, day" or "sun / day": any piece can be right (but not a whole list)
  const pieces = input.split(/[,/;]| or /).map(normMeaning).filter(Boolean).slice(0, 3);
  return kj.meanings.some((m) => {
    const want = normMeaning(m);
    return pieces.some((p) => close(p, want, fuzzy));
  });
}

export interface MeaningCheck {
  correct: boolean;
  // answered in the other language (a reading on a meaning card, or the reverse)
  via?: "japanese" | "english";
  // you typed another kanji's meaning, so show that one next to it
  mixedWith?: string;
}

export function checkMeaning(k: string, input: string): MeaningCheck {
  if (meaningMatches(k, input, false)) return { correct: true };
  if (readingMatches(k, input)) return { correct: true, via: "japanese" };
  const twins = kanjiTwins(k).map((t) => t.other);
  const other = [...twins, ...KANJI.map((x) => x.k)].find((o) => o !== k && meaningMatches(o, input, false));
  // spot on for another kanji beats one typo away from this one
  if (other) return { correct: false, mixedWith: other };
  return { correct: meaningMatches(k, input) };
}

// does this kana (or romaji) say that reading? ガッコウ, がっこう and gakkou all count
function saysKana(reading: string, input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || !reading) return false;
  const units = splitKana(trimmed.replace(/\s/g, ""));
  if (units.length && units.every(isKnownKana)) return toHiragana(units.join("")) === reading;
  if (!/^[a-zA-Z' -]+$/.test(trimmed)) return false;
  return checkAnswer(reading, trimmed).correct;
}

// every way you could say a kanji on its own: on, kun, kun with its kana tail
export function readingsOf(k: string): string[] {
  const kj = getKanji(k);
  if (!kj) return [];
  const out = new Set<string>();
  for (const r of kj.on) out.add(toHiragana(r));
  for (const r of kj.kun) {
    out.add(r.replace(".", ""));
    out.add(r.split(".")[0]);
  }
  const say = sayIt(k);
  if (say) out.add(say.reading);
  return [...out].filter(Boolean);
}

export function readingMatches(k: string, input: string): boolean {
  return readingsOf(k).some((r) => saysKana(r, input));
}

// romaji or kana both work for readings
export function checkReading(word: KanjiWord, input: string): boolean {
  return saysKana(word.reading, input);
}

// a word card takes the reading, or what it means in english
export function wordMeaningMatches(word: KanjiWord, input: string): boolean {
  const typed = normMeaning(input);
  if (!typed || /^[\u3040-\u30ff]+$/.test(input.trim())) return false;
  const wants = word.meaning
    .split(/[,;/]/)
    .map(normMeaning)
    .filter(Boolean);
  return wants.some((w) => close(typed, w, true));
}

export function checkWord(word: KanjiWord, input: string): MeaningCheck {
  if (checkReading(word, input)) return { correct: true };
  if (wordMeaningMatches(word, input)) return { correct: true, via: "english" };
  return { correct: false };
}

// ---- building a round ----

function weight(s: CharStat | undefined, now: number): number {
  if (!s || s.seen === 0) return 3;
  const misses = s.recent.filter((x) => !x).length;
  const days = (now - s.lastSeen) / 86_400_000;
  if (isMastered(s)) return 0.4 + Math.min(days / 7, 1.2);
  return 1.5 + misses + Math.min(days, 2);
}

function wordWeight(s: WordStat | undefined): number {
  if (!s) return 2;
  if (!s.lastCorrect) return 4;
  return s.roundsCorrect >= 2 ? 0.5 : 1.5;
}

// four kanji to choose from: lookalikes first so it's a real test
export function pickOptions(k: string, pool: string[], rng: Rng): string[] {
  const twins = kanjiTwins(k).map((t) => t.other);
  const main = getKanji(k)?.meanings[0] ?? "";
  const sameLesson = KANJI.filter((x) => x.lesson === getKanji(k)?.lesson).map((x) => x.k);
  const others: string[] = [];
  for (const c of [...shuffle(twins, rng), ...shuffle(pool, rng), ...shuffle(sameLesson, rng), ...shuffle(KANJI.map((x) => x.k), rng)]) {
    // skip kanji that also mean the thing we're asking for (場 and 所 are both "place")
    if (c !== k && !others.includes(c) && !meaningMatches(c, main, false)) others.push(c);
    if (others.length === 3) break;
  }
  return shuffle([k, ...others], rng);
}

export interface BuildInput {
  pool: string[]; // kanji you picked
  stats: KanjiStats;
  mode: KanjiMode;
  size: number;
  rng: Rng;
  now?: number;
  studied?: boolean; // you just went through these on study cards
}

// a kanji you've never seen starts with a pick card, so the first meet is gentle
export function buildKanjiRound({ pool, stats, mode, size, rng, now = Date.now(), studied }: BuildInput): KanjiQuestion[] {
  const list = pool.filter((k) => getKanji(k));
  if (!list.length) return [];
  const words = wordsFor(list);
  const chosen: string[] = [];
  while (chosen.length < size) {
    const batch = weightedSample(list, (k) => weight(stats.kanji[k], now) + 0.5 * weight(stats.kanjiRead[k], now), Math.min(size - chosen.length, list.length), rng);
    // no same kanji twice in a row
    for (const k of batch) if (chosen.at(-1) !== k) chosen.push(k);
    if (list.length === 1 && chosen.length < size) chosen.push(list[0]);
  }
  const out: KanjiQuestion[] = [];
  const usedWords = new Set<string>();
  chosen.slice(0, size).forEach((k, i) => {
    const fresh = !stats.kanji[k]?.seen;
    let kind: KanjiKind = mode === "mixed" ? (["pick", "meaning", "reading"] as const)[Math.floor(rng() * 3)] : mode;
    // brand new kanji start with a pick card. if you just studied them, pick or type the meaning
    if (mode === "mixed" && fresh) kind = studied && rng() < 0.5 ? "meaning" : "pick";
    const id = `${i}-${k}-${kind}`;
    if (kind === "reading") {
      const mine = words.filter((w) => w.kanji.includes(k) && !usedWords.has(w.id));
      const w = mine.length ? weightedSample(mine, (x) => wordWeight(stats.kanjiWords[x.id]), 1, rng)[0] : undefined;
      if (w) {
        usedWords.add(w.id);
        out.push({ id, kind, kanji: k, word: w });
        return;
      }
      kind = "meaning";
    }
    if (kind === "pick") out.push({ id: `${i}-${k}-pick`, kind, kanji: k, options: pickOptions(k, list, rng) });
    else out.push({ id: `${i}-${k}-meaning`, kind: "meaning", kanji: k });
  });
  return out;
}

// what to say on the card
export function promptOf(q: KanjiQuestion): string {
  if (q.kind === "meaning") return "What is this kanji? Type the meaning or how to say it.";
  if (q.kind === "reading") return "What's this word? Type how to say it or what it means.";
  return `Which kanji means "${getKanji(q.kanji)?.meanings[0]}"?`;
}

export function answerOf(q: KanjiQuestion): string {
  const kj = getKanji(q.kanji);
  if (q.kind === "reading" && q.word) return `${q.word.reading} (${q.word.romaji})`;
  return q.kind === "pick" ? q.kanji : (kj?.meanings.join(", ") ?? "");
}
