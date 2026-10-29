import { Heart } from "lucide-react";
import type { Enemy } from "@/lib/tower/floors";
import { cn } from "@/lib/utils";
import { YokaiArt } from "./yokai-art";

// what the enemy sprite should be doing. n bumps every answer to replay the animation
export interface Fx {
  kind: "hit" | "miss" | null;
  n: number;
}

export function Hearts({ n, max, breaking, fxKey }: { n: number; max: number; breaking: number; fxKey: number }) {
  return (
    <span className="flex gap-1" role="img" aria-label={`${n} of ${max} hearts left`}>
      {Array.from({ length: max }, (_, i) => (
        <Heart
          key={i === breaking ? `b${fxKey}` : i}
          aria-hidden
          className={cn(
            "size-6 transition-transform",
            i < n ? "fill-bad text-bad" : "fill-surface-2 text-border scale-90",
            i === breaking && "animate-heart-break",
          )}
        />
      ))}
    </span>
  );
}

// sparks that burst off the boss when you land a hit
function Sparks() {
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className="animate-spark absolute size-2 rounded-full bg-[#ffe9a8] shadow-[0_0_10px_3px_rgb(255_210_100/0.9)]"
          style={{ "--a": `${i * 36 + (i % 2) * 14}deg`, "--d": `${60 + (i % 3) * 22}px` } as React.CSSProperties}
        />
      ))}
    </span>
  );
}

// golden embers floating up while a beaten boss fades away
function Embers() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {Array.from({ length: 22 }, (_, i) => (
        <span
          key={i}
          className="animate-ember absolute size-1.5 rounded-full bg-[#ffd27a] shadow-[0_0_8px_2px_rgb(255_190_80/0.85)]"
          style={{ left: `${10 + ((i * 37) % 80)}%`, bottom: `${15 + ((i * 23) % 55)}%`, animationDelay: `${(i % 7) * 140}ms`, "--x": `${((i * 29) % 40) - 20}px` } as React.CSSProperties}
        />
      ))}
    </span>
  );
}

// the boss: breathes and looms while idle, gets knocked back when hit,
// winds up and lunges at you when you miss, burns away into embers when beaten
export function Sprite({ enemy, fx, down, rage, className }: { enemy: Enemy; fx?: Fx; down?: boolean; rage?: boolean; className?: string }) {
  const act = down ? "" : fx?.kind === "hit" ? "animate-boss-hit" : fx?.kind === "miss" ? "animate-boss-attack" : "";
  return (
    <div className={cn("relative shrink-0", className)}>
      <div className={cn("size-full origin-bottom", down ? "animate-boss-dissolve" : rage ? "animate-boss-breathe-rage" : "animate-boss-breathe")}>
        <div key={fx?.n ?? 0} className={cn("size-full origin-bottom", act)}>
          <YokaiArt id={enemy.id} className="size-full drop-shadow-[0_4px_0_rgb(0_0_0/0.18)]" />
        </div>
      </div>
      {fx?.kind === "hit" && !down && <Sparks key={`s${fx.n}`} />}
      {down && <Embers />}
      {fx?.kind === "hit" && (
        <span
          key={`d${fx.n}`}
          aria-hidden
          className="animate-dmg pointer-events-none absolute left-1/2 top-0 font-display text-3xl text-sun [-webkit-text-stroke:2px_#1a1d3a] [paint-order:stroke_fill]"
        >
          -1
        </span>
      )}
    </div>
  );
}
