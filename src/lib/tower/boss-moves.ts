import { LONG_MARK, LOOKALIKES, SMALL_TSU, SMALL_TSU_K, canFollowSokuon, groupOf, isSmallTsu, readingOf, splitKana, toRomaji } from "@/lib/kana/hiragana";
import type { CharStat } from "@/lib/progress/types";
import type { CoachContext } from "@/lib/quiz/adaptive";
import { EMPTY_COACH, focusChars } from "@/lib/quiz/adaptive";
import { fixSokuon } from "@/lib/quiz/generate";
import { randInt, shuffle, type Rng } from "@/lib/quiz/random";
import { rateQuestion } from "@/lib/quiz/timer";
import type { Question } from "@/lib/quiz/types";
import { LENGTH_BOUNDS } from "@/lib/settings/types";
import type { Floor } from "./floors";

// boss attacks. made-up kana strings built to trip you up in one specific way.
// no meaning to lean on, so you actually have to read every kana

export type MoveId = "twin" | "marks" | "combo" | "tsu" | "weak" | "blitz" | "long";

export const MOVES: Record<MoveId, { name: string; hint: string }> = {
  twin: { name: "Twin Trap", hint: "Lookalikes everywhere. Check every loop and tail." },
  marks: { name: "Mark Storm", hint: "゛ or ゜? Check every corner." },
  combo: { name: "Combo Chain", hint: "Small ゃ ゅ ょ melt into one sound." },
  tsu: { name: "Double Trouble", hint: "Small っ doubles the next sound." },
  weak: { name: "Weak Spot", hint: "It's aiming at the kana you keep missing." },
  blitz: { name: "Blitz", hint: "Short and fast. Don't blink." },
  long: { name: "Long Haul", hint: "A big one. Read it sound by sound." },
};

// each boss leans on its favourite moves
const STYLE: Record<string, MoveId[]> = {
  saru: ["blitz", "weak"],
  orochi: ["long", "twin"],
  kitsune: ["twin"],
  tako: ["blitz", "long"],
  kozo: ["weak", "twin"],
  ryu: ["long", "twin", "weak", "blitz"],
  shikappa: ["marks", "blitz"],
  alekoni: ["marks"],
  stellatsune: ["combo", "twin"],
  minjimata: ["combo", "weak"],
  ayutengu: ["combo", "long"],
  pramirei: ["tsu"],
  basarihyon: ["combo", "marks", "tsu", "weak"],
  k1: ["blitz"],
  k2: ["blitz", "long"],
  k3: ["twin", "weak"],
  k4: ["twin", "long"],
  k5: ["marks", "tsu"],
  k6: ["combo", "blitz"],
  k7: ["twin", "combo", "marks", "tsu", "long"],
};

export interface MoveInput {
  floor: Floor;
  rage: boolean; // half health or less: longer and faster
  stats: Record<string, CharStat>;
  coach: CoachContext;
  rng: Rng;
}

const pick = <T,>(xs: T[], rng: Rng): T => xs[randInt(rng, 0, xs.length - 1)];

function pools(floor: Floor, stats: Record<string, CharStat>, coach: CoachContext) {
  const learned = floor.chars;
  const set = new Set(learned);
  const plain = learned.filter((k) => !isSmallTsu(k) && k !== LONG_MARK);
  // じ/ぢ and ず/づ sound the same, so they're no trap
  const twins = LOOKALIKES.map((g) => g.filter((k) => set.has(k))).filter((g) => new Set(g.map(readingOf)).size >= 2);
  // dakuten next to their plain kana in unicode: か+1 = が, は+2 = ぱ
  const marks: [string, string][] = [];
  for (const d of learned.filter((k) => k.length === 1 && groupOf(k)?.kind === "dakuten")) {
    const b = [1, 2].map((n) => String.fromCharCode(d.charCodeAt(0) - n)).find((x) => set.has(x) && groupOf(x)?.kind === "basic");
    if (b) marks.push([b, d]);
  }
  const combos = learned.filter((k) => groupOf(k)?.kind === "combos" || groupOf(k)?.kind === "extended");
  const followers = learned.filter(canFollowSokuon);
  const weak = focusChars(plain, stats, 8, Date.now(), coach);
  return { learned, plain, twins, marks, combos, followers, tsu: set.has(SMALL_TSU_K) ? SMALL_TSU_K : SMALL_TSU, hasTsu: (set.has(SMALL_TSU) || set.has(SMALL_TSU_K)) && followers.length > 0, weak };
}

export function availableMoves(floor: Floor, stats: Record<string, CharStat> = {}, coach: CoachContext = EMPTY_COACH): MoveId[] {
  const p = pools(floor, stats, coach);
  const out: MoveId[] = ["blitz", "long"];
  if (p.twins.length) out.push("twin");
  if (p.marks.length) out.push("marks");
  if (p.combos.length) out.push("combo");
  if (p.hasTsu) out.push("tsu");
  if (p.weak.length >= 2) out.push("weak");
  return out;
}

// what the boss is known for, shown before the fight
export function signatureMoves(floor: Floor): MoveId[] {
  if (!floor.boss) return [];
  const can = availableMoves(floor);
  return (STYLE[floor.boss.id] ?? []).filter((m) => can.includes(m) || m === "weak");
}

// pick a move: the boss's favourites three times as often
function chooseMove(id: string, can: MoveId[], rng: Rng): MoveId {
  const fav = (STYLE[id] ?? []).filter((m) => can.includes(m));
  const bag = [...can, ...fav, ...fav, ...fav];
  return pick(bag, rng);
}

function build(move: MoveId, len: number, p: ReturnType<typeof pools>, rng: Rng): string[] {
  const filler = () => pick(p.plain, rng);
  const ks: string[] = [];
  switch (move) {
    case "twin": {
      const g = pick(p.twins, rng);
      for (let i = 0; i < len; i++) ks.push(rng() < 0.8 ? pick(g, rng) : filler());
      // make sure at least two different twins show up
      if (new Set(ks.filter((k) => g.includes(k))).size < 2) ks.splice(0, 2, g[0], g[1]);
      return shuffle(ks, rng);
    }
    case "marks": {
      while (ks.length < len) {
        const [b, d] = pick(p.marks, rng);
        ks.push(...(rng() < 0.5 ? [b, d] : [d, b]));
      }
      return ks.slice(0, Math.max(len, 2));
    }
    case "combo": {
      const n = Math.max(1, Math.ceil(len * 0.6));
      for (let i = 0; i < n; i++) ks.push(pick(p.combos, rng));
      while (ks.length < len) ks.push(filler());
      return shuffle(ks, rng);
    }
    case "tsu": {
      while (ks.length < len) ks.push(filler(), p.tsu, pick(p.followers, rng));
      return ks.slice(0, Math.max(3, len - (len % 3 === 1 ? 1 : 0)));
    }
    case "weak": {
      for (let i = 0; i < len; i++) ks.push(rng() < 0.75 ? pick(p.weak, rng) : filler());
      return ks;
    }
    default:
      for (let i = 0; i < len; i++) ks.push(filler());
      return ks;
  }
}

export function bossMove(input: MoveInput, forced?: MoveId): Omit<Question, "id"> | null {
  const { floor, rage, stats, coach, rng } = input;
  const p = pools(floor, stats, coach);
  if (!p.plain.length || !floor.boss) return null;
  const can = availableMoves(floor, stats, coach);
  const move = forced && can.includes(forced) ? forced : chooseMove(floor.boss.id, can, rng);
  const [lo, hi] = floor.mode === "sentences" ? [3, 5] : LENGTH_BOUNDS[floor.lengthRange];
  const bump = rage ? 1 : 0;
  const len =
    move === "blitz" ? randInt(rng, 2, 3) : move === "long" ? Math.min(8, hi + 1 + bump) : Math.min(7, randInt(rng, Math.max(3, lo), hi) + bump);

  let ks = build(move, len, p, rng);
  ks = fixSokuon(ks, p.learned, rng);
  // ん and small っ can't open a word
  if (ks[0] === "ん" || ks[0] === "ン" || isSmallTsu(ks[0]) || ks[0] === LONG_MARK) ks[0] = pick(p.plain.filter((k) => k !== "ん"), rng) ?? ks[0];
  const kana = ks.join("");
  const chars = splitKana(kana);
  const rating = rateQuestion(chars, "random", floor.pace, stats);
  const speed = (move === "blitz" ? 0.7 : 1) * (rage ? 0.85 : 1);
  const time = rating.timeLimitSec ? Math.max(3, Math.round(rating.timeLimitSec * speed * 2) / 2) : null;
  return { kind: "random", kana, romaji: toRomaji(kana), chars, difficulty: rage ? "hard" : rating.difficulty, timeLimitSec: time, challenge: move };
}

// turn a normal batch into a boss batch: most cards become moves, a few real
// words (or sentences, for the yokai lord) stay in so it isn't pure noise
export function bossBatch(base: Question[], input: MoveInput, tag: string): Question[] {
  const keepEvery = input.floor.mode === "sentences" ? 2 : 4; // sentences: every other card; words: 1 in 4
  return base.map((q, i) => {
    if (i % keepEvery === keepEvery - 1) return q;
    const m = bossMove(input);
    return m ? { ...m, id: `${tag}-${i}` } : q;
  });
}
