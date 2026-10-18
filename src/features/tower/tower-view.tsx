"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Crown, Lock, Star, Trophy } from "lucide-react";
import { PageSkeleton } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/misc";
import type { Progress } from "@/lib/progress/types";
import { ACHIEVEMENTS, currentTitle, earnedIds } from "@/lib/tower/achievements";
import { FINAL_BOSS, FLOORS, TOP_FLOOR, ZONES, getFloor, type Floor } from "@/lib/tower/floors";
import { clearedCount, currentFloor, isCleared, isUnlocked, totalStars } from "@/lib/tower/progress";
import { cn } from "@/lib/utils";
import { useAppState } from "@/store/app-store";
import { BattleView } from "./battle-view";
import { BadgeCard } from "./medal";

export function TowerView() {
  const state = useAppState();
  const [playing, setPlaying] = useState<number | null>(null);
  if (!state) return <PageSkeleton />;

  const floor = playing ? getFloor(playing) : undefined;
  if (floor && isUnlocked(state.progress.tower, floor.id)) {
    return (
      <BattleView
        key={`${floor.id}-${playing}`}
        floor={floor}
        onExit={() => setPlaying(null)}
        onPlay={(id) => setPlaying(isUnlocked(state.progress.tower, id) ? id : null)}
      />
    );
  }
  return <TowerMap progress={state.progress} onPlay={setPlaying} />;
}

function TowerMap({ progress, onPlay }: { progress: Progress; onPlay: (id: number) => void }) {
  const t = progress.tower;
  const cleared = clearedCount(t);
  const stars = totalStars(t);
  const current = currentFloor(t);
  const title = currentTitle(progress);
  const currentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center" });
  }, []);

  // top of the tower first, like looking up at it
  const zonesTopDown = [
    { id: ZONES.length + 1, name: "Dragon's Peak" },
    ...[...ZONES].reverse().map((z) => ({ id: z.id, name: z.name })),
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">The Tower</h1>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Climb {TOP_FLOOR} floors, one hiragana row at a time. Each zone ends in a boss room, and the dragon waits at the top.
          </p>
        </div>
        {title && (
          <span className="flex items-center gap-1.5 rounded-full bg-sun px-3 py-1.5 text-sm font-extrabold text-sun-ink shadow-[0_3px_0_var(--sun-deep)]">
            <Crown className="size-4" aria-hidden /> {title}
          </span>
        )}
      </section>

      <Card className="grid grid-cols-3 gap-4 p-5">
        <div>
          <p className="text-xs font-bold text-muted">Floors cleared</p>
          <p className="text-2xl font-extrabold tabular-nums">
            {cleared}/{TOP_FLOOR}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-muted">Stars</p>
          <p className="text-2xl font-extrabold tabular-nums">
            {stars}/{TOP_FLOOR * 3}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-muted">Next up</p>
          <p className="truncate text-2xl font-extrabold">{cleared === TOP_FLOOR ? "Done!" : `Floor ${current}`}</p>
        </div>
        <ProgressBar value={cleared / TOP_FLOOR} label="Tower progress" className="col-span-3" />
      </Card>

      <ol className="relative space-y-6" aria-label="Tower floors, top to bottom">
        {zonesTopDown.map((z) => {
          const floors = FLOORS.filter((f) => f.zone === z.id).reverse();
          return (
            <li key={z.id}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-muted">
                <span className="rounded-full bg-surface px-3 py-1 shadow-[0_3px_0_var(--border)]">
                  {z.id > ZONES.length ? "Summit" : `Zone ${z.id}`}
                </span>
                {z.name}
              </h2>
              <ol className="space-y-3">
                {floors.map((f) => (
                  <li key={f.id}>
                    <FloorButton
                      f={f}
                      stars={t.floors[f.id]?.stars ?? 0}
                      unlocked={isUnlocked(t, f.id)}
                      cleared={isCleared(t, f.id)}
                      isCurrent={f.id === current && !isCleared(t, f.id)}
                      buttonRef={f.id === current ? currentRef : undefined}
                      onPlay={() => onPlay(f.id)}
                    />
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ol>

      <Trophies progress={progress} />
    </div>
  );
}

function StarRow({ n, light }: { n: number; light?: boolean }) {
  return (
    <span className="flex gap-0.5" aria-label={`${n} of 3 stars`}>
      {[1, 2, 3].map((s) => (
        <Star key={s} aria-hidden className={cn("size-5", s <= n ? "fill-sun text-sun-deep" : light ? "fill-white/25 text-white/25" : "fill-surface-2 text-surface-2")} />
      ))}
    </span>
  );
}

function FloorButton({
  f,
  stars,
  unlocked,
  cleared,
  isCurrent,
  buttonRef,
  onPlay,
}: {
  f: Floor;
  stars: number;
  unlocked: boolean;
  cleared: boolean;
  isCurrent: boolean;
  buttonRef?: React.Ref<HTMLButtonElement>;
  onPlay: () => void;
}) {
  const boss = f.boss;
  const final = f.kind === "final";
  const label = `Floor ${f.id}: ${boss ? `${boss.name} boss` : f.name}. ${unlocked ? (cleared ? `${stars} stars` : "Not cleared yet") : "Locked"}`;

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={!unlocked}
      onClick={onPlay}
      aria-label={label}
      className={cn(
        "press flex w-full scroll-mt-24 items-center gap-4 rounded-[1.25rem] p-3.5 text-left transition-[filter] disabled:cursor-not-allowed sm:p-4",
        !unlocked && "opacity-55",
        final
          ? "bg-foreground text-background shadow-[0_6px_0_var(--sun-deep)]"
          : boss
            ? "bg-bad text-white shadow-[0_6px_0_var(--bad-deep)]"
            : "bg-surface shadow-[0_5px_0_var(--border)]",
        unlocked && "hover:brightness-[1.03]",
        isCurrent && "ring-4 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-2xl font-extrabold",
          boss ? "size-14 bg-white/15" : "size-12",
          !boss && (cleared ? "bg-good text-white" : unlocked ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted"),
        )}
        aria-hidden
      >
        {!unlocked ? (
          <Lock className="size-5" />
        ) : boss ? (
          <span lang="ja" className="font-display text-lg leading-none">
            {boss.kana}
          </span>
        ) : cleared ? (
          <Check className="size-6" />
        ) : (
          f.id
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className={cn("block text-xs font-bold", boss ? "opacity-80" : "text-muted")}>
          Floor {f.id}
          {final ? ", the summit" : boss ? ", boss room" : ""}
        </span>
        <span className={cn("block truncate font-extrabold", boss ? "font-display text-xl" : "text-lg")}>{boss ? boss.name : f.name}</span>
        {!boss && f.newChars.length > 0 && (
          <span lang="ja" className="font-kana block truncate text-sm tracking-wider text-muted">
            {f.newChars.join(" ")}
          </span>
        )}
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1">
        {unlocked && <StarRow n={stars} light={!!boss} />}
        {isCurrent && <span className="rounded-full bg-sun px-2.5 py-0.5 text-xs font-extrabold text-sun-ink">Next</span>}
      </span>
    </button>
  );
}

function Trophies({ progress }: { progress: Progress }) {
  const earned = earnedIds(progress);
  return (
    <section id="trophies" className="scroll-mt-24 space-y-3">
      <h2 className="flex items-center gap-2 font-display text-2xl">
        <Trophy className="size-6 text-warn" aria-hidden /> Trophy room
        <span className="ml-1 font-sans text-sm font-extrabold text-muted">
          {earned.size}/{ACHIEVEMENTS.length}
        </span>
      </h2>
      <p className="text-sm text-muted">Beat bosses for titles. Some badges come from regular practice too.</p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => (
          <BadgeCard key={a.id} a={a} earned={earned.has(a.id)} />
        ))}
      </ul>
      <p className="text-xs text-muted">The summit boss is {FINAL_BOSS.name}. Good luck.</p>
    </section>
  );
}
