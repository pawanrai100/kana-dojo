"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpenText, Castle, Flame, Lock, Play, RotateCcw, Target, Trophy, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/misc";
import { PageSkeleton } from "@/components/layout/page-header";
import { HIRAGANA_VOCAB } from "@/lib/vocab/hiragana-words";
import { wordsForChars } from "@/lib/quiz/generate";
import { charWeight } from "@/lib/quiz/adaptive";
import { BASIC_KANA_LIST } from "@/lib/kana/hiragana";
import { UPCOMING_MODULES } from "@/lib/modules";
import {
  accuracy,
  currentStreak,
  encounteredChars,
  isMastered,
  masteredChars,
  wordsPracticed,
} from "@/lib/progress/stats";
import type { Progress } from "@/lib/progress/types";
import { cn, plural } from "@/lib/utils";
import { actions, useAppState } from "@/store/app-store";
import { useAuth } from "@/features/auth/auth-provider";
import { SessionList } from "@/features/progress/session-list";
import { TOP_FLOOR, floorLabel, floorsOf, getFloor } from "@/lib/tower/floors";
import { skyOpen } from "@/lib/tower/gate";
import { clearedCount, currentFloor } from "@/lib/tower/progress";
import { CoachCard } from "@/features/coach/coach-card";
import { BeltProgress } from "@/features/belts/belt";
import { beltStatus } from "@/lib/progress/belts";
import { QuestsCard } from "@/features/quests/quests-card";

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
  if (h < 11) return "おはよう! Good morning";
  if (h < 18) return "こんにちは! Welcome back";
  return "こんばんは! Good evening";
}

function DashboardView({ progress, enabled, hasActive }: { progress: Progress; enabled: string[]; hasActive: boolean }) {
  const router = useRouter();
  const auth = useAuth();
  const [preview] = useState(() => pickPreview(progress, enabled));
  const [hello] = useState(greeting);
  const [revealed, setRevealed] = useState(false);

  const mastered = masteredChars(progress).length;
  const seen = encounteredChars(progress).length;
  const acc = accuracy(progress.totalCorrect, progress.totalAnswered);
  const streak = currentStreak(progress);
  const belt = beltStatus(progress);
  const isNew = progress.totalAnswered === 0;

  const start = () => {
    actions.clearActive();
    router.push("/practice");
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 md:grid-cols-[1.25fr_1fr]">
        <div className="flex flex-col justify-center gap-4 rounded-[var(--radius-card)] bg-primary p-6 text-white shadow-[0_8px_0_var(--primary-deep)] sm:p-8">
          <p className="text-sm font-bold text-white/80">{hello}</p>
          <h1 className="font-display text-3xl leading-tight sm:text-[2.6rem]">
            {isNew ? "Read hiragana like a game." : belt.belt.name}
          </h1>
          <p className="max-w-prose font-medium text-white/85">
            {isNew
              ? "Real Japanese words and random kana against the clock. Rounds never end, and the game keeps serving the ones you miss."
              : `${mastered} of 46 basic kana mastered. ${streak > 0 ? `${plural(streak, "day")} in a row.` : "Play today to start a streak."}`}
          </p>
          {!isNew && (
            <BeltProgress status={belt} light className="max-w-sm" />
          )}
          <div className="flex flex-wrap gap-3 pt-1">
            <Button size="lg" variant="sun" onClick={start}>
              <Play /> Start Practice
            </Button>
            <Button size="lg" variant="outline" asChild className="bg-white text-primary ring-0 shadow-[0_5px_0_var(--primary-deep)]">
              <Link href="/practice">
                <RotateCcw /> {hasActive ? "Resume Practice" : "Continue practicing"}
              </Link>
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="press group relative flex min-h-64 flex-col items-center justify-center rounded-[var(--radius-card)] bg-surface p-6 text-center shadow-[0_8px_0_var(--border)] active:shadow-[0_3px_0_var(--border)]"
          aria-label={revealed ? `${preview.kana}: ${preview.romaji}, ${preview.meaning}` : `Try reading ${preview.kana}. Tap to reveal.`}
        >
          <span className="absolute left-5 top-4 rounded-full bg-sun-soft px-3 py-1 text-xs font-extrabold text-warn">Try this one</span>
          <span lang="ja" className="font-kana text-6xl sm:text-7xl">
            {preview.kana}
          </span>
          <span className="mt-4 h-14 text-sm">
            {revealed ? (
              <span className="animate-pop block">
                <strong className="block text-xl font-extrabold text-primary">{preview.romaji}</strong>
                <span className="text-muted">{preview.meaning}</span>
              </span>
            ) : (
              <span className="font-bold text-muted group-hover:text-primary">Tap to flip</span>
            )}
          </span>
        </button>
      </section>

      {auth.status === "guest" && (
        <Link
          href="/signup"
          className="press flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] bg-sun-soft p-5 shadow-[0_6px_0_var(--sun-deep)]"
        >
          <span className="grid size-11 place-items-center rounded-2xl bg-sun text-sun-ink">
            <UserRound className="size-5" />
          </span>
          <span className="min-w-0 flex-1 basis-48">
            <span className="block font-extrabold">Save your progress</span>
            <span className="block text-sm text-muted">Free account. Your streak and stats follow you to every device.</span>
          </span>
          <span className="font-extrabold text-primary max-sm:basis-full max-sm:pl-[3.75rem]">Create account</span>
        </Link>
      )}

      <section aria-label="Your stats" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<Target />} tone="bg-primary-soft text-primary" label="Mastered" value={`${mastered}/46`} sub={`${seen} of 46 seen`} />
        <Stat icon={<BookOpenText />} tone="bg-good-soft text-good" label="Words practiced" value={String(wordsPracticed(progress))} sub={plural(progress.totalAnswered, "answer")} />
        <Stat icon={<Trophy />} tone="bg-sun-soft text-warn" label="Accuracy" value={progress.totalAnswered ? `${Math.round(acc * 100)}%` : "No data"} sub={plural(progress.roundsCompleted, "round")} />
        <Stat icon={<Flame />} tone="bg-bad-soft text-bad" label="Streak" value={plural(streak, "day")} sub={`Best ${plural(progress.bestStreak, "day")}`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent sessions</CardTitle>
            <CardDescription>Rounds within 30 minutes of each other count as one session.</CardDescription>
          </CardHeader>
          <CardContent>
            <SessionList sessions={progress.sessions.slice(-5).reverse()} empty="Play a round and it shows up here." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your hiragana</CardTitle>
            <CardDescription>Blue means mastered: right in 3 separate rounds.</CardDescription>
          </CardHeader>
          <CardContent>
            <MiniKanaGrid progress={progress} />
            <Link href="/chart" className="mt-4 inline-block text-sm font-extrabold text-primary hover:underline">
              Open the full chart
            </Link>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <QuestsCard progress={progress} />
        <CoachCard progress={progress} />
      </div>

      <TowerCard progress={progress} />

      <section aria-label="Coming next">
        <h2 className="mb-3 text-sm font-extrabold text-muted">Coming next</h2>
        <ul className="flex flex-wrap gap-2">
          {UPCOMING_MODULES.map((m) => (
            <li key={m.id} className="flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-bold text-muted shadow-[0_3px_0_var(--border)]">
              <m.icon className="size-4" aria-hidden />
              {m.label}
              <Lock className="size-3.5 opacity-60" aria-label="Coming soon" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ icon, tone, label, value, sub }: { icon: React.ReactNode; tone: string; label: string; value: string; sub: string }) {
  return (
    <Card className="flex items-center gap-3 p-4 sm:p-5">
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl [&_svg]:size-5", tone)} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-muted">{label}</p>
        <p className="truncate text-xl font-extrabold tabular-nums sm:text-2xl">{value}</p>
        <p className="truncate text-xs text-muted">{sub}</p>
      </div>
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
              "font-kana grid aspect-square place-items-center rounded-lg text-sm",
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

function TowerCard({ progress }: { progress: Progress }) {
  const t = progress.tower;
  // after the dragon, this card follows the sky shrine instead
  const sky = skyOpen(progress) && clearedCount(t) === TOP_FLOOR;
  const tower = sky ? "sky" : "kana";
  const total = floorsOf(tower).length;
  const cleared = clearedCount(t, tower);
  const next = getFloor(currentFloor(t, tower))!;
  const done = cleared === total;
  return (
    <Link
      href="/tower"
      className="press flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] bg-foreground p-5 text-background shadow-[0_6px_0_var(--sun-deep)] sm:p-6"
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-sun text-sun-ink" aria-hidden>
        <Castle className="size-7" />
      </span>
      <span className="min-w-0 flex-1 basis-56">
        <span className="font-display block text-xl">{sky ? "Sky Shrine" : "The Tower"}</span>
        <span className="block text-sm opacity-80">
          {done
            ? sky
              ? "You beat the shogun. Go back for 3 stars on every floor."
              : "You beat the dragon. Go back for 3 stars on every floor."
            : next.boss
              ? `${floorLabel(next)}: boss room. ${next.boss.name} is waiting.`
              : `${floorLabel(next)}: ${next.name}. ${cleared} of ${total} floors cleared.`}
        </span>
        <ProgressBar value={cleared / total} label="Tower progress" className="mt-3 max-w-sm bg-white/15" barClassName="bg-sun" />
      </span>
      <span className="rounded-2xl bg-sun px-5 py-3 font-extrabold text-sun-ink shadow-[0_4px_0_var(--sun-deep)]">{cleared ? "Keep climbing" : "Enter"}</span>
    </Link>
  );
}
