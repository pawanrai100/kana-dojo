"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Brain, Gauge, Lightbulb, Repeat, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/misc";
import { coachReport, type TroubleSpot } from "@/lib/coach/report";
import { readingOf } from "@/lib/kana/hiragana";
import type { Progress } from "@/lib/progress/types";
import { coachContext } from "@/lib/quiz/adaptive";
import { generateRound } from "@/lib/quiz/generate";
import { emptyAnswer } from "@/lib/quiz/grade";
import { EMPTY_GEN_STATE } from "@/lib/quiz/types";
import { cn } from "@/lib/utils";
import { actions } from "@/store/app-store";

const ICON: Record<TroubleSpot["kind"], React.ReactNode> = {
  confusion: <ArrowLeftRight className="size-4" />,
  habit: <Repeat className="size-4" />,
  slow: <Gauge className="size-4" />,
  shaky: <Target className="size-4" />,
};

// a round of random combos made only from your trouble kana, then on to practice
export function useStartDrill() {
  const router = useRouter();
  return (kana: string[]) => {
    const s = actions.getState();
    const r = generateRound({
      settings: { ...s.settings, mode: "random", enabledChars: kana, questionsPerRound: 10 },
      chars: s.progress.chars,
      words: s.progress.words,
      gen: EMPTY_GEN_STATE,
      coach: coachContext(s.progress),
    });
    if (!r.ok) return;
    actions.saveActive({
      round: { ...r.round, drill: true, notice: undefined },
      answers: r.round.questions.map(emptyAnswer),
      activeIndex: 0,
      startedAt: Date.now(),
    });
    router.push("/practice");
  };
}

function Chips({ kana }: { kana: string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {kana.map((k) => (
        <span key={k} className="flex items-baseline gap-1 rounded-lg bg-surface-2 px-2 py-0.5" title={readingOf(k)}>
          <span lang="ja" className={cn("font-kana text-lg", k.length > 1 && "kana-combo")}>
            {k}
          </span>
          <span className="text-[11px] font-bold text-muted">{readingOf(k)}</span>
        </span>
      ))}
    </span>
  );
}

export function CoachCard({ progress, full = false }: { progress: Progress; full?: boolean }) {
  const report = coachReport(progress);
  const drill = useStartDrill();
  const spots = full ? report.spots : report.spots.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="size-5 text-primary" aria-hidden /> Your trouble spots
        </CardTitle>
        <CardDescription>
          {spots.length
            ? "What you need help with most right now, worked out from what you actually typed."
            : "Play a few rounds and I'll start spotting patterns: kana you mix up, habits like forgetting small っ, and ones you read slowly."}
        </CardDescription>
      </CardHeader>
      {spots.length > 0 && (
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            {spots.map((s) => (
              <li key={s.id} className="rounded-2xl bg-surface-2/60 p-3.5">
                <p className="flex items-center gap-2 font-extrabold">
                  <span className="grid size-7 place-items-center rounded-full bg-primary-soft text-primary">{ICON[s.kind]}</span>
                  <span lang="ja">{s.title}</span>
                </p>
                <p className="mt-1 text-sm text-muted">{s.detail}</p>
                {s.kana.length > 0 && (
                  <div className="mt-2">
                    <Chips kana={s.kana} />
                  </div>
                )}
                {s.tip && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs font-bold text-primary">
                    <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {s.tip}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            {report.drill.length > 0 && (
              <Button onClick={() => drill(report.drill)}>
                <Target /> Fix these
              </Button>
            )}
            {!full && (
              <Link href="/progress#coach" className="text-sm font-extrabold text-primary hover:underline">
                See everything
              </Link>
            )}
          </div>
        </CardContent>
      )}
      {full && report.habits.length > 0 && (
        <CardContent className="border-t-2 border-surface-2 pt-4">
          <p className="mb-3 text-sm font-extrabold">Habits</p>
          <ul className="space-y-2.5">
            {report.habits.map((h) => (
              <li key={h.id} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 font-bold">{h.label}</span>
                <ProgressBar value={h.accuracy} label={`${h.label} accuracy`} className="flex-1" barClassName={h.accuracy < 0.75 ? "bg-bad" : undefined} />
                <span className="w-12 text-right text-xs font-bold tabular-nums text-muted">{Math.round(h.accuracy * 100)}%</span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
