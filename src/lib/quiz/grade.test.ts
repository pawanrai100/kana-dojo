import { describe, expect, it } from "vitest";
import { emptyAnswer, gradeRound, roundAccuracy } from "./grade";
import type { AnswerState, Round } from "./types";
import { applyGradedRound } from "@/lib/progress/update";
import { emptyProgress } from "@/lib/progress/types";

const round: Round = {
  id: "partial-regression", mode: "words", createdAt: 0,
  questions: Array.from({ length: 10 }, (_, i) => ({ id: String(i), kind: "word", kana: "ねこ", romaji: "neko", chars: ["ね", "こ"], difficulty: "easy", timeLimitSec: null })),
};
const answer = (value: string, timedOut = false): AnswerState => ({ value, locked: true, timedOut, timeUsedMs: 1000 });

describe("partial round accuracy regression", () => {
  it("matches persisted stats and excludes eight unreached questions", () => {
    const graded = gradeRound(round, [answer("neko"), answer("nako"), ...Array.from({ length: 8 }, emptyAnswer)]);
    expect(graded.correctCount).toBe(1);
    expect(roundAccuracy(graded)).toBe(0.5);
    expect(graded.results.filter((r) => r.unanswered)).toHaveLength(8);
    const p = emptyProgress();
    const updated = applyGradedRound(p, graded, p.gen, 1000);
    expect(updated.totalAnswered).toBe(2);
    expect(updated.totalCorrect / updated.totalAnswered).toBe(roundAccuracy(graded));
    // Leaving early never earns a perfect-round reward.
    expect(graded.stars).not.toBe(3);
  });
  it("includes timeouts and blank submitted answers, but never divides by zero", () => {
    expect(roundAccuracy(gradeRound(round, []))).toBe(0);
    const graded = gradeRound(round, [answer("neko"), answer("", true), answer("")]);
    expect(roundAccuracy(graded)).toBeCloseTo(1 / 3);
    expect(graded.results[1].unanswered).toBe(false);
    expect(graded.results[2].unanswered).toBe(false);
  });
  it("counts an unlocked typed answer as attempted when ending early", () => {
    const graded = gradeRound(round, [{ ...emptyAnswer(), value: "neko" }]);
    expect(roundAccuracy(graded)).toBe(1);
  });
});
