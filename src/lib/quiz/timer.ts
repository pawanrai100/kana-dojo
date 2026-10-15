import { isLookalike } from "@/lib/kana/hiragana";
import type { CharStat } from "@/lib/progress/types";
import type { TimerPace } from "@/lib/settings/types";
import type { Difficulty, QuestionKind } from "./types";
import { isWeakChar } from "./adaptive";

export const PACE_MULT: Record<Exclude<TimerPace, "off">, number> = {
  relaxed: 1.6,
  normal: 1,
  fast: 0.7,
};

const BASE_SEC = 3;
const PER_KANA_SEC = 1.6;

export interface DifficultyInfo {
  difficulty: Difficulty;
  score: number;
  timeLimitSec: number | null;
}

// harder words get more time: longer, lookalike chars, chars you're weak on,
// nonsense combos (no meaning to lean on). pace setting scales the lot
export function rateQuestion(
  chars: string[],
  kind: QuestionKind,
  pace: TimerPace,
  stats: Record<string, CharStat>,
): DifficultyInfo {
  const len = chars.length;
  const look = chars.filter(isLookalike).length;
  const weak = chars.filter((k) => isWeakChar(stats[k])).length;
  const unseen = chars.filter((k) => !stats[k]?.seen).length;
  const random = kind === "random" ? 1 : 0;

  const score = len + look * 0.5 + weak * 0.9 + unseen * 0.4 + random * 1.2;
  const difficulty: Difficulty = score < 3.6 ? "easy" : score < 6.2 ? "medium" : "hard";

  if (pace === "off") return { difficulty, score, timeLimitSec: null };

  const raw =
    BASE_SEC + len * PER_KANA_SEC + look * 0.6 + weak * 1.2 + unseen * 0.6 + random * 1.5;
  const sec = Math.min(40, Math.max(4, raw * PACE_MULT[pace]));
  return { difficulty, score, timeLimitSec: Math.round(sec * 2) / 2 };
}
