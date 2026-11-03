import { describe, expect, it } from "vitest";
import { listeningOptions, matchesReply, normalizeReply, SPEAKING_LESSONS } from "./lessons";
import { completeLesson, learningKey, recommendedLesson, sanitizeLearning } from "./progress";

const DAY = 86_400_000;
describe("conversation curriculum", () => {
  it("has unique missions and complete, answerable lessons", () => {
    expect(new Set(SPEAKING_LESSONS.map((l) => l.id)).size).toBe(6);
    for (const lesson of SPEAKING_LESSONS) {
      expect(lesson.phrases).toHaveLength(3);
      expect(lesson.turns).toHaveLength(2);
      expect(new Set(lesson.phrases.map((p) => p.id)).size).toBe(3);
      for (const phrase of lesson.phrases) {
        for (const field of [phrase.japanese, phrase.speech, phrase.reading, phrase.meaning, phrase.note]) expect(field.length).toBeGreaterThan(0);
        const options = listeningOptions(lesson, phrase);
        expect(new Set(options).size).toBe(3);
        expect(options.filter((o) => o === phrase.meaning)).toHaveLength(1);
        expect(listeningOptions(lesson, phrase)).toEqual(options);
      }
      for (const turn of lesson.turns) {
        for (const accepted of turn.accepted) expect(matchesReply(turn, accepted)).toBe(true);
        expect(matchesReply(turn, turn.model)).toBe(true);
        expect(matchesReply(turn, turn.reading)).toBe(true);
        expect(matchesReply(turn, "")).toBe(false);
        expect(matchesReply(turn, "wrong answer")).toBe(false);
      }
    }
  });
  it("accepts punctuation, spacing, capitalization and fullwidth Latin", () => {
    expect(normalizeReply(" ＨＡＮＡ, desu！ ")).toBe("hanadesu");
    expect(matchesReply(SPEAKING_LESSONS[0].turns[1], "HANA DESU!")).toBe(true);
  });
});

describe("lesson review safety", () => {
  it("isolates guest and different accounts", () => {
    expect(new Set([learningKey(null), learningKey("a"), learningKey("b")]).size).toBe(3);
  });
  it("starts with introductions and prioritizes overdue lessons", () => {
    expect(recommendedLesson({}, DAY).id).toBe("introductions");
    const progress = completeLesson({}, "introductions", true, 0);
    expect(recommendedLesson(progress, 1).id).toBe("repair");
    expect(recommendedLesson(progress, DAY).id).toBe("introductions");
  });
  it("schedules successive delayed recalls, caps intervals, and does not reward early repeats", () => {
    let progress = completeLesson({}, "introductions", true, 0);
    expect(progress.introductions.interval).toBe(1);
    expect(completeLesson(progress, "introductions", true, 1)).toBe(progress);
    for (const expected of [3, 7, 14, 30, 30]) {
      progress = completeLesson(progress, "introductions", true, progress.introductions.dueAt);
      expect(progress.introductions.interval).toBe(expected);
    }
  });
  it("brings assisted lessons back sooner", () => {
    let progress = completeLesson({}, "introductions", true, 0);
    progress = completeLesson(progress, "introductions", true, DAY);
    progress = completeLesson(progress, "introductions", false, 2 * DAY);
    expect(progress.introductions).toEqual({ completedAt: 2 * DAY, dueAt: 3 * DAY, interval: 1, independent: false });
  });
  it("preserves valid data and discards corrupt, unknown or invalid review entries", () => {
    const valid = completeLesson({}, "introductions", true, 0);
    expect(sanitizeLearning(valid)).toEqual(valid);
    for (const raw of [null, [], "junk", { unknown: valid.introductions }, { introductions: {} }, { introductions: { ...valid.introductions, dueAt: -1 } }, { introductions: { ...valid.introductions, interval: 999 } }, { introductions: { ...valid.introductions, completedAt: Infinity } }]) expect(sanitizeLearning(raw)).toEqual({});
    expect(completeLesson(valid, "unknown", true, DAY)).toBe(valid);
    expect(completeLesson(valid, "repair", true, NaN)).toBe(valid);
  });
});
