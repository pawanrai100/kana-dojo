import { currentStreak, dayKey, isMastered, isWordLearned } from "@/lib/progress/stats";
import type { CharStat, Progress, WordStat } from "@/lib/progress/types";
import { KANJI, KANJI_LIST, KANJI_WORDS, LESSONS } from "./data";
import type { KanjiResult } from "./quiz";

function bump(prev: CharStat | undefined, ok: boolean, roundId: string, now: number, ms?: number): CharStat {
  const s: CharStat = prev ? { ...prev, recent: [...prev.recent] } : { seen: 0, correct: 0, streak: 0, roundsCorrect: 0, recent: [], lastSeen: 0 };
  s.seen++;
  s.lastSeen = now;
  s.recent = [...s.recent, ok].slice(-10);
  if (ok) {
    s.correct++;
    s.streak++;
    if (s.lastRoundId !== roundId) {
      s.roundsCorrect++;
      s.lastRoundId = roundId;
    }
    if (ms && ms > 0 && ms < 60_000) s.avgMs = Math.round(s.avgMs ? s.avgMs * 0.7 + ms * 0.3 : ms);
  } else {
    s.streak = 0;
  }
  return s;
}

function bumpWord(prev: WordStat | undefined, ok: boolean, roundId: string, now: number): WordStat {
  const s: WordStat = prev ? { ...prev } : { seen: 0, correct: 0, roundsCorrect: 0, lastCorrect: false, lastSeen: 0 };
  s.seen++;
  s.lastSeen = now;
  s.lastCorrect = ok;
  if (ok) {
    s.correct++;
    if (s.lastRoundId !== roundId) {
      s.roundsCorrect++;
      s.lastRoundId = roundId;
    }
  }
  return s;
}

// pure: a finished kanji round folded into progress. counts toward the same
// totals, days and streak as kana, so the leaderboard and quests see it too
export function applyKanjiRound(p: Progress, roundId: string, results: KanjiResult[], now = Date.now()): Progress {
  if (!results.length) return p;
  const kanji = { ...p.kanji };
  const kanjiRead = { ...p.kanjiRead };
  const kanjiWords = { ...p.kanjiWords };
  for (const r of results) {
    if (r.q.kind === "reading" && r.q.word) {
      for (const k of new Set(r.q.word.kanji)) kanjiRead[k] = bump(kanjiRead[k], r.correct, roundId, now, r.ms);
      kanjiWords[r.q.word.id] = bumpWord(kanjiWords[r.q.word.id], r.correct, roundId, now);
    } else {
      kanji[r.q.kanji] = bump(kanji[r.q.kanji], r.correct, roundId, now, r.ms);
    }
  }
  const right = results.filter((r) => r.correct).length;
  const key = dayKey(now);
  const d = p.days[key] ?? { answered: 0, correct: 0, rounds: 0, xp: 0 };
  const next: Progress = {
    ...p,
    kanji,
    kanjiRead,
    kanjiWords,
    totalAnswered: p.totalAnswered + results.length,
    totalCorrect: p.totalCorrect + right,
    roundsCompleted: p.roundsCompleted + 1,
    days: {
      ...p.days,
      [key]: {
        ...d,
        answered: d.answered + results.length,
        correct: d.correct + right,
        rounds: d.rounds + 1,
        perfect: (d.perfect ?? 0) + (results.length >= 5 && right === results.length ? 1 : 0) || undefined,
        kanji: (d.kanji ?? 0) + right || undefined,
      },
    },
  };
  return { ...next, bestStreak: Math.max(next.bestStreak, currentStreak(next, now)) };
}

// knowing a kanji = you know what it means AND can read it in words
export type KanjiLevel = "new" | "learning" | "meaning" | "known";

export function kanjiLevel(p: Pick<Progress, "kanji" | "kanjiRead">, k: string): KanjiLevel {
  const m = p.kanji?.[k];
  const r = p.kanjiRead?.[k];
  if (!m?.seen && !r?.seen) return "new";
  const mm = isMastered(m);
  if (mm && isMastered(r)) return "known";
  return mm ? "meaning" : "learning";
}

export function knownKanji(p: Pick<Progress, "kanji" | "kanjiRead">, pool = KANJI_LIST): string[] {
  return pool.filter((k) => kanjiLevel(p, k) === "known");
}

export function learnedKanjiWords(p: Pick<Progress, "kanjiWords">): string[] {
  return KANJI_WORDS.filter((w) => isWordLearned(p.kanjiWords?.[w.id])).map((w) => w.id);
}

export interface LessonProgress {
  id: number;
  total: number;
  known: number;
  started: number;
}

export function lessonProgress(p: Pick<Progress, "kanji" | "kanjiRead">): LessonProgress[] {
  return LESSONS.map((l) => {
    const ks = KANJI.filter((x) => x.lesson === l.id).map((x) => x.k);
    const levels = ks.map((k) => kanjiLevel(p, k));
    return { id: l.id, total: ks.length, known: levels.filter((x) => x === "known").length, started: levels.filter((x) => x !== "new").length };
  });
}

// the kanji you keep missing, for the summary and stats
export function shakyKanji(p: Pick<Progress, "kanji" | "kanjiRead">, limit = 6): string[] {
  const miss = (s?: CharStat) => (s ? s.recent.filter((x) => !x).length : 0);
  return KANJI_LIST.map((k) => ({ k, m: miss(p.kanji?.[k]) + miss(p.kanjiRead?.[k]) }))
    .filter((x) => x.m > 0 && kanjiLevel(p, x.k) !== "known")
    .sort((a, b) => b.m - a.m)
    .slice(0, limit)
    .map((x) => x.k);
}
