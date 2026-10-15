"use client";

import { forwardRef } from "react";
import { Check, Hourglass, Lock, X } from "lucide-react";
import type { AnswerState, GradedQuestion, Question } from "@/lib/quiz/types";
import { comboMultiplier } from "@/lib/game/scoring";
import { cn } from "@/lib/utils";

export type CardState = "pending" | "active" | "locked" | "free";

const DIFF_BARS = { easy: 1, medium: 2, hard: 3 } as const;

interface Props {
  q: Question;
  index: number;
  showNumber: boolean;
  answer: AnswerState;
  state: CardState;
  result?: GradedQuestion;
  timeLeftSec?: number;
  revealDelayMs?: number;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
}

export const QuestionCard = forwardRef<HTMLInputElement, Props>(function QuestionCard(
  { q, index, showNumber, answer, state, result, timeLeftSec, revealDelayMs = 0, onChange, onKeyDown, onFocus },
  ref,
) {
  const graded = !!result;
  const timed = q.timeLimitSec != null;
  const frac = timed && timeLeftSec != null ? Math.max(0, timeLeftSec / q.timeLimitSec!) : 1;
  const missed = new Set(result?.missedIdx ?? []);
  const inputId = `answer-${q.id}`;
  const bars = DIFF_BARS[q.difficulty];

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border bg-surface transition-[border-color,box-shadow,opacity] duration-200",
        !graded && state === "active" && "border-primary shadow-[0_0_0_3px_var(--primary-soft)]",
        !graded && state === "pending" && "border-border opacity-55",
        !graded && (state === "locked" || state === "free") && "border-border",
        graded && "animate-stamp",
        graded && result.correct && "border-good bg-good-soft/50",
        graded && !result.correct && "border-bad bg-bad-soft/50",
      )}
      style={graded ? { animationDelay: `${revealDelayMs}ms` } : undefined}
    >
      <div className="flex items-center justify-between px-4 pt-3 text-xs text-muted">
        <span>{showNumber ? `Question ${index + 1}` : " "}</span>
        <span className="flex items-center gap-2">
          {q.timeLimitSec != null && !graded && (
            <span className="tabular-nums">{state === "active" ? `${Math.ceil(timeLeftSec ?? q.timeLimitSec)}s` : `${q.timeLimitSec}s`}</span>
          )}
          <span className="flex items-end gap-0.5" title={`${q.difficulty} word`}>
            <span className="sr-only">Difficulty: {q.difficulty}</span>
            {[1, 2, 3].map((b) => (
              <span
                key={b}
                aria-hidden
                className={cn("w-1 rounded-full", b <= bars ? "bg-primary" : "bg-surface-2")}
                style={{ height: 4 + b * 3 }}
              />
            ))}
          </span>
        </span>
      </div>

      <div className="px-4 pb-3 pt-2 text-center">
        <p lang="ja" className="font-kana text-5xl tracking-wide sm:text-[3.4rem]" aria-label={`Hiragana: ${q.kana}`}>
          {q.chars.map((k, i) => (
            <span key={i} className={cn(graded && missed.has(i) && "text-bad underline decoration-2 underline-offset-8")}>
              {k}
            </span>
          ))}
        </p>
      </div>

      <div className="px-4 pb-4">
        <label htmlFor={inputId} className="sr-only">
          Reading for question {index + 1}
        </label>
        {!graded ? (
          <div className="relative">
            <input
              ref={ref}
              id={inputId}
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={state === "pending" ? "Up next" : "Type the reading"}
              value={answer.value}
              disabled={state === "pending" || state === "locked"}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={onFocus}
              maxLength={40}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 pr-9 text-center text-lg outline-none transition-colors placeholder:text-sm placeholder:text-muted/70 focus:border-primary disabled:cursor-not-allowed"
            />
            {state === "locked" && (
              <Lock className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-label="Locked in" />
            )}
          </div>
        ) : (
          <div className="space-y-1.5 text-center animate-pop" style={{ animationDelay: `${revealDelayMs + 120}ms` }}>
            <div className="flex items-center justify-center gap-2 text-lg">
              {result.correct ? (
                <Check className="size-5 text-good" aria-label="Correct" />
              ) : (
                <X className="size-5 text-bad" aria-label="Incorrect" />
              )}
              <span className="font-semibold">{q.romaji}</span>
            </div>
            {!result.correct && (
              <p className="text-sm text-muted">
                You typed <span className="text-bad line-through">{result.answer || "nothing"}</span>
                {result.timedOut && (
                  <span className="ml-1 inline-flex items-center gap-1 text-warn">
                    <Hourglass className="size-3" /> time ran out
                  </span>
                )}
              </p>
            )}
            <p className="text-sm">
              {q.kind === "word" ? (
                <span className="text-foreground/80">{q.meaning}</span>
              ) : q.meaning ? (
                <span className="text-foreground/80">Reading practice, and also a real word: {q.meaning}</span>
              ) : (
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">Reading practice</span>
              )}
            </p>
            {result.correct && (
              <p className="text-xs font-medium text-good">
                +{result.points}
                {result.comboAfter > 1 && <span className="ml-1 text-sakura">combo ×{comboMultiplier(result.comboAfter).toFixed(1)}</span>}
              </p>
            )}
          </div>
        )}
      </div>

      {timed && !graded && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-surface-2" aria-hidden>
          <div
            className={cn(
              "h-full transition-[width] duration-100 ease-linear",
              frac > 0.5 ? "bg-primary" : frac > 0.25 ? "bg-sakura" : "bg-bad",
            )}
            style={{ width: `${(state === "active" ? frac : state === "pending" ? 1 : 0) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
});
