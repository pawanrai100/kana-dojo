import { KANA_GROUPS, getRow } from "@/lib/kana/hiragana";
import { skillMissRate } from "@/lib/quiz/adaptive";
import { isCleared } from "@/lib/tower/progress";
import { FLOORS, TOP_FLOOR, floorsOf } from "@/lib/tower/floors";
import { KANJI, KANJI_WORDS } from "@/lib/kanji/data";
import { knownKanji, learnedKanjiWords } from "@/lib/kanji/progress";
import { isMastered } from "./stats";
import type { Progress } from "./types";

// dojo belts, earned by what you can actually read, not by how long you've played.
// once earned a belt is yours; if mastery slips you get a "needs review" stripe

export interface BeltStep {
  have: number;
  need: number;
  label: string; // "Master 12 more basic kana"
}

export interface Belt {
  id: string;
  name: string;
  color: string;
  ink: string; // text on the belt colour
  stripes?: number; // dan ranks
  goal: string; // what earns it, shown on the ladder
  step: (p: Progress) => BeltStep;
}

const group = (id: string) => KANA_GROUPS.find((g) => g.id === id)!.chars;
const BASIC = group("basic");
const DAKUTEN = group("dakuten");
const COMBOS_AND_TSU = [...group("combos"), ...group("sokuon")];
const STARTER = [...getRow("vowel")!.chars, ...getRow("k")!.chars];
const ALL = KANA_GROUPS.flatMap((g) => g.chars);

const mastered = (p: Progress, pool: string[]) => pool.filter((k) => isMastered(p.chars[k])).length;

function masterStep(p: Progress, pool: string[], need: number, what: string): BeltStep {
  const have = Math.min(mastered(p, pool), need);
  const left = need - have;
  return { have, need, label: left ? `Master ${left} more ${what}` : "Done" };
}

function particleStep(p: Progress): BeltStep {
  const sk = p.skills.particles;
  const acc = sk && sk.recent.length >= 10 ? 1 - skillMissRate(sk.recent) : 0;
  const have = Math.min(9, Math.floor(acc * 10));
  return { have, need: 9, label: have >= 9 ? "Done" : `Read particles right 90% of the time in Sentences (now ${Math.round(acc * 100)}%)` };
}

const both = (a: BeltStep, b: BeltStep): BeltStep => ({
  have: a.have + b.have,
  need: a.need + b.need,
  label: a.have < a.need ? a.label : b.label,
});

export const BELTS: Belt[] = [
  { id: "white", name: "White belt", color: "#f4f2ea", ink: "#1a1d3a", goal: "Start here.", step: () => ({ have: 1, need: 1, label: "Done" }) },
  {
    id: "yellow",
    name: "Yellow belt",
    color: "#ffd23f",
    ink: "#3d2c00",
    goal: "Master the vowels and the K-row.",
    step: (p) => masterStep(p, STARTER, STARTER.length, "vowel and K-row kana"),
  },
  { id: "orange", name: "Orange belt", color: "#ff8c2b", ink: "#3d1a00", goal: "Master 20 basic kana.", step: (p) => masterStep(p, BASIC, 20, "basic kana") },
  { id: "green", name: "Green belt", color: "#2fb36d", ink: "#ffffff", goal: "Master 35 basic kana.", step: (p) => masterStep(p, BASIC, 35, "basic kana") },
  { id: "blue", name: "Blue belt", color: "#2d6be6", ink: "#ffffff", goal: "Master all 46 basic kana.", step: (p) => masterStep(p, BASIC, 46, "basic kana") },
  {
    id: "purple",
    name: "Purple belt",
    color: "#8b4ad8",
    ink: "#ffffff",
    goal: "Master all 25 dakuten (が, ざ, だ, ば, ぱ).",
    step: (p) => masterStep(p, DAKUTEN, DAKUTEN.length, "dakuten kana"),
  },
  {
    id: "brown",
    name: "Brown belt",
    color: "#8a5a3b",
    ink: "#ffffff",
    goal: "Master all the combos (きゃ...) and small っ.",
    step: (p) => masterStep(p, COMBOS_AND_TSU, COMBOS_AND_TSU.length, "combos or small っ"),
  },
  {
    id: "black",
    name: "Black belt",
    color: "#1c1c24",
    ink: "#ffffff",
    goal: "Every kana mastered, and particles right 90% of the time in Sentences.",
    step: (p) => both(masterStep(p, ALL, ALL.length, "kana"), particleStep(p)),
  },
  {
    id: "dan1",
    name: "Black belt, 1st dan",
    color: "#1c1c24",
    ink: "#ffd23f",
    stripes: 1,
    goal: "Beat Pawaryū the Dragon at the top of the Tower.",
    step: (p) => ({ have: isCleared(p.tower, TOP_FLOOR) ? 1 : 0, need: 1, label: isCleared(p.tower, TOP_FLOOR) ? "Done" : "Beat the Dragon on floor 21" }),
  },
  {
    id: "dan2",
    name: "Black belt, 2nd dan",
    color: "#1c1c24",
    ink: "#ffd23f",
    stripes: 2,
    goal: "Practise 14 days in a row.",
    step: (p) => ({ have: Math.min(p.bestStreak, 14), need: 14, label: p.bestStreak >= 14 ? "Done" : `Practise ${14 - p.bestStreak} more days in a row` }),
  },
  {
    id: "dan3",
    name: "Black belt, 3rd dan",
    color: "#1c1c24",
    ink: "#ffd23f",
    stripes: 3,
    goal: "3 stars on every Tower floor and a 30-day streak.",
    step: (p) => {
      const stars = FLOORS.filter((f) => (p.tower.floors[f.id]?.stars ?? 0) === 3).length;
      return both(
        { have: stars, need: FLOORS.length, label: `Get 3 stars on ${FLOORS.length - stars} more Tower floors` },
        { have: Math.min(p.bestStreak, 30), need: 30, label: `Practise ${Math.max(0, 30 - p.bestStreak)} more days in a row` },
      );
    },
  },
];

// katakana gets its own ladder, same colours, its own goals
const kgroup = (id: string) => KANA_GROUPS.find((g) => g.id === id)!.chars;
const K_BASIC = kgroup("k-basic");
const K_DAKUTEN = kgroup("k-dakuten");
const K_EXTRAS = [...kgroup("k-combos"), ...kgroup("k-sokuon")];
const K_STARTER = [...getRow("kt-vowel")!.chars, ...getRow("kt-k")!.chars];
const K_ALL = KANA_GROUPS.filter((g) => g.script === "katakana").flatMap((g) => g.chars);
const kataFloors = () => floorsOf("kata");

const hira = (id: string) => BELTS.find((b) => b.id === id)!;
export const KATA_BELTS: Belt[] = [
  { ...hira("white"), id: "k-white", goal: "Start here." },
  { ...hira("yellow"), id: "k-yellow", goal: "Master the katakana vowels and the K-row.", step: (p) => masterStep(p, K_STARTER, K_STARTER.length, "katakana vowels and K-row") },
  { ...hira("orange"), id: "k-orange", goal: "Master 20 basic katakana.", step: (p) => masterStep(p, K_BASIC, 20, "basic katakana") },
  { ...hira("green"), id: "k-green", goal: "Master 35 basic katakana.", step: (p) => masterStep(p, K_BASIC, 35, "basic katakana") },
  { ...hira("blue"), id: "k-blue", goal: "Master all 46 basic katakana.", step: (p) => masterStep(p, K_BASIC, 46, "basic katakana") },
  { ...hira("purple"), id: "k-purple", goal: "Master all 25 katakana dakuten (ガ, ザ, ダ, バ, パ).", step: (p) => masterStep(p, K_DAKUTEN, K_DAKUTEN.length, "katakana dakuten") },
  { ...hira("brown"), id: "k-brown", goal: "Master the combos (キャ...), small ッ and the long ー.", step: (p) => masterStep(p, K_EXTRAS, K_EXTRAS.length, "katakana combos, ッ or ー") },
  { ...hira("black"), id: "k-black", goal: "Every katakana mastered, foreign sounds like ファ and ティ included.", step: (p) => masterStep(p, K_ALL, K_ALL.length, "katakana") },
  {
    ...hira("dan1"),
    id: "k-dan1",
    goal: "Beat Pawadokuro the Bone King at the top of Neon City.",
    step: (p) => {
      const top = kataFloors().at(-1)!.id;
      return { have: isCleared(p.tower, top) ? 1 : 0, need: 1, label: isCleared(p.tower, top) ? "Done" : "Beat Pawadokuro on Neon floor " + (top - 200) };
    },
  },
  { ...hira("dan2"), id: "k-dan2" },
  {
    ...hira("dan3"),
    id: "k-dan3",
    goal: "3 stars on every Neon City floor and a 30-day streak.",
    step: (p) => {
      const fs = kataFloors();
      const stars = fs.filter((f) => (p.tower.floors[f.id]?.stars ?? 0) === 3).length;
      return both(
        { have: stars, need: fs.length, label: `Get 3 stars on ${fs.length - stars} more Neon City floors` },
        { have: Math.min(p.bestStreak, 30), need: 30, label: `Practise ${Math.max(0, 30 - p.bestStreak)} more days in a row` },
      );
    },
  },
];

// kanji: "known" means you know the meaning and can read it in words
const NUMBERS = KANJI.filter((k) => k.lesson === 1).map((k) => k.k);
function kanjiStep(p: Progress, need: number, pool?: string[], what = "kanji"): BeltStep {
  const have = Math.min(knownKanji(p, pool).length, need);
  return { have, need, label: have >= need ? "Done" : `Learn ${need - have} more ${what}` };
}
function kWordStep(p: Progress, need: number): BeltStep {
  const have = Math.min(learnedKanjiWords(p).length, need);
  return { have, need, label: have >= need ? "Done" : `Learn ${need - have} more kanji words` };
}

export const KANJI_BELTS: Belt[] = [
  { ...hira("white"), id: "j-white", goal: "Start here." },
  { ...hira("yellow"), id: "j-yellow", goal: "Learn the number kanji (一 to 万, plus 円).", step: (p) => kanjiStep(p, NUMBERS.length, NUMBERS, "number kanji") },
  { ...hira("orange"), id: "j-orange", goal: "Learn 25 kanji.", step: (p) => kanjiStep(p, 25) },
  { ...hira("green"), id: "j-green", goal: "Learn 45 kanji.", step: (p) => kanjiStep(p, 45) },
  { ...hira("blue"), id: "j-blue", goal: "Learn 65 kanji.", step: (p) => kanjiStep(p, 65) },
  { ...hira("purple"), id: "j-purple", goal: "Learn 85 kanji.", step: (p) => kanjiStep(p, 85) },
  { ...hira("brown"), id: "j-brown", goal: `Learn all ${KANJI.length} N5 kanji.`, step: (p) => kanjiStep(p, KANJI.length) },
  {
    ...hira("black"),
    id: "j-black",
    goal: `Every N5 kanji, plus 120 kanji words you can read.`,
    step: (p) => both(kanjiStep(p, KANJI.length), kWordStep(p, 120)),
  },
  { ...hira("dan1"), id: "j-dan1", goal: `Learn all ${KANJI_WORDS.length} kanji words.`, step: (p) => kWordStep(p, KANJI_WORDS.length) },
  { ...hira("dan2"), id: "j-dan2" },
];

export type BeltScript = "hiragana" | "katakana" | "kanji";
const LADDER: Record<BeltScript, Belt[]> = { hiragana: BELTS, katakana: KATA_BELTS, kanji: KANJI_BELTS };
export const ladderOf = (script: BeltScript = "hiragana") => LADDER[script];
const earnedOf = (p: Progress, script: BeltScript) => (script === "katakana" ? (p.kBelt ?? 0) : script === "kanji" ? (p.kjBelt ?? 0) : (p.belt ?? 0));

const done = (s: BeltStep) => s.have >= s.need;

// the highest belt your skills support right now (belts go in order)
export function qualifiedBelt(p: Progress, script: BeltScript = "hiragana"): number {
  const L = LADDER[script];
  let i = 0;
  while (i + 1 < L.length && done(L[i + 1].step(p))) i++;
  return i;
}

export interface BeltStatus {
  script: BeltScript;
  index: number;
  belt: Belt;
  next?: Belt;
  nextStep?: BeltStep;
  needsReview: boolean; // earned it before, but mastery has slipped below it
}

export function beltStatus(p: Progress, script: BeltScript = "hiragana"): BeltStatus {
  const L = LADDER[script];
  const q = qualifiedBelt(p, script);
  const index = Math.min(Math.max(earnedOf(p, script), q), L.length - 1);
  const next = L[index + 1];
  return { script, index, belt: L[index], next, nextStep: next?.step(p), needsReview: q < index };
}

// lock in newly earned belts (every ladder) so they can never be taken away
export function withBelt(p: Progress): Progress {
  const h = qualifiedBelt(p, "hiragana");
  const k = qualifiedBelt(p, "katakana");
  const j = qualifiedBelt(p, "kanji");
  if (h <= (p.belt ?? 0) && k <= (p.kBelt ?? 0) && j <= (p.kjBelt ?? 0)) return p;
  return { ...p, belt: Math.max(h, p.belt ?? 0), kBelt: Math.max(k, p.kBelt ?? 0), kjBelt: Math.max(j, p.kjBelt ?? 0) };
}

// a belt you just earned on any ladder, for the promotion banner
export function promotedBelt(before: Progress, after: Progress): Belt | undefined {
  for (const sc of ["kanji", "katakana", "hiragana"] as const) {
    const a = beltStatus(after, sc).index;
    if (a > beltStatus(before, sc).index) return LADDER[sc][a];
  }
  return undefined;
}

// which ladder to show for a script setting
export const beltScriptFor = (script: "hiragana" | "katakana" | "both"): BeltScript => (script === "katakana" ? "katakana" : "hiragana");
