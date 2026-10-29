import { analyzeAnswer } from "@/lib/coach/analyze";
import { particleInfo } from "@/lib/quiz/tokens";
import type { GeneratorState, GradedRound } from "@/lib/quiz/types";
import { currentStreak, dayKey, masteredChars } from "./stats";
import type { CharStat, Progress, SkillStat, WordStat } from "./types";

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

// confusions fade each time you read the kana right, so old slips stop haunting you
const CONFUSION_FADE = 0.7;

function fadeConfusion(c: Progress["confusions"], k: string) {
  const row = c[k];
  if (!row) return;
  const next: Record<string, number> = {};
  for (const [as, n] of Object.entries(row)) if (n * CONFUSION_FADE >= 0.3) next[as] = n * CONFUSION_FADE;
  if (Object.keys(next).length) c[k] = next;
  else delete c[k];
}

function bumpSkill(prev: SkillStat | undefined, seen: number, missed: number, now: number): SkillStat {
  const s: SkillStat = prev ? { ...prev, recent: [...prev.recent] } : { seen: 0, missed: 0, recent: [], lastSeen: 0 };
  s.seen += seen;
  s.missed += missed;
  s.lastSeen = now;
  s.recent = [...s.recent, ...Array(seen - missed).fill(true), ...Array(missed).fill(false)].slice(-30);
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
    confusions: Object.fromEntries(Object.entries(p.confusions).map(([k, v]) => [k, { ...v }])),
    skills: { ...p.skills },
    sessions: [...p.sessions],
    roundLog: [...p.roundLog],
    gen,
  };

  if (g.skipped) {
    next.roundsSkipped++;
    return next;
  }

  const roundId = g.round.id;
  // cards you never got to (finished early) don't count for or against you
  const tried = g.results.filter((r) => !r.unanswered);
  for (const r of tried) {
    const units = r.question.chars;
    const particles = particleInfo(r.question).units;
    const missedIdx = new Set(r.correct ? [] : r.missedIdx);
    // a particle read wrong is a grammar slip, not a kana slip, so it only feeds the particle habit
    const missed = new Set(units.filter((_, i) => missedIdx.has(i) && !particles.has(i)));
    const plainUnits = new Set(units.filter((_, i) => !particles.has(i)));
    // time per sound on right answers, so slow-but-right kana still count as shaky
    const msPerUnit = r.correct && r.timeUsedMs > 0 && r.question.timeLimitSec ? r.timeUsedMs / units.length : 0;
    for (const k of plainUnits) {
      const ok = r.correct || !missed.has(k);
      next.chars[k] = bumpChar(next.chars[k], ok, roundId, now);
      if (msPerUnit) {
        const prev = next.chars[k].avgMs;
        next.chars[k] = { ...next.chars[k], avgMs: Math.round(prev ? prev * 0.7 + msPerUnit * 0.3 : msPerUnit) };
      }
      if (ok) fadeConfusion(next.confusions, k);
    }
    const a = analyzeAnswer(units, r.typed ?? [], r.correct ? [] : r.missedIdx, particles);
    for (const [shown, as] of a.confusions) {
      // capped so a bad day can be undone by a handful of right answers
      next.confusions[shown] = { ...next.confusions[shown], [as]: Math.min(6, (next.confusions[shown]?.[as] ?? 0) + 1) };
    }
    for (const [sk, v] of Object.entries(a.skills)) {
      next.skills[sk] = bumpSkill(next.skills[sk], v!.seen, v!.missed, now);
    }
    if (r.question.kind === "word" && r.question.wordId) {
      next.words[r.question.wordId] = bumpWord(next.words[r.question.wordId], r.correct, roundId, now);
    }
  }

  const answered = tried.length;
  next.totalAnswered += answered;
  next.totalCorrect += g.correctCount;
  next.roundsCompleted++;
  next.xp += g.xpEarned;
  next.bestCombo = Math.max(next.bestCombo, g.maxCombo);
  next.bestRoundPoints = Math.max(next.bestRoundPoints, g.totalPoints);

  const key = dayKey(now);
  const day = next.days[key] ?? { answered: 0, correct: 0, rounds: 0, xp: 0 };
  next.days[key] = {
    ...day,
    answered: day.answered + answered,
    correct: day.correct + g.correctCount,
    rounds: day.rounds + 1,
    xp: day.xp + g.xpEarned,
    perfect: (day.perfect ?? 0) + (answered >= 5 && g.correctCount === g.results.length ? 1 : 0),
    sentences: (day.sentences ?? 0) + tried.filter((r) => r.correct && r.question.kind === "sentence").length,
    bestCombo: Math.max(day.bestCombo ?? 0, g.maxCombo),
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

  const totalMs = tried.reduce((s, r) => s + r.timeUsedMs, 0);
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
