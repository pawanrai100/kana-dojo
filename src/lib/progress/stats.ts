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

// streak stays alive if you practiced today or yesterday
export function currentStreak(p: Progress, now = Date.now()): number {
  let key = dayKey(now);
  if (!p.days[key]) key = prevDay(key);
  let n = 0;
  while (p.days[key] && p.days[key].answered > 0) {
    n++;
    key = prevDay(key);
  }
  return n;
}

// simple rpg curve, each level needs a bit more xp
export function levelInfo(xp: number) {
  let level = 1;
  let need = 100;
  let floor = 0;
  while (xp >= floor + need) {
    floor += need;
    level++;
    need = Math.round(100 * Math.pow(level, 1.35));
  }
  return { level, intoLevel: xp - floor, needed: need, pct: (xp - floor) / need };
}

export const RANKS = [
  "Kana Novice",
  "Brush Apprentice",
  "Ink Scholar",
  "Scroll Reader",
  "Kana Ronin",
  "Hiragana Samurai",
  "Kana Sensei",
  "Script Master",
];

export function rankTitle(level: number): string {
  return RANKS[Math.min(RANKS.length - 1, Math.floor((level - 1) / 3))];
}
