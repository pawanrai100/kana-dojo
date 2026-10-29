import { questionPoints, roundStars, xpFromPoints } from "@/lib/game/scoring";
import type { AnswerState, GradedQuestion, GradedRound, Round } from "./types";
import { checkAnswer } from "./validate";

export function emptyAnswer(): AnswerState {
  return { value: "", locked: false, timedOut: false, timeUsedMs: 0 };
}

export function gradeRound(
  round: Round,
  answers: AnswerState[],
  opts: { durationMs: number; skipped?: boolean } = { durationMs: 0 },
): GradedRound {
  let combo = 0;
  let maxCombo = 0;
  const results: GradedQuestion[] = round.questions.map((q, i) => {
    const a = answers[i] ?? emptyAnswer();
    const check = checkAnswer(q.kana, a.value);
    combo = check.correct ? combo + 1 : 0;
    maxCombo = Math.max(maxCombo, combo);
    return {
      question: q,
      answer: a.value,
      correct: check.correct,
      missedChars: check.missedIdx.map((idx) => q.chars[idx]),
      missedIdx: check.missedIdx,
      timedOut: a.timedOut,
      timeUsedMs: a.timeUsedMs,
      comboAfter: combo,
      unanswered: !a.locked && !a.timedOut && !a.value.trim(),
      points: questionPoints({
        difficulty: q.difficulty,
        correct: check.correct,
        combo,
        timeLimitSec: q.timeLimitSec,
        timeUsedMs: a.timeUsedMs,
      }),
    };
  });
  const correctCount = results.filter((r) => r.correct).length;
  const totalPoints = results.reduce((s, r) => s + r.points, 0);
  return {
    round,
    results,
    correctCount,
    totalPoints,
    maxCombo,
    stars: roundStars(correctCount, results.length),
    xpEarned: xpFromPoints(totalPoints, results.length),
    durationMs: opts.durationMs,
    skipped: !!opts.skipped,
  };
}
