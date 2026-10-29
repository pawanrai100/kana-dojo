import { readingOf } from "@/lib/kana/hiragana";
import type { Progress } from "@/lib/progress/types";
import { charWeight, coachContext, needsFocus, skillMissRate } from "@/lib/quiz/adaptive";
import { SKILLS, skillsOf, type SkillId } from "./analyze";

// turns everything the coach has noticed into a short, ranked list of
// "here's what to work on", plus the kana a drill round should use

export interface TroubleSpot {
  id: string;
  kind: "confusion" | "habit" | "slow" | "shaky";
  title: string;
  detail: string;
  tip?: string;
  kana: string[];
  score: number;
}

export interface CoachReport {
  spots: TroubleSpot[];
  drill: string[];
  habits: { id: SkillId; label: string; seen: number; accuracy: number }[];
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function coachReport(p: Progress, now = Date.now()): CoachReport {
  const ctx = coachContext(p);
  const spots: TroubleSpot[] = [];

  // pairs you keep mixing up
  const pairs = Object.entries(ctx.partners)
    .map(([k, as]) => ({ k, as: as[0], n: p.confusions[k][as[0]] }))
    .filter((x) => x.n >= 1)
    .sort((a, b) => b.n - a.n);
  const seenPair = new Set<string>();
  for (const { k, as, n } of pairs) {
    const key = [k, as].sort().join("");
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    spots.push({
      id: `pair-${key}`,
      kind: "confusion",
      title: `${k} vs ${as}`,
      detail: `You read ${k} (${readingOf(k)}) as ${as} (${readingOf(as)}) ${n >= 2 ? "more than once" : "lately"}.`,
      tip: "Drilling them side by side is the fastest way to split them apart.",
      kana: [k, as],
      score: 3 + n * 2,
    });
  }

  // habits: the same kind of slip across different kana
  for (const id of ctx.weakSkills) {
    const sk = p.skills[id];
    const rate = skillMissRate(sk.recent);
    const kana = Object.entries(p.chars)
      .filter(([k, s]) => s.recent.includes(false) && skillsOf([k], 0).includes(id))
      .sort((a, b) => charWeight(b[1], b[0], now, ctx) - charWeight(a[1], a[0], now, ctx))
      .slice(0, 6)
      .map(([k]) => k);
    spots.push({
      id: `habit-${id}`,
      kind: "habit",
      title: SKILLS[id].label,
      detail: `Missed ${pct(rate)} of the time lately.`,
      tip: SKILLS[id].tip,
      kana,
      score: 2 + rate * 10,
    });
  }

  // right, but slow
  const slow = [...ctx.slow].sort((a, b) => (p.chars[b].avgMs ?? 0) - (p.chars[a].avgMs ?? 0)).slice(0, 6);
  if (slow.length) {
    spots.push({
      id: "slow",
      kind: "slow",
      title: "Right, but slow",
      detail: "You get these, but they take you a while. Speed means they're not automatic yet.",
      kana: slow,
      score: 2 + slow.length * 0.3,
    });
  }

  // anything else that still needs work
  const covered = new Set(spots.flatMap((s) => s.kana));
  const shaky = Object.entries(p.chars)
    .filter(([k, s]) => !covered.has(k) && needsFocus(s, k, ctx))
    .sort((a, b) => charWeight(b[1], b[0], now, ctx) - charWeight(a[1], a[0], now, ctx))
    .slice(0, 6)
    .map(([k]) => k);
  if (shaky.length) {
    spots.push({
      id: "shaky",
      kind: "shaky",
      title: "Still shaky",
      detail: "Missed recently, so they'll keep coming back until they stick.",
      kana: shaky,
      score: 1 + shaky.length * 0.2,
    });
  }

  spots.sort((a, b) => b.score - a.score);
  const drill = [...new Set(spots.slice(0, 4).flatMap((s) => s.kana))].slice(0, 10);

  const habits = (Object.keys(SKILLS) as SkillId[])
    .filter((id) => (p.skills[id]?.recent.length ?? 0) > 0)
    .map((id) => ({ id, label: SKILLS[id].label, seen: p.skills[id].seen, accuracy: 1 - skillMissRate(p.skills[id].recent) }));

  return { spots: spots.slice(0, 4), drill, habits };
}
