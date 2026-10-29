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

// the enemy: bobs while idle, flinches when hit, lunges when you miss, falls when beaten
export function Sprite({ enemy, fx, down, className }: { enemy: Enemy; fx?: Fx; down?: boolean; className?: string }) {
  const act = down ? "" : fx?.kind === "hit" ? "animate-yokai-hit" : fx?.kind === "miss" ? "animate-yokai-attack" : "";
  return (
    <div className={cn("relative shrink-0", className)}>
      <div className={cn("size-full", down ? "animate-yokai-down" : "animate-yokai-bob")}>
        <div key={fx?.n ?? 0} className={cn("size-full", act)}>
          <YokaiArt id={enemy.id} className="size-full drop-shadow-[0_4px_0_rgb(0_0_0/0.18)]" />
        </div>
      </div>
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

