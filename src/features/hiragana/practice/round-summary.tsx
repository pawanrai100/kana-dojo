"use client";

import { forwardRef } from "react";
import { Flame, Star, Target, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd, ProgressBar } from "@/components/ui/misc";
import type { GradedRound } from "@/lib/quiz/types";
import { levelInfo, rankTitle } from "@/lib/progress/stats";
import { cn } from "@/lib/utils";

const HEADLINES = ["Keep going, every round counts", "Getting there", "Nice reading", "Flawless brushwork"];

interface Props {
  graded: GradedRound;
  xpAfter: number;
  isBest: boolean;
  nextLabel: string;
  shortcuts: boolean;
  onNext: () => void;
}

export const RoundSummary = forwardRef<HTMLButtonElement, Props>(function RoundSummary(
  { graded, xpAfter, isBest, nextLabel, shortcuts, onNext },
  ref,
) {
  const lvl = levelInfo(xpAfter);
  const before = levelInfo(xpAfter - graded.xpEarned);
  const leveledUp = lvl.level > before.level;
  const total = graded.results.length;

  return (
    <section
      aria-live="polite"
      aria-label="Round results"
      className="animate-pop relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex gap-1" aria-label={`${graded.stars} of 3 stars`}>
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                aria-hidden
                className={cn(
                  "size-7 transition-transform",
                  s <= graded.stars ? "fill-sakura text-sakura animate-stamp" : "text-surface-2",
                )}
                style={{ animationDelay: `${s * 120}ms` }}
              />
            ))}
          </div>
          <h2 className="text-xl font-semibold">{HEADLINES[graded.stars]}</h2>
          <p className="text-sm text-muted">
            You read <strong className="text-foreground">{graded.correctCount}</strong> of {total} correctly
            {isBest && graded.totalPoints > 0 && <span className="ml-2 rounded-full bg-sakura-soft px-2 py-0.5 text-xs text-sakura">New best score</span>}
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-3 text-center sm:gap-6">
          <Stat icon={<Trophy className="size-4" />} label="Score" value={graded.totalPoints.toLocaleString()} />
          <Stat icon={<Target className="size-4" />} label="Accuracy" value={`${Math.round((graded.correctCount / total) * 100)}%`} />
          <Stat icon={<Flame className="size-4" />} label="Best combo" value={`×${graded.maxCombo}`} />
        </dl>
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
            <span className="flex items-center gap-1">
              <Zap className="size-3.5 text-primary" />+{graded.xpEarned} XP
              {leveledUp && <strong className="ml-1 text-primary">Level up! {rankTitle(lvl.level)}</strong>}
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
      <dt className="flex items-center justify-center gap-1 text-xs text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
