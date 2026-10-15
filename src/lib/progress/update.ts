import type { GeneratorState, GradedRound } from "@/lib/quiz/types";
import { currentStreak, dayKey, masteredChars } from "./stats";
import type { CharStat, Progress, WordStat } from "./types";

const SESSION_GAP_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 120;
const MAX_ROUND_LOG = 300;

function bumpChar(prev: CharStat | undefined, ok: boolean, roundId: string, now: number): CharStat {
  const s: CharStat = prev
    ? { ...prev, recent: [...prev.recent] }
    : { seen: 0, correct: 0, streak: 0, roundsCorrect: 0, recent: [], lastSeen: 0 };
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
  } else {
    s.streak = 0;
  }
  return s;
}

function bumpWord(prev: WordStat | undefined, ok: boolean, roundId: string, now: number): WordStat {
  const s: WordStat = prev
    ? { ...prev }
    : { seen: 0, correct: 0, roundsCorrect: 0, lastCorrect: false, lastSeen: 0 };
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

// pure: returns a new progress object with the round folded in
export function applyGradedRound(p: Progress, g: GradedRound, gen: GeneratorState, now = Date.now()): Progress {
  const next: Progress = {
    ...p,
    chars: { ...p.chars },
    words: { ...p.words },
    days: { ...p.days },
    sessions: [...p.sessions],
    roundLog: [...p.roundLog],
    gen,
  };

  if (g.skipped) {
    next.roundsSkipped++;
    return next;
  }

  const roundId = g.round.id;
  for (const r of g.results) {
    const missed = new Set(r.missedChars);
    for (const k of new Set(r.question.chars)) {
      const ok = r.correct || !missed.has(k);
      next.chars[k] = bumpChar(next.chars[k], ok, roundId, now);
    }
    if (r.question.kind === "word" && r.question.wordId) {
      next.words[r.question.wordId] = bumpWord(next.words[r.question.wordId], r.correct, roundId, now);
    }
  }

  const answered = g.results.length;
  next.totalAnswered += answered;
  next.totalCorrect += g.correctCount;
  next.roundsCompleted++;
  next.xp += g.xpEarned;
  next.bestCombo = Math.max(next.bestCombo, g.maxCombo);
  next.bestRoundPoints = Math.max(next.bestRoundPoints, g.totalPoints);

  const key = dayKey(now);
  const day = next.days[key] ?? { answered: 0, correct: 0, rounds: 0, xp: 0 };
  next.days[key] = {
    answered: day.answered + answered,
    correct: day.correct + g.correctCount,
    rounds: day.rounds + 1,
    xp: day.xp + g.xpEarned,
  };
  next.bestStreak = Math.max(next.bestStreak, currentStreak(next, now));

  // rounds within 30 min of each other count as one session
  const last = next.sessions[next.sessions.length - 1];
  if (last && now - last.endedAt < SESSION_GAP_MS) {
    next.sessions[next.sessions.length - 1] = {
      ...last,
      endedAt: now,
      mode: g.round.mode,
      rounds: last.rounds + 1,
      answered: last.answered + answered,
      correct: last.correct + g.correctCount,
      xp: last.xp + g.xpEarned,
      bestCombo: Math.max(last.bestCombo, g.maxCombo),
    };
  } else {
    next.sessions.push({
      id: `s-${now.toString(36)}`,
      startedAt: now - g.durationMs,
      endedAt: now,
      mode: g.round.mode,
      rounds: 1,
      answered,
      correct: g.correctCount,
      xp: g.xpEarned,
      bestCombo: g.maxCombo,
    });
  }
  next.sessions = next.sessions.slice(-MAX_SESSIONS);

  const totalMs = g.results.reduce((s, r) => s + r.timeUsedMs, 0);
  next.roundLog.push({
    at: now,
    answered,
    correct: g.correctCount,
    avgMs: answered ? Math.round(totalMs / answered) : 0,
    mastered: masteredChars(next).length,
    points: g.totalPoints,
  });
  next.roundLog = next.roundLog.slice(-MAX_ROUND_LOG);

  return next;
}
