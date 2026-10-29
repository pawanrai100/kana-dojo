import { BASIC_KANA_LIST } from "@/lib/kana/hiragana";
import type { CharStat, Progress, WordStat } from "./types";

export const MASTERY_ROUNDS = 3;
const MASTERY_RECENT_ACC = 0.8;

// mastery is always derived, never stored, so one bad round can pull it back.
// needs correct reads in 3+ separate rounds, 80%+ on the last tries, and the latest read right
export function isMastered(s: CharStat | undefined): boolean {
  if (!s || s.roundsCorrect < MASTERY_ROUNDS) return false;
  const recent = s.recent.slice(-5);
  if (recent.length === 0 || !recent[recent.length - 1]) return false;
  const acc = recent.filter(Boolean).length / recent.length;
  return acc >= MASTERY_RECENT_ACC;
}

export function isWordLearned(s: WordStat | undefined): boolean {
  return !!s && s.roundsCorrect >= 2 && s.lastCorrect;
}

export function accuracy(correct: number, total: number): number {
  return total > 0 ? correct / total : 0;
}

export function masteredChars(p: Progress, pool = BASIC_KANA_LIST): string[] {
  return pool.filter((k) => isMastered(p.chars[k]));
}

// coverage only counts characters that have actually shown up in a question
export function encounteredChars(p: Progress, pool = BASIC_KANA_LIST): string[] {
  return pool.filter((k) => (p.chars[k]?.seen ?? 0) > 0);
}

export function charAccuracy(s: CharStat | undefined): number {
  return s ? accuracy(s.correct, s.seen) : 0;
}

export interface WeakChar {
  kana: string;
  accuracy: number;
  misses: number;
  seen: number;
}

export function weakChars(p: Progress, limit = 8): WeakChar[] {
  return Object.entries(p.chars)
    .filter(([, s]) => s.seen >= 2 && s.correct < s.seen)
    .map(([kana, s]) => ({ kana, accuracy: charAccuracy(s), misses: s.seen - s.correct, seen: s.seen }))
    .sort((a, b) => a.accuracy - b.accuracy || b.misses - a.misses)
    .slice(0, limit);
}

export interface HardWord {
  id: string;
  misses: number;
  seen: number;
}

export function difficultWords(p: Progress, limit = 8): HardWord[] {
  return Object.entries(p.words)
    .map(([id, s]) => ({ id, misses: s.seen - s.correct, seen: s.seen }))
    .filter((w) => w.misses > 0)
    .sort((a, b) => b.misses - a.misses || a.seen - b.seen)
    .slice(0, limit);
}

export function wordsLearned(p: Progress): number {
  return Object.values(p.words).filter(isWordLearned).length;
}

export function wordsPracticed(p: Progress): number {
  return Object.keys(p.words).length;
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function prevDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d - 1).getTime());
}

function nextDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + 1).getTime());
}

export const MAX_FREEZES = 2;
const QUESTS_PER_DAY = 3;

export interface StreakInfo {
  streak: number;
  freezes: number; // banked right now
  frozen: string[]; // days a freeze saved in the current streak
}

// walks your history forward. finishing all 3 daily quests banks a streak freeze
// (2 max), and a missed day spends one instead of breaking the streak.
// all derived from the day log, so nothing extra gets saved or synced
export function streakInfo(p: Progress, now = Date.now()): StreakInfo {
  const today = dayKey(now);
  const active = (k: string) => (p.days[k]?.answered ?? 0) > 0;
  const keys = Object.keys(p.days).filter((k) => active(k) && k <= today).sort();
  let streak = 0;
  let freezes = 0;
  let frozen: string[] = [];
  if (!keys.length) return { streak, freezes, frozen };
  for (let k = keys[0]; k <= today; k = nextDay(k)) {
    if (active(k)) {
      streak++;
      if ((p.days[k].quests?.length ?? 0) >= QUESTS_PER_DAY) freezes = Math.min(MAX_FREEZES, freezes + 1);
    } else if (k === today) {
      // today isn't over yet
    } else if (streak > 0 && freezes > 0) {
      freezes--;
      frozen.push(k);
    } else {
      streak = 0;
      frozen = [];
    }
  }
  return { streak, freezes, frozen };
}

export function currentStreak(p: Progress, now = Date.now()): number {
  return streakInfo(p, now).streak;
}
