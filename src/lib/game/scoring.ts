import type { Difficulty } from "@/lib/quiz/types";

export const BASE_POINTS: Record<Difficulty, number> = { easy: 100, medium: 150, hard: 220 };
export const MAX_COMBO_MULT = 2;

export function comboMultiplier(combo: number): number {
  // combo counts the streak including this answer
  return Math.min(MAX_COMBO_MULT, 1 + Math.max(0, combo - 1) * 0.1);
}

// correct answer: base by difficulty, up to +50% for speed, times combo
export function questionPoints(opts: {
  difficulty: Difficulty;
  correct: boolean;
  combo: number;
  timeLimitSec: number | null;
  timeUsedMs: number;
}): number {
  if (!opts.correct) return 0;
  const base = BASE_POINTS[opts.difficulty];
  let speed = 0;
  if (opts.timeLimitSec) {
    const left = 1 - opts.timeUsedMs / (opts.timeLimitSec * 1000);
    speed = Math.max(0, Math.min(1, left)) * 0.5;
  }
  return Math.round(base * (1 + speed) * comboMultiplier(opts.combo));
}

export function roundStars(correct: number, total: number): 0 | 1 | 2 | 3 {
  if (total === 0) return 0;
  const acc = correct / total;
  if (acc >= 0.9) return 3;
  if (acc >= 0.7) return 2;
  if (acc >= 0.4) return 1;
  return 0;
}

export function xpFromPoints(points: number, answered: number): number {
  // small floor so even a rough round moves the bar
  return Math.round(points / 10) + answered * 2;
}
