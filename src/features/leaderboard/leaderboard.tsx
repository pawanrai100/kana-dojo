"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Crown, EyeOff, Medal as MedalIcon, Trophy } from "lucide-react";
import { PageHeader, PageSkeleton } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BeltIcon, shortName } from "@/features/belts/belt";
import { useAuth } from "@/features/auth/auth-provider";
import { daysLeft, fetchBoard, type BoardResult, type BoardRow } from "@/lib/leaderboard";
import { BELTS } from "@/lib/progress/belts";
import { getSupabase } from "@/lib/supabase/client";
import { cn, plural } from "@/lib/utils";

// loads the board once you're signed in. syncs first so your own score is fresh
function useBoard(enabled: boolean): BoardResult | null {
  const { syncNow } = useAuth();
  const [res, setRes] = useState<BoardResult | null>(null);
  // syncNow is a new function every render, so keep it out of the effect's deps
  const sync = useRef(syncNow);
  useEffect(() => {
    sync.current = syncNow;
  });
  useEffect(() => {
    const sb = getSupabase();
    if (!enabled || !sb) return;
    let live = true;
    void (async () => {
      await sync.current().catch(() => {});
      const r = await fetchBoard(sb);
      if (live) setRes(r);
    })();
    return () => {
      live = false;
    };
  }, [enabled]);
  return res;
}

const PODIUM = ["bg-sun text-sun-ink", "bg-[#d9dee6] text-[#3a4250]", "bg-[#e7a46b] text-[#4a2810]"];

function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) return <span className="grid size-9 shrink-0 place-items-center text-sm font-extrabold text-muted">–</span>;
  return (
    <span
      className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-extrabold tabular-nums", rank <= 3 ? PODIUM[rank - 1] : "text-muted")}
      aria-label={`Rank ${rank}`}
    >
      {rank === 1 ? <Crown className="size-4" aria-hidden /> : rank}
    </span>
  );
}

function Row({ r }: { r: BoardRow }) {
  const belt = BELTS[Math.min(r.belt, BELTS.length - 1)];
  return (
    <li className={cn("flex items-center gap-3 rounded-2xl px-2 py-2", r.is_me && "bg-primary-soft ring-2 ring-primary/30")}>
      <RankBadge rank={r.rank} />
      <span lang="ja" className="font-kana grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-lg" aria-hidden>
        {r.avatar_kana}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-extrabold">
          {r.display_name || r.username}
          {r.is_me && <span className="ml-1.5 text-xs font-bold text-primary">(you)</span>}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <BeltIcon belt={belt} className="h-3.5 w-7" />
          <span className="truncate">
            @{r.username}, {shortName(belt)}
          </span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-display text-lg leading-none tabular-nums">{r.score.toLocaleString()}</span>
        <span className="text-[11px] font-bold text-muted">right</span>
      </span>
    </li>
  );
}

function BoardList({ rows, limit }: { rows: BoardRow[]; limit?: number }) {
  const ranked = rows.filter((r) => r.rank !== null);
  const shown = limit ? ranked.slice(0, limit) : ranked;
  const me = rows.find((r) => r.is_me);
  const meOutside = me && !shown.includes(me);
  if (!ranked.length && !me) return <p className="py-4 text-center text-sm text-muted">Nobody has played yet this week. Be first.</p>;
  return (
    <div className="space-y-2">
      {ranked.length === 0 && <p className="py-2 text-center text-sm text-muted">Nobody is on the board yet this week. Be first.</p>}
      <ol className="space-y-1">
        {shown.map((r) => (
          <Row key={r.username} r={r} />
        ))}
      </ol>
      {meOutside && (
        <>
          {shown.length > 0 && <p className="text-center text-xs font-bold text-muted">· · ·</p>}
          <ol>
            <Row r={me} />
          </ol>
          {me.hidden ? (
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
              <EyeOff className="size-3.5" aria-hidden /> You&apos;re hidden from everyone else.{" "}
              <Link href="/settings" className="font-extrabold text-primary hover:underline">
                Change in Settings
              </Link>
            </p>
          ) : (
            me.score === 0 && <p className="text-center text-xs text-muted">Get a card right this week to join the board.</p>
          )}
        </>
      )}
    </div>
  );
}

function Problem({ reason }: { reason: "not-ready" | "failed" }) {
  return (
    <p className="py-4 text-center text-sm text-muted">
      {reason === "not-ready" ? "The leaderboard isn't switched on yet. Check back soon." : "Couldn't load the leaderboard. Check your connection and try again."}
    </p>
  );
}

const resetsIn = () => `Resets Monday, ${plural(daysLeft(), "day")} left.`;

// small version for the home page
export function LeaderboardCard() {
  const { status } = useAuth();
  const res = useBoard(status === "signed-in");
  if (status === "disabled" || status === "loading") return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5 text-warn" aria-hidden /> This week&apos;s leaderboard
        </CardTitle>
        <CardDescription>Most correct answers this week. {resetsIn()}</CardDescription>
      </CardHeader>
      <CardContent>
        {status === "guest" ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1 basis-48 text-sm text-muted">Sign in and you show up here with everyone else who plays.</p>
            <Button asChild>
              <Link href="/login">Sign in to join</Link>
            </Button>
          </div>
        ) : !res ? (
          <div className="h-32 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" aria-label="Loading leaderboard" />
        ) : !res.ok ? (
          <Problem reason={res.reason} />
        ) : (
          <>
            <BoardList rows={res.rows} limit={5} />
            <Link href="/leaderboard" className="mt-3 inline-block text-sm font-extrabold text-primary hover:underline">
              See the full leaderboard
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function LeaderboardView() {
  const { status } = useAuth();
  const res = useBoard(status === "signed-in");
  if (status === "loading") return <PageSkeleton />;
  return (
    <div>
      <PageHeader title="Leaderboard" description={`Who read the most kana right this week. ${resetsIn()}`} />
      <Card>
        <CardContent className="pt-6">
          {status === "disabled" ? (
            <p className="py-4 text-center text-sm text-muted">Leaderboards need accounts, and accounts aren&apos;t set up on this site.</p>
          ) : status === "guest" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <MedalIcon className="size-10 text-warn" aria-hidden />
              <p className="max-w-sm text-muted">Sign in to see the leaderboard and get your own spot on it. Your progress comes with you.</p>
              <Button asChild size="lg">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          ) : !res ? (
            <div className="h-64 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" aria-label="Loading leaderboard" />
          ) : !res.ok ? (
            <Problem reason={res.reason} />
          ) : (
            <BoardList rows={res.rows} />
          )}
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-xs text-muted">
        Only your name, belt and this week&apos;s score are shown. You can hide yourself in Settings.
      </p>
    </div>
  );
}
