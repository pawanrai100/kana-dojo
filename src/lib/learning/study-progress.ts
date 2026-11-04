import { GRAMMAR, KANJI, SOUNDS, WORDS } from "./study-content";
import { SPEAKING_LESSONS } from "./lessons";
export interface Review { at: number; due: number; interval: number; correct: boolean }
export interface StudyProgress { version: 1; goal: number; romaji: boolean; reviews: Record<string, Review>; saved: string[]; notes: string; updatedAt: number }
export const emptyStudy = (): StudyProgress => ({ version: 1, goal: 10, romaji: true, reviews: {}, saved: [], notes: "", updatedAt: 0 });
export const studyKey = (owner: string | null) => `kana-dojo:study:v1:${owner ?? "guest"}`;
export const reviewIds = new Set([
  ...WORDS.map(w => `word:${w.id}`), ...GRAMMAR.map(g => `grammar:${g.id}`), ...KANJI.map(k => `kanji:${k.id}`),
  ...SOUNDS.map(s => `sound:${s.id}`), ...SPEAKING_LESSONS.flatMap(l => l.phrases.map(p => `shadow:${l.id}:${p.id}`)),
  ...SPEAKING_LESSONS.map(l => `roleplay:${l.id}`),
]);
const intervals = [1, 3, 7, 14, 30];
export function sanitizeStudy(input: unknown): StudyProgress {
  const result = emptyStudy();
  if (!input || typeof input !== "object") return result;
  const raw = input as Partial<StudyProgress>;
  if ([5, 10, 20].includes(raw.goal ?? 0)) result.goal = raw.goal!;
  if (typeof raw.romaji === "boolean") result.romaji = raw.romaji;
  if (typeof raw.notes === "string") result.notes = raw.notes.slice(0, 5000);
  if (typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt) && raw.updatedAt >= 0) result.updatedAt = raw.updatedAt;
  if (Array.isArray(raw.saved)) result.saved = [...new Set(raw.saved.filter(id => typeof id === "string" && WORDS.some(w => w.id === id)))];
  if (raw.reviews && typeof raw.reviews === "object") for (const [id, r] of Object.entries(raw.reviews)) {
    if (reviewIds.has(id) && r && typeof r.at === "number" && Number.isFinite(r.at) && r.at >= 0 && r.at < 8e15 &&
      typeof r.due === "number" && Number.isFinite(r.due) && r.due >= r.at && r.due < 8e15 &&
      intervals.includes(r.interval) && typeof r.correct === "boolean") result.reviews[id] = { at: r.at, due: r.due, interval: r.interval, correct: r.correct };
  }
  return result;
}
export function reviewItem(state: StudyProgress, id: string, correct: boolean, now: number): StudyProgress {
  if (!reviewIds.has(id) || !Number.isFinite(now) || now < 0) return state;
  const old = state.reviews[id];
  if (old && old.due > now && correct) return state;
  const interval = correct ? intervals[Math.min(old ? intervals.indexOf(old.interval) + 1 : 0, intervals.length - 1)] : 1;
  return { ...state, updatedAt: now, reviews: { ...state.reviews, [id]: { at: now, due: now + interval * 86400000, interval, correct } } };
}
export function mergeStudy(a: StudyProgress, b: StudyProgress): StudyProgress {
  const reviews = { ...a.reviews };
  for (const [id, review] of Object.entries(b.reviews)) if (!reviews[id] || review.at > reviews[id].at) reviews[id] = review;
  return sanitizeStudy({ ...(b.updatedAt > a.updatedAt ? b : a), reviews, saved: [...a.saved, ...b.saved] });
}
export function studyBackup(raw: unknown): StudyProgress {
  if (!raw || typeof raw !== "object" || (raw as { format?: unknown }).format !== "kana-dojo-study-v1") throw new Error("Choose a Kana Dojo study backup, not an unrelated JSON file.");
  const study = (raw as { study?: unknown }).study;
  if (!study || typeof study !== "object" || (study as { version?: unknown }).version !== 1) throw new Error("This backup version is not supported.");
  return sanitizeStudy(study);
}
