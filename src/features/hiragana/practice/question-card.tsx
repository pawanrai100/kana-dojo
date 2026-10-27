"use client";

import { ArrowRight, Check, Hourglass, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnswerState, Difficulty, GradedQuestion, Question } from "@/lib/quiz/types";
import { comboMultiplier } from "@/lib/game/scoring";
import { cn } from "@/lib/utils";

const DIFF_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const DIFF_TONE: Record<Difficulty, string> = {
  easy: "bg-good-soft text-good",
  medium: "bg-primary-soft text-primary",
  hard: "bg-bad-soft text-bad",
};

// long words shrink so they stay on one line, even on a phone
function kanaSize(n: number) {
  if (n <= 3) return "text-7xl sm:text-[6.5rem]";
  if (n <= 5) return "text-[3.4rem] sm:text-[5.5rem]";
  return "text-[2.6rem] sm:text-7xl";
}

const RING_R = 22;
const RING_C = 2 * Math.PI * RING_R;

function TimerRing({ left, limit }: { left: number; limit: number }) {
  const frac = Math.max(0, Math.min(1, left / limit));
  const color = frac > 0.5 ? "var(--primary)" : frac > 0.25 ? "var(--sun-deep)" : "var(--bad)";
  return (
    <span className="flex items-center gap-2 text-lg font-extrabold tabular-nums" style={{ color }} role="timer" aria-label={`${Math.ceil(left)} seconds left`}>
      <svg aria-hidden="true" width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={RING_R} fill="none" stroke="var(--surface-2)" strokeWidth="7" />
        <circle
          cx="26"
          cy="26"
          r={RING_R}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - frac)}
          transform="rotate(-90 26 26)"
          style={{ transition: "stroke-dashoffset 100ms linear" }}
        />
      </svg>
      {Math.ceil(left)}s
    </span>
  );
}

interface ActiveProps {
  q: Question;
  index: number;
  total: number;
  showNumber: boolean;
  answer: AnswerState;
  timeLeftSec?: number;
  timed: boolean;
  inputRef: React.Ref<HTMLInputElement>;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

// the big card in the middle of the deck
export function ActiveCard({ q, index, total, showNumber, answer, timeLeftSec, timed, inputRef, onChange, onKeyDown }: ActiveProps) {
  const inputId = `answer-${q.id}`;
  return (
    <div className="relative mx-auto w-full max-w-[620px] pt-5">
      <div aria-hidden className="absolute inset-x-9 top-0 h-16 rounded-[1.75rem] bg-border" />
      <div aria-hidden className="absolute inset-x-4 top-2.5 h-16 rounded-[1.75rem] bg-surface-2" />
      <article className="animate-deal relative flex flex-col items-center gap-5 rounded-[1.75rem] bg-surface px-5 pb-7 pt-5 shadow-[0_10px_0_var(--border)] sm:px-8">
        <div className="flex w-full items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className={cn("rounded-full px-3 py-1 text-xs font-extrabold", DIFF_TONE[q.difficulty])}>{DIFF_LABEL[q.difficulty]}</span>
            {showNumber && (
              <span className="text-sm font-bold text-muted">
                {index + 1} of {total}
              </span>
            )}
          </span>
          {timed && q.timeLimitSec != null ? (
            <TimerRing left={timeLeftSec ?? q.timeLimitSec} limit={q.timeLimitSec} />
          ) : (
            <span className="h-[52px]" />
          )}
        </div>

        <p lang="ja" className={cn("font-kana break-all text-center", kanaSize(q.chars.length))} aria-label={`Hiragana: ${q.kana}`}>
          {q.kana}
        </p>

        <label htmlFor={inputId} className="sr-only">
          Reading for question {index + 1}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Type the reading"
          value={answer.value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={40}
          className="h-16 w-full rounded-2xl border-[3px] border-primary bg-background px-4 text-center text-2xl font-extrabold outline-none placeholder:text-lg placeholder:font-bold placeholder:text-muted/60 focus:shadow-[0_0_0_5px_var(--primary-soft)]"
        />
      </article>
    </div>
  );
}

// a finished question in the results grid
export function ResultCard({ result, index, showNumber, revealDelayMs = 0 }: { result: GradedQuestion; index: number; showNumber: boolean; revealDelayMs?: number }) {
  const q = result.question;
  const missed = new Set(result.missedIdx);
  return (
    <article
      className={cn(
        "animate-stamp flex flex-col gap-2 rounded-[var(--radius-card)] p-5",
        result.correct ? "bg-good-soft shadow-[0_6px_0_var(--good)]" : "bg-bad-soft shadow-[0_6px_0_var(--bad)]",
      )}
      style={{ animationDelay: `${revealDelayMs}ms` }}
    >
      <div className="flex items-center justify-between text-xs font-bold text-muted">
        <span>{showNumber ? `Question ${index + 1}` : " "}</span>
        {result.correct ? (
          <span className="font-extrabold text-good">
            +{result.points}
            {result.comboAfter > 1 && <span className="ml-1">combo ×{comboMultiplier(result.comboAfter).toFixed(1)}</span>}
          </span>
        ) : result.timedOut ? (
          <span className="flex items-center gap-1 text-warn">
            <Hourglass className="size-3.5" /> time ran out
          </span>
        ) : null}
      </div>
      <p lang="ja" className="font-kana text-4xl" aria-label={`Hiragana: ${q.kana}`}>
        {q.chars.map((k, i) => (
          <span key={i} className={cn(missed.has(i) && "text-bad underline decoration-[3px] underline-offset-[10px]")}>
            {k}
          </span>
        ))}
      </p>
      <p className="flex items-center gap-2 text-lg">
        {result.correct ? <Check className="size-5 text-good" aria-label="Correct" /> : <X className="size-5 text-bad" aria-label="Incorrect" />}
        <span className="font-extrabold">{q.romaji}</span>
      </p>
      {!result.correct && (
        <p className="text-sm text-muted">
          You typed <span className="font-bold text-bad line-through">{result.answer || "nothing"}</span>
        </p>
      )}
      <p className="text-sm">
        {q.kind === "word" ? (
          <span className="font-bold">{q.meaning}</span>
        ) : q.meaning ? (
          <span className="font-bold">Reading practice, and also a real word: {q.meaning}</span>
        ) : (
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-extrabold text-muted">Reading practice</span>
        )}
      </p>
    </article>
  );
}

// shown right after you press enter: right or wrong, the reading and what it means
export function AnswerFeedback({
  q,
  correct,
  missedIdx,
  answer,
  timedOut,
  onNext,
  nextLabel = "Got it",
}: {
  q: Question;
  correct: boolean;
  missedIdx: number[];
  answer: string;
  timedOut: boolean;
  onNext: () => void;
  nextLabel?: string;
}) {
  const missed = new Set(missedIdx);
  return (
    <div className="mx-auto w-full max-w-[620px]">
      <article
        role="status"
        className={cn(
          "animate-stamp flex flex-col items-center gap-3 rounded-[1.75rem] px-6 py-8 text-center",
          correct ? "bg-good-soft shadow-[0_10px_0_var(--good)]" : "animate-shake bg-bad-soft shadow-[0_10px_0_var(--bad)]",
        )}
      >
        <span className={cn("grid size-12 place-items-center rounded-full text-white", correct ? "bg-good" : "bg-bad")}>
          {correct ? <Check className="size-7" aria-label="Correct" /> : <X className="size-7" aria-label="Missed" />}
        </span>
        <p lang="ja" className={cn("font-kana break-all", kanaSize(q.chars.length))}>
          {q.chars.map((k, i) => (
            <span key={i} className={cn(missed.has(i) && !correct && "text-bad underline decoration-4 underline-offset-[12px]")}>
              {k}
            </span>
          ))}
        </p>
        <p className="text-2xl font-extrabold">{q.romaji}</p>
        {!correct && (
          <p className="text-sm text-muted">
            {timedOut && !answer ? (
              "Time ran out."
            ) : (
              <>
                You typed <span className="font-bold text-bad line-through">{answer || "nothing"}</span>
              </>
            )}
          </p>
        )}
        <p className="text-sm font-bold">
          {q.meaning ?? <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-extrabold text-muted">Reading practice</span>}
        </p>
        {!correct && (
          <Button className="mt-2" onClick={onNext} autoFocus>
            {nextLabel} <ArrowRight />
          </Button>
        )}
      </article>
    </div>
  );
}
