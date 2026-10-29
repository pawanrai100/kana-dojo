"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Cloud, Crown, Layers, Lock, Star, Trophy } from "lucide-react";
import { PageSkeleton } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/misc";
import { beltStatus } from "@/lib/progress/belts";
import type { Progress } from "@/lib/progress/types";
import { ACHIEVEMENTS, currentTitle, earnedIds } from "@/lib/tower/achievements";
import { FINAL_BOSS, SKY_FINAL_BOSS, SKY_ZONES, TOP_FLOOR, ZONES, floorLabel, floorsOf, getFloor, type Floor, type TowerId } from "@/lib/tower/floors";
import { skyOpen } from "@/lib/tower/gate";
import { clearedCount, currentFloor, isCleared, isUnlocked, totalStars } from "@/lib/tower/progress";
import { cn } from "@/lib/utils";
import { useAppState } from "@/store/app-store";
import { BattleView } from "./battle-view";
import { BadgeCard } from "./medal";
import { CardGallery } from "./boss-card";
import { bossCards } from "@/lib/tower/cards";
import { YokaiArt } from "./yokai-art";

const TOWERS: Record<TowerId, { name: string; blurb: string; summit: string; zones: typeof ZONES; final: typeof FINAL_BOSS }> = {
  kana: {
    name: "The Tower",
    blurb: "Climb the basic 46, one row at a time. Each zone ends in a boss room, and the dragon waits at the top.",
    summit: "Dragon's Peak",
    zones: ZONES,
    final: FINAL_BOSS,
  },
  sky: {
    name: "Sky Shrine",
    blurb: "Dakuten, combos and small っ, high above the clouds. The shogun at the top fights with whole sentences.",
    summit: "Sky Throne",
    zones: SKY_ZONES,
    final: SKY_FINAL_BOSS,
  },
};

export function TowerView() {
  const state = useAppState();
  const [playing, setPlaying] = useState<number | null>(null);
  const [tab, setTab] = useState<TowerId | "cards" | null>(null);
  if (!state) return <PageSkeleton />;

  const open = skyOpen(state.progress);
  const unlocked = (id: number) => isUnlocked(state.progress.tower, id, open);
  // once the first tower is done, land on the sky shrine
  const shown: TowerId | "cards" = tab ?? (open && isCleared(state.progress.tower, TOP_FLOOR) ? "sky" : "kana");

  const floor = playing ? getFloor(playing) : undefined;
  if (floor && unlocked(floor.id)) {
    return (
      <BattleView
        key={`${floor.id}-${playing}`}
        floor={floor}
        onExit={() => setPlaying(null)}
        onPlay={(id) => setPlaying(unlocked(id) ? id : null)}
      />
    );
  }
  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Towers" className="inline-flex gap-1 rounded-2xl bg-surface-2 p-1">
        {(["kana", "sky", "cards"] as const).map((id) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={shown === id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-extrabold transition-colors",
              shown === id ? "bg-surface text-primary shadow-[0_3px_0_var(--border)]" : "text-muted hover:text-foreground",
            )}
          >
            {id === "sky" && (open ? <Cloud className="size-4" aria-hidden /> : <Lock className="size-3.5" aria-hidden />)}
            {id === "cards" && <Layers className="size-4" aria-hidden />}
            {id === "cards" ? "Cards" : TOWERS[id].name}
          </button>
        ))}
      </div>
      {shown === "cards" ? (
        <CardGallery cards={bossCards(state.progress.tower)} />
      ) : shown === "sky" && !open ? (
        <SkyGate progress={state.progress} />
      ) : (
        <TowerMap progress={state.progress} tower={shown} unlocked={unlocked} onPlay={setPlaying} />
      )}
      {shown !== "cards" && <Trophies progress={state.progress} />}
    </div>
  );
}

// what it takes to open the sky shrine
function SkyGate({ progress }: { progress: Progress }) {
  const belt = beltStatus(progress);
  const dragon = isCleared(progress.tower, TOP_FLOOR);
  return (
    <Card className="flex flex-col items-center gap-4 p-7 text-center sm:p-9">
      <span className="grid size-16 place-items-center rounded-full bg-primary-soft text-primary">
        <Cloud className="size-8" aria-hidden />
      </span>
      <h1 className="font-display text-3xl">The Sky Shrine is sealed</h1>
      <p className="max-w-md text-muted">{TOWERS.sky.blurb}</p>
      <p className="font-bold">It opens when you do either one:</p>
      <ul className="w-full max-w-sm space-y-2 text-left text-sm">
        <li className="flex items-center gap-3 rounded-2xl bg-surface-2/60 p-3">
          {dragon ? <Check className="size-5 text-good" /> : <Lock className="size-4 text-muted" />}
          Beat {FINAL_BOSS.name} on floor {TOP_FLOOR}
        </li>
        <li className="flex items-center gap-3 rounded-2xl bg-surface-2/60 p-3">
          <Lock className="size-4 text-muted" />
          Earn your Blue belt (master all 46 basic kana). You&apos;re {belt.belt.name.toLowerCase()} now.
        </li>
      </ul>
    </Card>
  );
}

function TowerMap({ progress, tower, unlocked, onPlay }: { progress: Progress; tower: TowerId; unlocked: (id: number) => boolean; onPlay: (id: number) => void }) {
  const t = progress.tower;
  const info = TOWERS[tower];
  const floors = floorsOf(tower);
  const total = floors.length;
  const cleared = clearedCount(t, tower);
  const stars = totalStars(t, tower);
  const current = currentFloor(t, tower);
  const title = currentTitle(progress);
  const currentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center" });
  }, [tower]);

  // top of the tower first, like looking up at it
  const zonesTopDown = [{ id: info.zones.length + 1, name: info.summit }, ...[...info.zones].reverse().map((z) => ({ id: z.id, name: z.name }))];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">{info.name}</h1>
          <p className="mt-1 max-w-prose text-sm text-muted">{info.blurb}</p>
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
            {cleared}/{total}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-muted">Stars</p>
          <p className="text-2xl font-extrabold tabular-nums">
            {stars}/{total * 3}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-muted">Next up</p>
          <p className="truncate text-2xl font-extrabold">{cleared === total ? "Done!" : floorLabel(getFloor(current)!).replace("Sky floor", "Floor")}</p>
        </div>
        <ProgressBar value={cleared / total} label={`${info.name} progress`} className="col-span-3" />
      </Card>

      <ol className="relative space-y-6" aria-label={`${info.name} floors, top to bottom`}>
        {zonesTopDown.map((z) => {
          const zf = floors.filter((f) => f.zone === z.id).reverse();
          return (
            <li key={z.id}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-muted">
                <span className="rounded-full bg-surface px-3 py-1 shadow-[0_3px_0_var(--border)]">{z.id > info.zones.length ? "Summit" : `Zone ${z.id}`}</span>
                {z.name}
              </h2>
              <ol className="space-y-3">
                {zf.map((f) => (
                  <li key={f.id}>
                    <FloorButton
                      f={f}
                      stars={t.floors[f.id]?.stars ?? 0}
                      unlocked={unlocked(f.id)}
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
  const label = `${floorLabel(f)}: ${boss ? `${boss.name} boss` : f.name}. ${unlocked ? (cleared ? `${stars} stars` : "Not cleared yet") : "Locked"}`;
  const number = f.tower === "sky" ? f.id - 100 : f.id;

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
            ? f.tower === "sky"
              ? "bg-[#6a4fd8] text-white shadow-[0_6px_0_#4a33a8]"
              : "bg-bad text-white shadow-[0_6px_0_var(--bad-deep)]"
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
        {boss ? (
          <span className="relative size-12">
            <YokaiArt id={f.enemy.id} className={cn("size-full", !unlocked && "brightness-0 opacity-45")} />
            {!unlocked && <Lock className="absolute inset-0 m-auto size-5 text-white" />}
          </span>
        ) : !unlocked ? (
          <Lock className="size-5" />
        ) : cleared ? (
          <Check className="size-6" />
        ) : (
          number
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className={cn("block text-xs font-bold", boss ? "opacity-80" : "text-muted")}>
          Floor {number}
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
      <p className="text-sm text-muted">Beat bosses for titles. Some badges come from practice, sentences, belts and daily quests.</p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => (
          <BadgeCard key={a.id} a={a} earned={earned.has(a.id)} />
        ))}
      </ul>
      <p className="text-xs text-muted">
        The summit bosses are {FINAL_BOSS.name} and, above the clouds, {SKY_FINAL_BOSS.name}. Good luck.
      </p>
    </section>
  );
}
