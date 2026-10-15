import { isLookalike } from "@/lib/kana/hiragana";
import type { CharStat } from "@/lib/progress/types";
import { charAccuracy, isMastered } from "@/lib/progress/stats";

// how much a char should show up. unseen chars come first (coverage),
// then the ones you keep missing, mastered ones fade but never vanish
export function charWeight(s: CharStat | undefined, kana: string): number {
  if (!s || s.seen === 0) return 3;
  let w = 1 + (1 - charAccuracy(s)) * 3;
  const lastFew = s.recent.slice(-3);
  if (lastFew.length && !lastFew[lastFew.length - 1]) w += 1; // just missed it
  if (isLookalike(kana)) w += 0.25;
  if (isMastered(s)) w *= 0.5;
  return w;
}

export function isWeakChar(s: CharStat | undefined): boolean {
  return !!s && s.seen >= 2 && charAccuracy(s) < 0.65;
}
