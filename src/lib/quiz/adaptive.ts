import { isLookalike } from "@/lib/kana/hiragana";
import type { CharStat, WordStat } from "@/lib/progress/types";
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

// how much a char should show up. bigger = sooner and more often
export function charWeight(s: CharStat | undefined, kana: string, now = Date.now()): number {
  if (!s || s.seen === 0) return 3; // never seen: cover it
  let w = 1 + missRate(s.recent) * 4 + (1 - charAccuracy(s)) * 2;
  if (s.recent.at(-1) === false) w += 3; // just missed it
  if (missRate(s.recent.slice(-3)) >= 0.6) w += 1.5; // keeps slipping
  const overdue = (now - s.lastSeen) / restMs(s.streak);
  if (overdue >= 1) w += Math.min(2, 0.5 + (overdue - 1) * 0.25);
  else if (isMastered(s)) w *= 0.4; // known and recently seen, give it a rest
  if (isLookalike(kana)) w += 0.3;
  return w;
}

// a char that needs extra practice right now
export function needsFocus(s: CharStat | undefined): boolean {
  if (!s || s.seen === 0) return false;
  if (s.recent.at(-1) === false) return true;
  if (missRate(s.recent.slice(-3)) >= 0.6) return true;
  return s.seen >= 3 && missRate(s.recent) >= 0.3;
}

// the chars to bring back this round, worst first
export function focusChars(enabled: string[], stats: Record<string, CharStat>, max = 8, now = Date.now()): string[] {
  return enabled
    .filter((k) => needsFocus(stats[k]))
    .sort((a, b) => charWeight(stats[b], b, now) - charWeight(stats[a], a, now))
    .slice(0, max);
}

// words you got wrong last time come back regardless of the usual rotation
export function wordNeedsRetry(s: WordStat | undefined): boolean {
  return !!s && s.seen > 0 && !s.lastCorrect;
}

export function isWeakChar(s: CharStat | undefined): boolean {
  return !!s && s.seen >= 2 && charAccuracy(s) < 0.65;
}
