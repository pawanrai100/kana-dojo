import type { PracticeMode } from "@/lib/settings/types";
import type { GeneratorState } from "@/lib/quiz/types";
import { emptyTower, type TowerProgress } from "@/lib/tower/progress";

export interface CharStat {
  seen: number;
  correct: number;
  streak: number; // consecutive correct reads
  roundsCorrect: number; // distinct rounds with at least one correct read
  lastRoundId?: string;
  recent: boolean[]; // last 10 results, newest last
  lastSeen: number;
}

export interface WordStat {
  seen: number;
  correct: number;
  roundsCorrect: number;
  lastRoundId?: string;
  lastCorrect: boolean;
  lastSeen: number;
}

export interface DayStat {
  answered: number;
  correct: number;
  rounds: number;
  xp: number;
}

export interface SessionLog {
  id: string;
  startedAt: number;
  endedAt: number;
  mode: PracticeMode;
  rounds: number;
  answered: number;
  correct: number;
  xp: number;
  bestCombo: number;
}

export interface RoundLog {
  at: number;
  answered: number;
  correct: number;
  avgMs: number;
  mastered: number; // chars mastered after this round
  points: number;
}

export interface Progress {
  version: 1;
  totalAnswered: number;
  totalCorrect: number;
  roundsCompleted: number;
  roundsSkipped: number;
  xp: number;
  bestCombo: number;
  bestRoundPoints: number;
  bestStreak: number;
  chars: Record<string, CharStat>;
  words: Record<string, WordStat>;
  days: Record<string, DayStat>; // key = local yyyy-mm-dd
  sessions: SessionLog[]; // newest last, capped
  roundLog: RoundLog[]; // newest last, capped
  gen: GeneratorState;
  tower: TowerProgress;
}

export function emptyProgress(): Progress {
  return {
    version: 1,
    totalAnswered: 0,
    totalCorrect: 0,
    roundsCompleted: 0,
    roundsSkipped: 0,
    xp: 0,
    bestCombo: 0,
    bestRoundPoints: 0,
    bestStreak: 0,
    chars: {},
    words: {},
    days: {},
    sessions: [],
    roundLog: [],
    gen: { deck: [], usedWords: [], recentCombos: [] },
    tower: emptyTower(),
  };
}
