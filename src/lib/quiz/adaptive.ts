import { isLookalike } from "@/lib/kana/hiragana";
import { skillsOf, type SkillId } from "@/lib/coach/analyze";
import type { CharStat, Progress, WordStat } from "@/lib/progress/types";
import { charAccuracy, isMastered } from "@/lib/progress/stats";

// spaced repetition, kept simple:
// - a char you just missed comes straight back next round, more than once
// - a char you keep missing (lately or over all time) keeps getting extra turns
// - every correct read in a row lets a char rest longer before it's due again,
//   so even mastered chars come back after a while instead of vanishing

const HOUR = 3_600_000;

// how long a char can rest after `streak` correct reads in a row: 6h, 12h, 1d, 2d ... 32d
export function restMs(streak: number): number {
  return 6 * HOUR * 2 ** Math.min(Math.max(streak, 0), 7);
}

const missRate = (rs: boolean[]) => (rs.length ? rs.filter((ok) => !ok).length / rs.length : 0);

// what the coach knows beyond single-kana accuracy, worked out once per round
export interface CoachContext {
  confusion: Record<string, number>; // how much you're mixing this kana up right now
  partners: Record<string, string[]>; // kana you mix it up with, worst first
  slow: Set<string>; // right, but slow to recognise
  weakSkills: Set<SkillId>;
}

export const EMPTY_COACH: CoachContext = { confusion: {}, partners: {}, slow: new Set(), weakSkills: new Set() };

export function coachContext(p: Pick<Progress, "chars" | "confusions" | "skills">): CoachContext {
  const confusion: Record<string, number> = {};
  const partners: Record<string, string[]> = {};
  for (const [k, row] of Object.entries(p.confusions)) {
    const pairs = Object.entries(row).sort((a, b) => b[1] - a[1]);
    confusion[k] = pairs.reduce((n, [, v]) => n + v, 0);
    partners[k] = pairs.map(([as]) => as);
  }
  // slow = well above your own typical speed, so a fast or slow typist both get fair results
  const timed = Object.entries(p.chars).filter(([, s]) => s.avgMs && s.seen >= 4);
  const slow = new Set<string>();
  if (timed.length >= 6) {
    const sorted = timed.map(([, s]) => s.avgMs!).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    for (const [k, s] of timed) if (s.avgMs! > median * 1.5) slow.add(k);
  }
  const weakSkills = new Set<SkillId>();
  for (const [id, sk] of Object.entries(p.skills)) {
    if (sk.recent.length >= 6 && missRate(sk.recent) >= 0.25) weakSkills.add(id as SkillId);
  }
  return { confusion, partners, slow, weakSkills };
}

export function skillMissRate(rs: boolean[]): number {
  return missRate(rs);
}

// how much a char should show up. bigger = sooner and more often
export function charWeight(s: CharStat | undefined, kana: string, now = Date.now(), ctx: CoachContext = EMPTY_COACH): number {
  if (!s || s.seen === 0) return 3; // never seen: cover it
  const extra =
    Math.min(2.5, (ctx.confusion[kana] ?? 0) * 0.8) + // you keep reading it as something else
    (ctx.slow.has(kana) ? 1 : 0) + // right but slow
    (skillsOf([kana], 0).some((sk) => ctx.weakSkills.has(sk)) ? 1.2 : 0); // part of a habit you're working on
  let w = 1 + missRate(s.recent) * 4 + (1 - charAccuracy(s)) * 2;
  if (s.recent.at(-1) === false) w += 3; // just missed it
  if (missRate(s.recent.slice(-3)) >= 0.6) w += 1.5; // keeps slipping
  const overdue = (now - s.lastSeen) / restMs(s.streak);
  if (overdue >= 1) w += Math.min(2, 0.5 + (overdue - 1) * 0.25);
  else if (isMastered(s)) w *= 0.4; // known and recently seen, give it a rest
  if (isLookalike(kana)) w += 0.3;
  return w + extra;
}

// a char that needs extra practice right now
export function needsFocus(s: CharStat | undefined, kana = "", ctx: CoachContext = EMPTY_COACH): boolean {
  if (!s || s.seen === 0) return false;
  if ((ctx.confusion[kana] ?? 0) >= 1 || ctx.slow.has(kana)) return true;
  if (s.recent.at(-1) === false) return true;
  if (missRate(s.recent.slice(-3)) >= 0.6) return true;
  return s.seen >= 3 && missRate(s.recent) >= 0.3;
}

// the chars to bring back this round, worst first. a kana you mix up brings its
// twin along, so you practise telling them apart side by side
export function focusChars(enabled: string[], stats: Record<string, CharStat>, max = 8, now = Date.now(), ctx: CoachContext = EMPTY_COACH): string[] {
  const on = new Set(enabled);
  const worst = enabled
    .filter((k) => needsFocus(stats[k], k, ctx))
    .sort((a, b) => charWeight(stats[b], b, now, ctx) - charWeight(stats[a], a, now, ctx));
  const out: string[] = [];
  for (const k of worst) {
    if (out.length >= max) break;
    if (!out.includes(k)) out.push(k);
    const twin = ctx.partners[k]?.find((t) => on.has(t) && !out.includes(t));
    if (twin && out.length < max) out.push(twin);
  }
  return out;
}

// words you got wrong last time come back regardless of the usual rotation
export function wordNeedsRetry(s: WordStat | undefined): boolean {
  return !!s && s.seen > 0 && !s.lastCorrect;
}

export function isWeakChar(s: CharStat | undefined): boolean {
  return !!s && s.seen >= 2 && charAccuracy(s) < 0.65;
}
