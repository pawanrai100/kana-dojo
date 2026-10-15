import type { CharStat, DayStat, Progress, RoundLog, SessionLog, WordStat } from "@/lib/progress/types";

const MAX_SESSIONS = 120;
const MAX_ROUND_LOG = 300;

export function hasProgress(p: Progress): boolean {
  return p.totalAnswered > 0 || p.roundsSkipped > 0 || Object.keys(p.days).length > 0;
}

function unionSessions(a: SessionLog[], b: SessionLog[]): SessionLog[] {
  const byId = new Map<string, SessionLog>();
  for (const s of [...a, ...b]) {
    const prev = byId.get(s.id);
    // same session on both sides: keep the one that saw more rounds
    if (!prev || s.rounds > prev.rounds) byId.set(s.id, s);
  }
  return [...byId.values()].sort((x, y) => x.endedAt - y.endedAt).slice(-MAX_SESSIONS);
}

function unionRounds(a: RoundLog[], b: RoundLog[]): RoundLog[] {
  const byAt = new Map<number, RoundLog>();
  for (const r of [...a, ...b]) byAt.set(r.at, r);
  return [...byAt.values()].sort((x, y) => x.at - y.at).slice(-MAX_ROUND_LOG);
}

function sumDays(days: Record<string, DayStat>) {
  let answered = 0, correct = 0, rounds = 0, xp = 0;
  for (const d of Object.values(days)) {
    answered += d.answered;
    correct += d.correct;
    rounds += d.rounds;
    xp += d.xp;
  }
  return { answered, correct, rounds, xp };
}

function pickBy<T>(a: Record<string, T>, b: Record<string, T>, better: (x: T, y: T) => T): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? better(out[k], v) : v;
  return out;
}

const moreSeen = <T extends { seen: number; lastSeen: number }>(x: T, y: T) =>
  y.seen > x.seen || (y.seen === x.seen && y.lastSeen > x.lastSeen) ? y : x;

// same account, edited on two devices before they could sync.
// overlapping history, so take the fuller copy of each piece instead of adding
export function mergeDiverged(local: Progress, remote: Progress): Progress {
  const days = pickBy(local.days, remote.days, (x, y) =>
    y.answered > x.answered || (y.answered === x.answered && y.xp > x.xp) ? y : x,
  );
  const fromDays = sumDays(days);
  return {
    version: 1,
    // totals are rebuilt from per-day records so they always agree with the history
    totalAnswered: Math.max(fromDays.answered, Math.min(local.totalAnswered, remote.totalAnswered)),
    totalCorrect: Math.max(fromDays.correct, Math.min(local.totalCorrect, remote.totalCorrect)),
    roundsCompleted: Math.max(fromDays.rounds, Math.min(local.roundsCompleted, remote.roundsCompleted)),
    xp: Math.max(fromDays.xp, Math.min(local.xp, remote.xp)),
    roundsSkipped: Math.max(local.roundsSkipped, remote.roundsSkipped),
    bestCombo: Math.max(local.bestCombo, remote.bestCombo),
    bestRoundPoints: Math.max(local.bestRoundPoints, remote.bestRoundPoints),
    bestStreak: Math.max(local.bestStreak, remote.bestStreak),
    chars: pickBy(local.chars, remote.chars, moreSeen),
    words: pickBy(local.words, remote.words, moreSeen),
    days,
    sessions: unionSessions(local.sessions, remote.sessions),
    roundLog: unionRounds(local.roundLog, remote.roundLog),
    gen: local.gen, // generator state is per device
  };
}

function addChar(x: CharStat, y: CharStat): CharStat {
  const [older, newer] = x.lastSeen <= y.lastSeen ? [x, y] : [y, x];
  return {
    seen: x.seen + y.seen,
    correct: x.correct + y.correct,
    roundsCorrect: x.roundsCorrect + y.roundsCorrect,
    streak: newer.streak,
    lastRoundId: newer.lastRoundId,
    recent: [...older.recent, ...newer.recent].slice(-10),
    lastSeen: newer.lastSeen,
  };
}

function addWord(x: WordStat, y: WordStat): WordStat {
  const newer = x.lastSeen <= y.lastSeen ? y : x;
  return {
    seen: x.seen + y.seen,
    correct: x.correct + y.correct,
    roundsCorrect: x.roundsCorrect + y.roundsCorrect,
    lastRoundId: newer.lastRoundId,
    lastCorrect: newer.lastCorrect,
    lastSeen: newer.lastSeen,
  };
}

// guest progress joining an account. separate histories, so everything adds up
export function mergeGuestInto(account: Progress, guest: Progress): Progress {
  const days = pickBy(account.days, guest.days, (x, y) => ({
    answered: x.answered + y.answered,
    correct: x.correct + y.correct,
    rounds: x.rounds + y.rounds,
    xp: x.xp + y.xp,
  }));
  return {
    version: 1,
    totalAnswered: account.totalAnswered + guest.totalAnswered,
    totalCorrect: account.totalCorrect + guest.totalCorrect,
    roundsCompleted: account.roundsCompleted + guest.roundsCompleted,
    roundsSkipped: account.roundsSkipped + guest.roundsSkipped,
    xp: account.xp + guest.xp,
    bestCombo: Math.max(account.bestCombo, guest.bestCombo),
    bestRoundPoints: Math.max(account.bestRoundPoints, guest.bestRoundPoints),
    bestStreak: Math.max(account.bestStreak, guest.bestStreak),
    chars: pickBy(account.chars, guest.chars, addChar),
    words: pickBy(account.words, guest.words, addWord),
    days,
    sessions: unionSessions(account.sessions, guest.sessions),
    roundLog: unionRounds(account.roundLog, guest.roundLog),
    gen: account.gen,
  };
}
