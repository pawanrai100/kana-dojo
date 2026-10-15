"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Flame, Play, RotateCcw, Target, BookOpenText, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/misc";
import { PageSkeleton } from "@/components/layout/page-header";
import { HIRAGANA_VOCAB } from "@/lib/vocab/hiragana-words";
import { wordsForChars } from "@/lib/quiz/generate";
import { charWeight } from "@/lib/quiz/adaptive";
import {
  accuracy,
  currentStreak,
  encounteredChars,
  levelInfo,
  masteredChars,
  rankTitle,
  wordsPracticed,
} from "@/lib/progress/stats";
import type { Progress } from "@/lib/progress/types";
import { BASIC_KANA_LIST } from "@/lib/kana/hiragana";
import { isMastered } from "@/lib/progress/stats";
import { cn, plural } from "@/lib/utils";
import { actions, useAppState } from "@/store/app-store";
import { SessionList } from "@/features/progress/session-list";

// a word from the learner's pool that leans on their weakest chars
function pickPreview(p: Progress, enabled: string[]) {
  const pool = wordsForChars(enabled);
  const list = pool.length ? pool : HIRAGANA_VOCAB;
  let best = list[0];
  let bestScore = -1;
  for (const w of list) {
    const ks = Array.from(w.kana);
    const s = ks.reduce((n, k) => n + charWeight(p.chars[k], k), 0) / ks.length + Math.random() * 0.8;
    if (s > bestScore) {
      best = w;
      bestScore = s;
    }
  }
  return best;
}

export function Dashboard() {
  const state = useAppState();
  if (!state) return <PageSkeleton />;
  return <DashboardView progress={state.progress} enabled={state.settings.enabledChars} hasActive={!!state.active} />;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "おはよう, good morning";
  if (h < 18) return "こんにちは, welcome back";
  return "こんばんは, good evening";
}

function DashboardView({ progress, enabled, hasActive }: { progress: Progress; enabled: string[]; hasActive: boolean }) {
  const router = useRouter();
  const [preview] = useState(() => pickPreview(progress, enabled));
  const [hello] = useState(greeting);
  const [revealed, setRevealed] = useState(false);

  const mastered = masteredChars(progress).length;
  const seen = encounteredChars(progress).length;
  const acc = accuracy(progress.totalCorrect, progress.totalAnswered);
  const streak = currentStreak(progress);
  const lvl = levelInfo(progress.xp);
  const isNew = progress.totalAnswered === 0;

  const start = () => {
    actions.clearActive();
    router.push("/practice");
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card sm:p-8 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div className="space-y-4">
          <p className="text-sm text-muted">{hello}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {isNew ? "Learn to read hiragana, one word at a time." : `${rankTitle(lvl.level)}, level ${lvl.level}`}
          </h1>
          <p className="max-w-prose text-muted">
            {isNew
              ? "Read real Japanese words and random kana against the clock. Rounds never end, and the game leans on whatever you find hardest."
              : `${mastered} of 46 characters mastered so far. ${streak > 0 ? `You're on a ${streak} day streak.` : "Practice today to start a streak."}`}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button size="lg" onClick={start}>
              <Play /> Start Practice
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/practice" aria-disabled={!hasActive}>
                <RotateCcw /> {hasActive ? "Resume Practice" : "Continue practicing"}
              </Link>
            </Button>
          </div>
          {!isNew && (
            <div className="max-w-sm pt-2">
              <div className="mb-1.5 flex justify-between text-xs text-muted">
                <span>Level {lvl.level}</span>
                <span>
                  {lvl.intoLevel}/{lvl.needed} XP
                </span>
              </div>
              <ProgressBar value={lvl.pct} label="Level progress" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="group relative flex aspect-[4/3] flex-col items-center justify-center rounded-2xl bg-primary-soft p-6 text-center transition-transform active:scale-[0.99]"
          aria-label={revealed ? `${preview.kana}: ${preview.romaji}, ${preview.meaning}` : `Try reading ${preview.kana}. Click to reveal.`}
        >
          <span className="absolute left-4 top-3 text-xs text-primary/80">Try this one</span>
          <span lang="ja" className="font-kana text-6xl text-primary sm:text-7xl">
            {preview.kana}
          </span>
          <span className="mt-4 h-12 text-sm">
            {revealed ? (
              <span className="animate-pop block">
                <strong className="block text-lg text-foreground">{preview.romaji}</strong>
                <span className="text-muted">{preview.meaning}</span>
              </span>
            ) : (
              <span className="text-primary/80 group-hover:underline">Tap to check your reading</span>
            )}
          </span>
        </button>
      </section>

      <section aria-label="Your stats" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Target className="size-4" />} label="Characters mastered" value={`${mastered}/46`}>
          <ProgressBar value={mastered / 46} label="Characters mastered" className="mt-3" />
          <p className="mt-2 text-xs text-muted">{seen} of 46 seen in practice</p>
        </StatCard>
        <StatCard icon={<BookOpenText className="size-4" />} label="Words practiced" value={wordsPracticed(progress).toString()}>
          <p className="mt-2 text-xs text-muted">{progress.totalAnswered} questions answered</p>
        </StatCard>
        <StatCard icon={<Clock3 className="size-4" />} label="Quiz accuracy" value={progress.totalAnswered ? `${Math.round(acc * 100)}%` : "No data"}>
          <p className="mt-2 text-xs text-muted">{progress.roundsCompleted} rounds completed</p>
        </StatCard>
        <StatCard icon={<Flame className="size-4" />} label="Practice streak" value={plural(streak, "day")} accent>
          <p className="mt-2 text-xs text-muted">Best: {plural(progress.bestStreak, "day")}</p>
        </StatCard>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
            <CardDescription>Rounds played within 30 minutes of each other count as one session.</CardDescription>
          </CardHeader>
          <CardContent>
            <SessionList sessions={progress.sessions.slice(-5).reverse()} empty="Your sessions will show up here after your first round." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Hiragana progress</CardTitle>
            <CardDescription>Mastery needs correct reads across 3 separate rounds.</CardDescription>
          </CardHeader>
          <CardContent>
            <MiniKanaGrid progress={progress} />
            <Link href="/chart" className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline">
              Open the full chart
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <p className={accent ? "flex items-center gap-1.5 text-sm text-sakura" : "flex items-center gap-1.5 text-sm text-muted"}>
        {icon}
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
      {children}
    </Card>
  );
}

function MiniKanaGrid({ progress }: { progress: Progress }) {
  return (
    <div className="grid grid-cols-10 gap-1" role="list" aria-label="Character status">
      {BASIC_KANA_LIST.map((k) => {
        const s = progress.chars[k];
        const m = isMastered(s);
        return (
          <span
            role="listitem"
            key={k}
            lang="ja"
            title={m ? `${k} mastered` : s?.seen ? `${k} practicing` : `${k} not seen yet`}
            className={cn(
              "font-kana grid aspect-square place-items-center rounded-md text-sm",
              m ? "bg-primary text-primary-foreground" : s?.seen ? "bg-primary-soft text-primary" : "bg-surface-2 text-muted",
            )}
          >
            {k}
          </span>
        );
      })}
    </div>
  );
}
