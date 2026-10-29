"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/misc";
import { PageHeader, PageSkeleton } from "@/components/layout/page-header";
import { ALL_KANA_LIST, BASIC_KANA_LIST, KANA_GROUPS, readingOf } from "@/lib/kana/hiragana";
import { HIRAGANA_VOCAB } from "@/lib/vocab/hiragana-words";
import {
  accuracy,
  charAccuracy,
  currentStreak,
  streakInfo,
  dayKey,
  difficultWords,
  encounteredChars,
  isMastered,
  masteredChars,
  weakChars,
  wordsLearned,
  wordsPracticed,
} from "@/lib/progress/stats";
import type { Progress } from "@/lib/progress/types";
import { cn, pct, plural } from "@/lib/utils";
import { useAppState } from "@/store/app-store";
import { BarChart, LineChart } from "./charts";
import { SessionList } from "./session-list";
import { CoachCard } from "@/features/coach/coach-card";
import { BeltLadder, BeltProgress, shortName } from "@/features/belts/belt";
import { beltStatus } from "@/lib/progress/belts";

// dakuten, combos and small っ, counted apart from the basic 46
const EXTRAS = ALL_KANA_LIST.filter((k) => !BASIC_KANA_LIST.includes(k));

const VOCAB = new Map(HIRAGANA_VOCAB.map((w) => [w.id, w]));

export function ProgressView() {
  const state = useAppState();
  if (!state) return <PageSkeleton />;
  return <ProgressBody p={state.progress} />;
}

function ProgressBody({ p }: { p: Progress }) {
  const acc = accuracy(p.totalCorrect, p.totalAnswered);
  const mastered = masteredChars(p);
  const encountered = encounteredChars(p);
  const extrasSeen = encounteredChars(p, EXTRAS).length;
  const extrasMastered = masteredChars(p, EXTRAS).length;
  const belt = beltStatus(p);

  // rolling 5-round accuracy smooths out noisy rounds
  const rounds = p.roundLog.slice(-40);
  const accSeries = rounds.map((r, i) => {
    const win = rounds.slice(Math.max(0, i - 4), i + 1);
    const c = win.reduce((s, x) => s + x.correct, 0);
    const a = win.reduce((s, x) => s + x.answered, 0);
    return {
      label: new Date(r.at).toLocaleDateString([], { month: "short", day: "numeric" }),
      value: a ? c / a : 0,
      detail: `this round ${r.correct}/${r.answered}`,
    };
  });

  const masterySeries = rounds.map((r) => ({
    label: new Date(r.at).toLocaleDateString([], { month: "short", day: "numeric" }),
    value: r.mastered,
    detail: `${r.points} points`,
  }));

  const speedSeries = rounds
    .filter((r) => r.avgMs > 0)
    .map((r) => ({
      label: new Date(r.at).toLocaleDateString([], { month: "short", day: "numeric" }),
      value: r.avgMs / 1000,
      detail: `${r.correct}/${r.answered} correct`,
    }));

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = dayKey(d.getTime());
    const s = p.days[key];
    return {
      label: d.toLocaleDateString([], { month: "short", day: "numeric" }),
      value: s?.answered ?? 0,
      detail: s ? `${pct(accuracy(s.correct, s.answered))} accuracy` : "no practice",
    };
  });

  const weak = weakChars(p, 8);
  const hard = difficultWords(p, 8);

  return (
    <div className="space-y-6">
      <PageHeader title="Progress & statistics" description="Everything is saved in this browser. Charts fill in as you play more rounds." />

      <section aria-label="Totals" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Tile label="Overall accuracy" value={p.totalAnswered ? pct(acc) : "No data"} sub={`${p.totalCorrect}/${p.totalAnswered} correct`} />
        <Tile label="Rounds completed" value={String(p.roundsCompleted)} sub={`${plural(p.sessions.length, "session")}, ${p.roundsSkipped} skipped`} />
        <Tile label="Current streak" value={plural(currentStreak(p), "day")} sub={`Best ${plural(p.bestStreak, "day")}, ${plural(streakInfo(p).freezes, "freeze")}`} />
        <Tile label="Belt" value={shortName(belt.belt)} sub={belt.needsReview ? "needs review" : belt.next ? `next: ${shortName(belt.next)}` : "top rank"} />
        <Tile
          label="Characters seen"
          value={`${encountered.length}/46`}
          sub={extrasSeen ? `+${extrasSeen} of ${EXTRAS.length} extras` : encountered.length === 46 ? "Full coverage" : `${46 - encountered.length} still to meet`}
        />
        <Tile label="Characters mastered" value={`${mastered.length}/46`} sub={extrasMastered ? `+${extrasMastered} extras mastered` : "3+ rounds, recent reads right"} />
        <Tile label="Real words learned" value={String(wordsLearned(p))} sub={`${plural(wordsPracticed(p), "word")} practiced`} />
        <Tile label="Best combo" value={`×${p.bestCombo}`} sub={`Best round ${p.bestRoundPoints.toLocaleString()} pts`} />
      </section>

      <Card id="belts" className="scroll-mt-24">
        <CardHeader>
          <CardTitle>Belts</CardTitle>
          <CardDescription>Earned by what you can actually read, not by how long you play. Once earned, a belt is yours to keep.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <BeltProgress status={belt} />
          <BeltLadder progress={p} />
        </CardContent>
      </Card>

      <div id="coach" className="scroll-mt-24">
        <CoachCard progress={p} full />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Accuracy over time</CardTitle>
            <CardDescription>Rolling average over your last 5 rounds.</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              data={accSeries}
              max={1}
              format={(v) => pct(v)}
              ariaLabel="Line chart of rolling accuracy per round"
              emptyText="Finish two rounds to see your accuracy trend."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Hiragana mastery</CardTitle>
            <CardDescription>Characters mastered after each round.</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              data={masterySeries}
              max={46}
              ariaLabel="Line chart of characters mastered after each round"
              emptyText="Mastery builds over several rounds. Keep playing."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Reading speed</CardTitle>
            <CardDescription>Average seconds per answer in timed rounds. Lower is faster.</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              data={speedSeries}
              format={(v) => `${v.toFixed(1)}s`}
              ariaLabel="Line chart of average seconds per answer"
              emptyText="Play two timed rounds to see your speed improve."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last 14 days</CardTitle>
            <CardDescription>Questions answered per day.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={days} ariaLabel="Bar chart of questions answered per day" emptyText="No practice in the last two weeks yet." />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mastery map</CardTitle>
          <CardDescription>Darker means more confident. Hover or focus a character for its accuracy.</CardDescription>
        </CardHeader>
        <CardContent>
          {KANA_GROUPS.filter((g) => g.id === "basic" || g.chars.some((k) => p.chars[k]?.seen)).map((g) => (
            <div key={g.id} className="mb-4">
              {g.id !== "basic" && (
                <p lang="ja" className="mb-2 text-xs font-extrabold text-muted">
                  {g.label}
                </p>
              )}
          <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12 lg:grid-cols-[repeat(16,minmax(0,1fr))]">
            {g.chars.map((k) => {
              const s = p.chars[k];
              const m = isMastered(s);
              const a = charAccuracy(s);
              const label = !s?.seen ? "not seen yet" : m ? `mastered, ${pct(a)}` : `${pct(a)} over ${s.seen} reads`;
              return (
                <div
                  key={k}
                  tabIndex={0}
                  title={`${k} (${readingOf(k)}): ${label}`}
                  aria-label={`${k} ${readingOf(k)}: ${label}`}
                  className={cn(
                    "font-kana grid aspect-square place-items-center rounded-lg",
                    k.length > 1 ? "text-sm sm:text-base" : "text-lg",
                    !s?.seen && "bg-surface-2 text-muted",
                    s?.seen && !m && a < 0.6 && "bg-primary-soft text-primary",
                    s?.seen && !m && a >= 0.6 && "bg-primary/45 text-primary-foreground",
                    m && "bg-primary text-primary-foreground",
                  )}
                >
                  {k}
                </div>
              );
            })}
          </div>
            </div>
          ))}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
            <Legend className="bg-surface-2" text="Not seen" />
            <Legend className="bg-primary-soft" text="Under 60%" />
            <Legend className="bg-primary/45" text="Practicing" />
            <Legend className="bg-primary" text="Mastered" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weak characters</CardTitle>
            <CardDescription>These show up more often in your rounds until they improve.</CardDescription>
          </CardHeader>
          <CardContent>
            {weak.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No weak spots yet. Misread characters will appear here.</p>
            ) : (
              <ul className="space-y-3">
                {weak.map((w) => (
                  <li key={w.kana} className="flex items-center gap-3">
                    <span lang="ja" className="font-kana w-8 text-2xl">{w.kana}</span>
                    <span className="w-9 text-xs text-muted">{readingOf(w.kana)}</span>
                    <ProgressBar value={w.accuracy} label={`${w.kana} accuracy`} className="flex-1" barClassName="bg-bad" />
                    <span className="w-24 text-right text-xs text-muted">
                      {pct(w.accuracy)}, {w.misses} missed
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Most difficult words</CardTitle>
            <CardDescription>Real words you have misread the most.</CardDescription>
          </CardHeader>
          <CardContent>
            {hard.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Nothing tricky yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {hard.map((h) => {
                  const w = VOCAB.get(h.id);
                  return (
                    <li key={h.id} className="flex items-baseline gap-3 py-2.5">
                      <span lang="ja" className="font-kana text-xl">{h.id}</span>
                      <span className="text-sm">{w?.romaji}</span>
                      <span className="truncate text-sm text-muted">{w?.meaning}</span>
                      <span className="ml-auto shrink-0 text-xs text-bad">
                        {h.misses}/{h.seen} missed
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionList sessions={p.sessions.slice(-12).reverse()} empty="No sessions yet." />
          {p.totalAnswered === 0 && (
            <Link href="/practice" className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline">
              Play your first round
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </Card>
  );
}

function Legend({ className, text }: { className: string; text: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded", className)} />
      {text}
    </span>
  );
}
