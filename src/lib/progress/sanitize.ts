import { isBasicHiragana } from "@/lib/kana/hiragana";
import { emptyProgress, type CharStat, type DayStat, type Progress, type RoundLog, type SessionLog, type WordStat } from "./types";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : d);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const MODES = ["mixed", "words", "random"] as const;

function charStat(v: unknown): CharStat | null {
  if (!isObj(v)) return null;
  const seen = num(v.seen);
  const correct = Math.min(num(v.correct), seen);
  return {
    seen,
    correct,
    streak: num(v.streak),
    roundsCorrect: num(v.roundsCorrect),
    lastRoundId: str(v.lastRoundId),
    recent: Array.isArray(v.recent) ? v.recent.filter((b): b is boolean => typeof b === "boolean").slice(-10) : [],
    lastSeen: num(v.lastSeen),
  };
}

function wordStat(v: unknown): WordStat | null {
  if (!isObj(v)) return null;
  const seen = num(v.seen);
  return {
    seen,
    correct: Math.min(num(v.correct), seen),
    roundsCorrect: num(v.roundsCorrect),
    lastRoundId: str(v.lastRoundId),
    lastCorrect: v.lastCorrect === true,
    lastSeen: num(v.lastSeen),
  };
}

function record<T>(v: unknown, fn: (x: unknown) => T | null, keyOk: (k: string) => boolean = () => true) {
  const out: Record<string, T> = {};
  if (!isObj(v)) return out;
  for (const [k, x] of Object.entries(v)) {
    if (!keyOk(k)) continue;
    const r = fn(x);
    if (r) out[k] = r;
  }
  return out;
}

function day(v: unknown): DayStat | null {
  if (!isObj(v)) return null;
  return { answered: num(v.answered), correct: num(v.correct), rounds: num(v.rounds), xp: num(v.xp) };
}

function session(v: unknown): SessionLog | null {
  if (!isObj(v) || typeof v.id !== "string") return null;
  return {
    id: v.id,
    startedAt: num(v.startedAt),
    endedAt: num(v.endedAt),
    mode: MODES.includes(v.mode as never) ? (v.mode as SessionLog["mode"]) : "mixed",
    rounds: num(v.rounds),
    answered: num(v.answered),
    correct: num(v.correct),
    xp: num(v.xp),
    bestCombo: num(v.bestCombo),
  };
}

function roundLog(v: unknown): RoundLog | null {
  if (!isObj(v)) return null;
  return {
    at: num(v.at),
    answered: num(v.answered),
    correct: num(v.correct),
    avgMs: num(v.avgMs),
    mastered: num(v.mastered),
    points: num(v.points),
  };
}

export function sanitizeProgress(raw: unknown): Progress {
  const d = emptyProgress();
  if (!isObj(raw)) return d;
  const gen = isObj(raw.gen) ? raw.gen : {};
  const totalAnswered = num(raw.totalAnswered);
  return {
    version: 1,
    totalAnswered,
    totalCorrect: Math.min(num(raw.totalCorrect), totalAnswered),
    roundsCompleted: num(raw.roundsCompleted),
    roundsSkipped: num(raw.roundsSkipped),
    xp: num(raw.xp),
    bestCombo: num(raw.bestCombo),
    bestRoundPoints: num(raw.bestRoundPoints),
    bestStreak: num(raw.bestStreak),
    chars: record(raw.chars, charStat, isBasicHiragana),
    words: record(raw.words, wordStat),
    days: record(raw.days, day, (k) => /^\d{4}-\d{2}-\d{2}$/.test(k)),
    sessions: Array.isArray(raw.sessions) ? raw.sessions.map(session).filter((s): s is SessionLog => !!s) : [],
    roundLog: Array.isArray(raw.roundLog) ? raw.roundLog.map(roundLog).filter((r): r is RoundLog => !!r) : [],
    gen: {
      deck: strArr(gen.deck).filter(isBasicHiragana),
      usedWords: strArr(gen.usedWords),
      recentCombos: strArr(gen.recentCombos),
    },
  };
}
