import { SPEAKING_LESSONS } from "./lessons";

export interface LessonReview {
  completedAt: number;
  dueAt: number;
  interval: number;
  independent: boolean;
}
export type LearningProgress = Record<string, LessonReview>;
const DAY = 86_400_000;
const INTERVALS = [1, 3, 7, 14, 30];

export function learningKey(owner: string | null): string {
  return `kana-dojo:learning:v1:${owner ?? "guest"}`;
}

export function sanitizeLearning(raw: unknown): LearningProgress {
  const clean: LearningProgress = {};
  if (!raw || typeof raw !== "object") return clean;
  for (const lesson of SPEAKING_LESSONS) {
    const item = (raw as Record<string, unknown>)[lesson.id];
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (typeof r.completedAt !== "number" || !Number.isFinite(r.completedAt) || r.completedAt < 0 ||
        typeof r.dueAt !== "number" || !Number.isFinite(r.dueAt) || r.dueAt < r.completedAt ||
        typeof r.interval !== "number" || !INTERVALS.includes(r.interval) || typeof r.independent !== "boolean") continue;
    clean[lesson.id] = { completedAt: r.completedAt, dueAt: r.dueAt, interval: r.interval, independent: r.independent };
  }
  return clean;
}

export function completeLesson(progress: LearningProgress, id: string, independent: boolean, now: number): LearningProgress {
  if (!SPEAKING_LESSONS.some((l) => l.id === id) || !Number.isFinite(now) || now < 0) return progress;
  const old = progress[id];
  // Repeating a lesson early must not push its due date forward or inflate skill.
  if (old && old.dueAt > now && independent) return progress;
  const previous = old ? INTERVALS.indexOf(old.interval) : -1;
  const interval = independent ? INTERVALS[Math.min(previous + 1, INTERVALS.length - 1)] : 1;
  return { ...progress, [id]: { completedAt: now, dueAt: now + interval * DAY, interval, independent } };
}

export function recommendedLesson(progress: LearningProgress, now: number) {
  return SPEAKING_LESSONS.filter((l) => progress[l.id]?.dueAt <= now)
    .sort((a, b) => progress[a.id].dueAt - progress[b.id].dueAt)[0]
    ?? SPEAKING_LESSONS.find((l) => !progress[l.id])
    ?? SPEAKING_LESSONS[0];
}
