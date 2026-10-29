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
  avgMs?: number; // how long a right read takes, smoothed. slow = still shaky
}

// a habit like "forgets small っ": recent results every time it came up
export interface SkillStat {
  seen: number;
  missed: number;
  recent: boolean[]; // last 30, true = got it right
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
  // counters for daily quests
  perfect?: number;
  sentences?: number;
  floors?: number;
  bestCombo?: number;
  quests?: string[]; // quest ids already paid out today
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
  // kana shown -> kana you read it as -> how strongly (fades as you get it right)
  confusions: Record<string, Record<string, number>>;
  skills: Record<string, SkillStat>;
  belt: number; // highest belt ever earned (index into BELTS), never goes down
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
    confusions: {},
    skills: {},
    belt: 0,
  };
}
