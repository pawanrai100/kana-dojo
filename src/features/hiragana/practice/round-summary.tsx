"use client";

import { forwardRef } from "react";
import { Flame, RotateCcw, Star, Target, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd, ProgressBar } from "@/components/ui/misc";
import type { GradedRound } from "@/lib/quiz/types";
import type { Achievement } from "@/lib/tower/achievements";
import { Medal } from "@/features/tower/medal";
import { levelInfo, rankTitle } from "@/lib/progress/stats";
import { cn } from "@/lib/utils";

const HEADLINES = ["Keep going!", "Getting there!", "Nice reading!", "Brilliant round!"];

interface Props {
  graded: GradedRound;
  xpAfter: number;
  isBest: boolean;
  badges?: Achievement[];
  nextLabel: string;
  shortcuts: boolean;
  onNext: () => void;
}

export const RoundSummary = forwardRef<HTMLButtonElement, Props>(function RoundSummary(
  { graded, xpAfter, isBest, badges = [], nextLabel, shortcuts, onNext },
  ref,
) {
  const lvl = levelInfo(xpAfter);
  const before = levelInfo(xpAfter - graded.xpEarned);
  const leveledUp = lvl.level > before.level;
  const total = graded.results.length;
  // every char you slipped on this round, in the order you met them
  const missed = [...new Set(graded.results.flatMap((r) => (r.correct || r.unanswered ? [] : r.missedChars)))];
  const notReached = graded.results.filter((r) => r.unanswered).length;

  return (
    <section
      aria-live="polite"
      aria-label="Round results"
      className="animate-pop relative overflow-hidden rounded-[var(--radius-card)] bg-surface p-5 shadow-[0_8px_0_var(--border)] sm:p-7"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex gap-1" aria-label={`${graded.stars} of 3 stars`}>
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                aria-hidden
                className={cn(
                  "size-10 transition-transform",
                  s <= graded.stars ? "fill-sun text-sun-deep animate-stamp" : "fill-surface-2 text-surface-2",
                )}
                style={{ animationDelay: `${s * 120}ms` }}
              />
            ))}
          </div>
          <h2 className="font-display text-2xl sm:text-3xl">{graded.correctCount === total ? "Perfect round!" : HEADLINES[graded.stars]}</h2>
          <p className="text-sm text-muted">
            You read <strong className="text-foreground">{graded.correctCount}</strong> of {total} correctly
            {notReached > 0 && <> ({notReached} not reached, those don&apos;t count against you)</>}
            {isBest && graded.totalPoints > 0 && <span className="ml-2 rounded-full bg-sun px-2.5 py-0.5 text-xs font-extrabold text-sun-ink">New best score</span>}
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-3 text-center sm:gap-6">
          <Stat icon={<Trophy className="size-4" />} label="Score" value={graded.totalPoints.toLocaleString()} />
          <Stat icon={<Target className="size-4" />} label="Accuracy" value={`${Math.round((graded.correctCount / total) * 100)}%`} />
          <Stat icon={<Flame className="size-4" />} label="Best combo" value={`×${graded.maxCombo}`} />
        </dl>
      </div>

      {missed.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl bg-sun-soft px-4 py-3 text-sm font-bold text-warn">
          <RotateCcw className="size-4 shrink-0" aria-hidden />
          <span>Coming back next round so you can nail them:</span>
          {missed.map((k) => (
            <span key={k} lang="ja" className="font-kana rounded-lg bg-surface px-2 py-0.5 text-lg text-foreground shadow-[0_2px_0_var(--border)]">
              {k}
            </span>
          ))}
        </div>
      )}

      {badges.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-3">
          {badges.map((b) => (
            <li key={b.id} className="animate-stamp flex items-center gap-3 rounded-2xl bg-sun-soft py-2 pl-2 pr-4">
              <Medal a={b} size={44} />
              <span>
                <span className="block text-sm font-extrabold">New badge: {b.name}</span>
                <span className="block text-xs text-muted">{b.how}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex flex-col gap-4 border-t-2 border-surface-2 pt-5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
            <span className="flex items-center gap-1">
              <Zap className="size-3.5 text-primary" />+{graded.xpEarned} XP
              {leveledUp && <strong className="ml-1 rounded-full bg-sun px-2 py-0.5 text-sun-ink">Level up! {rankTitle(lvl.level)}</strong>}
            </span>
            <span>
              Level {lvl.level}, {lvl.intoLevel}/{lvl.needed}
            </span>
          </div>
          <ProgressBar value={lvl.pct} label="Level progress" />
        </div>
        <div className="flex items-center gap-3">
          {shortcuts && (
            <span className="hidden text-xs text-muted sm:inline">
              <Kbd>Enter</Kbd>
            </span>
          )}
          <Button ref={ref} size="lg" onClick={onNext} className="w-full sm:w-auto">
            {nextLabel}
          </Button>
        </div>
      </div>
    </section>
  );
});

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center justify-center gap-1 text-xs font-bold text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-2xl font-extrabold tabular-nums sm:text-3xl">{value}</dd>
    </div>
  );
}
