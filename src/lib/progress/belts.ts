import { KANA_GROUPS, getRow } from "@/lib/kana/hiragana";
import { skillMissRate } from "@/lib/quiz/adaptive";
import { isCleared } from "@/lib/tower/progress";
import { FLOORS, TOP_FLOOR } from "@/lib/tower/floors";
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

const done = (s: BeltStep) => s.have >= s.need;

// the highest belt your skills support right now (belts go in order)
export function qualifiedBelt(p: Progress): number {
  let i = 0;
  while (i + 1 < BELTS.length && done(BELTS[i + 1].step(p))) i++;
  return i;
}

export interface BeltStatus {
  index: number;
  belt: Belt;
  next?: Belt;
  nextStep?: BeltStep;
  needsReview: boolean; // earned it before, but mastery has slipped below it
}

export function beltStatus(p: Progress): BeltStatus {
  const q = qualifiedBelt(p);
  const index = Math.max(p.belt ?? 0, q);
  const next = BELTS[index + 1];
  return { index, belt: BELTS[index], next, nextStep: next?.step(p), needsReview: q < index };
}

// lock in a newly earned belt so it can never be taken away
export function withBelt(p: Progress): Progress {
  const q = qualifiedBelt(p);
  return q > (p.belt ?? 0) ? { ...p, belt: q } : p;
}
