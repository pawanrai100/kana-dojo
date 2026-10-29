import type { PracticeMode } from "@/lib/settings/types";

export type QuestionKind = "word" | "random";
export type Difficulty = "easy" | "medium" | "hard";

export interface Question {
  id: string;
  kind: QuestionKind;
  kana: string;
  romaji: string; // canonical answer shown after grading
  chars: string[];
  meaning?: string; // real words, or random combos that happen to be words
  wordId?: string;
  difficulty: Difficulty;
  timeLimitSec: number | null; // null = no timer (zen)
  retry?: boolean; // a second shot at kana you just missed
}

export interface Round {
  id: string;
  createdAt: number;
  mode: PracticeMode;
  questions: Question[];
  notice?: string;
  focus?: string[]; // chars brought back because you missed them
}

export interface AnswerState {
  value: string;
  locked: boolean;
  timedOut: boolean;
  timeUsedMs: number;
}

export interface GradedQuestion {
  question: Question;
  answer: string;
  correct: boolean;
  missedChars: string[];
  missedIdx: number[];
  timedOut: boolean;
  timeUsedMs: number;
  points: number;
  comboAfter: number;
  unanswered?: boolean; // never reached before you finished early, doesn't count as a miss
}

export interface GradedRound {
  round: Round;
  results: GradedQuestion[];
  correctCount: number;
  totalPoints: number;
  maxCombo: number;
  stars: 0 | 1 | 2 | 3;
  xpEarned: number;
  durationMs: number;
  skipped: boolean;
}

// rolling state the generator keeps between rounds
export interface GeneratorState {
  deck: string[]; // upcoming chars for random combos, guarantees coverage
  usedWords: string[]; // word ids already shown this cycle
  recentCombos: string[];
}

export const EMPTY_GEN_STATE: GeneratorState = { deck: [], usedWords: [], recentCombos: [] };
