import { dayKey } from "./stats";
import type { DayStat, Progress } from "./types";

// three small goals a day, the same for everyone on the same date.
// finishing one pays out once, straight into your xp

export interface Quest {
  id: string;
  label: string;
  need: number;
  have: (d: DayStat) => number;
}

export const QUEST_XP = 50;

const POOL: Quest[] = [
  { id: "rounds", label: "Finish 3 rounds", need: 3, have: (d) => d.rounds },
  { id: "answers", label: "Read 40 cards", need: 40, have: (d) => d.answered },
  { id: "perfect", label: "Get a perfect round", need: 1, have: (d) => d.perfect ?? 0 },
  { id: "sentences", label: "Read 5 sentences right", need: 5, have: (d) => d.sentences ?? 0 },
  { id: "tower", label: "Clear a Tower floor", need: 1, have: (d) => d.floors ?? 0 },
  { id: "combo", label: "Hit a ×8 combo", need: 8, have: (d) => d.bestCombo ?? 0 },
  { id: "sharp", label: "Answer 20 cards at 90%+", need: 20, have: (d) => (d.answered >= 20 && d.correct / d.answered >= 0.9 ? d.answered : Math.min(d.answered, 19)) },
];

// a tiny stable hash so a date always picks the same three
function seed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function questsFor(key: string): Quest[] {
  const pool = [...POOL];
  let h = seed(key);
  const out: Quest[] = [];
  while (out.length < 3) {
    out.push(pool.splice(h % pool.length, 1)[0]);
    h = Math.imul(h, 2654435761) >>> 0;
  }
  return out;
}

const EMPTY: DayStat = { answered: 0, correct: 0, rounds: 0, xp: 0 };

export interface QuestStatus {
  quest: Quest;
  have: number;
  done: boolean;
}

export function todaysQuests(p: Progress, now = Date.now()): QuestStatus[] {
  const key = dayKey(now);
  const d = p.days[key] ?? EMPTY;
  return questsFor(key).map((q) => {
    const have = Math.min(q.have(d), q.need);
    return { quest: q, have, done: have >= q.need };
  });
}

// pay out any quest that just got finished. returns the quests paid this time
export function claimQuests(p: Progress, now = Date.now()): { progress: Progress; claimed: Quest[] } {
  const key = dayKey(now);
  const d = p.days[key];
  if (!d) return { progress: p, claimed: [] };
  const paid = new Set(d.quests ?? []);
  const claimed = todaysQuests(p, now)
    .filter((s) => s.done && !paid.has(s.quest.id))
    .map((s) => s.quest);
  if (!claimed.length) return { progress: p, claimed };
  const bonus = claimed.length * QUEST_XP;
  return {
    claimed,
    progress: {
      ...p,
      xp: p.xp + bonus,
      days: { ...p.days, [key]: { ...d, xp: d.xp + bonus, quests: [...paid, ...claimed.map((q) => q.id)] } },
    },
  };
}
