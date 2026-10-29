"use client";

import { useEffect, useRef, useState } from "react";
import type { BattleState } from "@/lib/tower/battle";
import { zoneOf, type Floor } from "@/lib/tower/floors";
import { cn } from "@/lib/utils";
import { Hearts, Sprite, type Fx } from "./battle-parts";

// the boss fight: a dark arena with the boss looming over you, a long thin
// health bar along the bottom (damage drains in yellow a beat after the hit),
// claw marks and screen shake when it hits you, and a rage phase at half health

function theme(floor: Floor) {
  if (floor.kind === "final") return { sky: "#120c05", glow: "#ffb02e", fog: "rgb(255 176 46 / 0.18)" };
  if (floor.tower === "sky") return { sky: "#140f2e", glow: "#8b6bff", fog: "rgb(139 107 255 / 0.2)" };
  return { sky: "#1c0b0e", glow: "#ff4b4b", fog: "rgb(255 75 75 / 0.16)" };
}

export function bossTitle(floor: Floor): string {
  if (floor.kind === "final") return floor.tower === "sky" ? "Ruler of the Sky Shrine" : "Master of the Tower";
  return `Guardian of ${zoneOf(floor)?.name ?? "the Tower"}`;
}

export function BossArena({ floor, battle, fx }: { floor: Floor; battle: BattleState; fx: Fx }) {
  const t = theme(floor);
  const hp = battle.enemyHp / battle.maxEnemyHp;
  const raging = battle.status === "fighting" && hp <= 0.5;
  const down = battle.status === "won";

  // show the "enraged" banner once, the moment it crosses half health
  const [rageShown, setRageShown] = useState(false);
  const wasRaging = useRef(false);
  useEffect(() => {
    if (raging && !wasRaging.current) {
      wasRaging.current = true;
      setRageShown(true);
      const id = window.setTimeout(() => setRageShown(false), 2200);
      return () => window.clearTimeout(id);
    }
  }, [raging]);

  return (
    <section
      aria-label={`Boss fight: ${floor.enemy.name}`}
      className={cn(
        "relative mx-auto w-full max-w-[720px] overflow-hidden rounded-[var(--radius-card)] text-white shadow-[0_10px_0_rgb(0_0_0/0.35)]",
        // two copies of the same shake so every hit replays it without rebuilding the arena
        fx.kind === "miss" && (fx.n % 2 ? "animate-screen-shake" : "animate-screen-shake-b"),
      )}
      style={{ background: `radial-gradient(120% 90% at 50% 35%, ${t.glow}33 0%, ${t.sky} 55%, #000 100%)` }}
    >
      {/* fog and a red wash once it's angry */}
      <div aria-hidden className="animate-fog pointer-events-none absolute -inset-x-1/4 bottom-6 h-28 rounded-[50%] blur-2xl" style={{ background: t.fog }} />
      <div aria-hidden className={cn("pointer-events-none absolute inset-0 transition-opacity duration-700", raging ? "opacity-100" : "opacity-0")} style={{ background: "radial-gradient(80% 70% at 50% 40%, rgb(255 0 0 / 0.22), transparent 70%)" }} />

      {/* top: you */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-3 sm:px-5">
        <span className="flex items-center gap-2 rounded-xl bg-black/35 px-2.5 py-1.5 backdrop-blur-sm">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/70">You</span>
          <Hearts n={battle.hearts} max={battle.maxHearts} breaking={fx.kind === "miss" ? battle.hearts : -1} fxKey={fx.n} />
        </span>
        <span className="flex items-center gap-2">
          {raging && <span className="animate-pop rounded-full bg-bad px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest">Enraged</span>}
          {battle.combo >= 2 && (
            <span key={battle.combo} className="animate-pop rounded-full bg-sun px-2.5 py-1 text-xs font-extrabold text-sun-ink">
              Combo ×{battle.combo}
            </span>
          )}
        </span>
      </div>

      {/* the boss */}
      <div className="relative z-0 flex h-52 items-end justify-center sm:h-64">
        <div aria-hidden className="absolute bottom-3 h-6 w-48 rounded-[50%] bg-black/60 blur-md" />
        <div className={cn("relative", raging && !down && "animate-rage")}>
          <Sprite enemy={floor.enemy} fx={fx} down={down} rage={raging} className="size-48 sm:size-60" />
          {fx.kind === "hit" && !down && (
            <span key={`slash-${fx.n}`} aria-hidden className="animate-slash pointer-events-none absolute left-[8%] top-1/2 h-1.5 w-[84%] rounded-full bg-white shadow-[0_0_18px_6px_rgb(255_255_255/0.7)]" />
          )}
        </div>
        {fx.kind === "miss" && (
          // it got you: three claw marks rip across the arena
          <span key={`claw-${fx.n}`} aria-hidden className="pointer-events-none absolute inset-0 z-20">
            <span className="animate-hurt absolute inset-0" style={{ background: "radial-gradient(70% 70% at 50% 50%, transparent 40%, rgb(200 0 0 / 0.55))" }} />
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="animate-claw absolute h-1.5 w-[70%] rounded-full bg-[#ff3b3b] shadow-[0_0_14px_4px_rgb(255_40_40/0.75)]"
                style={{ left: `${12 + i * 7}%`, top: `${14 + i * 16}%`, animationDelay: `${180 + i * 60}ms` }}
              />
            ))}
          </span>
        )}
        {rageShown && (
          <div aria-live="polite" className="animate-banner pointer-events-none absolute inset-x-0 top-1/3 z-20 py-2 text-center" style={{ background: "linear-gradient(90deg, transparent, rgb(150 0 0 / 0.85), transparent)" }}>
            <span className="font-display text-xl tracking-wider sm:text-2xl">{floor.enemy.name.split(",")[0]} is enraged!</span>
          </div>
        )}
      </div>

      {/* bottom: the long thin boss bar */}
      <div className="relative z-10 px-5 pb-4 sm:px-8 sm:pb-5">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="truncate font-display text-base tracking-wide sm:text-lg" style={{ textShadow: "0 2px 0 rgb(0 0 0 / 0.6)" }}>
            {floor.enemy.name}
          </span>
          <span className="shrink-0 text-[11px] font-bold tabular-nums text-white/60">
            {battle.enemyHp}/{battle.maxEnemyHp}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Boss health"
          aria-valuemin={0}
          aria-valuemax={battle.maxEnemyHp}
          aria-valuenow={battle.enemyHp}
          className="relative h-2.5 overflow-hidden rounded-[2px] bg-black/70 ring-1 ring-[#c9a24a]/70"
        >
          {/* yellow trail drains a moment later, so you can see the damage */}
          <div className="absolute inset-y-0 left-0 bg-[#e8b84a] transition-[width] delay-300 duration-700 ease-out" style={{ width: `${hp * 100}%` }} />
          <div className="absolute inset-y-0 left-0 bg-gradient-to-b from-[#d23a2e] to-[#8e1a14] transition-[width] duration-150" style={{ width: `${hp * 100}%` }} />
        </div>
      </div>
    </section>
  );
}

// the cinematic entrance before a boss fight. enter or a click skips it
export function BossEntrance({ floor, onDone }: { floor: Floor; onDone: () => void }) {
  const t = theme(floor);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const finish = () => done.current();
    const id = window.setTimeout(finish, 3000);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", key);
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-label={`${floor.enemy.name} appears`}
      onClick={onDone}
      className="fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center gap-4 px-6 text-center text-white"
      style={{ background: `radial-gradient(70% 60% at 50% 40%, ${t.glow}30, transparent 75%), #000` }}
    >
      <Sprite enemy={floor.enemy} className="animate-boss-rise size-56 sm:size-72" />
      <p className="animate-title-in text-xs font-extrabold uppercase text-white/60" style={{ animationDelay: "700ms" }}>
        {floor.kind === "final" ? "Final boss" : "Boss"}
      </p>
      <h1 className="animate-title-in font-display text-4xl sm:text-6xl" style={{ animationDelay: "900ms", textShadow: `0 0 30px ${t.glow}` }}>
        {floor.enemy.name}
      </h1>
      <div className="animate-line-grow h-px w-64 sm:w-96" style={{ animationDelay: "1200ms", background: `linear-gradient(90deg, transparent, ${t.glow}, transparent)` }} />
      <p className="animate-title-in font-bold text-white/80" style={{ animationDelay: "1300ms" }}>
        {bossTitle(floor)}
      </p>
      <p className="animate-title-in absolute bottom-8 text-xs font-bold text-white/40" style={{ animationDelay: "1800ms" }}>
        Press Enter or tap to skip
      </p>
    </div>
  );
}

// the big words at the end of a boss fight
export function BossFelled({ won, name }: { won: boolean; name: string }) {
  return (
    <div aria-hidden className="animate-felled pointer-events-none fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/85">
      <div className="h-px w-full max-w-3xl" style={{ background: `linear-gradient(90deg, transparent, ${won ? "#e8c96a" : "#c0392b"}, transparent)` }} />
      <p
        className="animate-felled-text font-display text-5xl uppercase tracking-[0.12em] sm:text-7xl"
        style={won ? { color: "#f1d27a", textShadow: "0 0 24px rgb(232 184 74 / 0.7)" } : { color: "#c62f2f", textShadow: "0 0 24px rgb(198 47 47 / 0.7)" }}
      >
        {won ? "Enemy felled" : "You died"}
      </p>
      <p className="text-sm font-bold text-white/70">{won ? `${name} has fallen` : `${name} stands victorious`}</p>
      <div className="h-px w-full max-w-3xl" style={{ background: `linear-gradient(90deg, transparent, ${won ? "#e8c96a" : "#c0392b"}, transparent)` }} />
    </div>
  );
}
