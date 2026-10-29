import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { ProgressBar } from "@/components/ui/misc";
import { BELTS, beltStatus, type Belt, type BeltStatus } from "@/lib/progress/belts";
import type { Progress } from "@/lib/progress/types";
import { cn } from "@/lib/utils";

// a little tied belt: band, knot, two tails. dan ranks get gold stripes
export function BeltIcon({ belt, className, review = false }: { belt: Belt; className?: string; review?: boolean }) {
  const edge = belt.id === "white" ? "#c9c4b4" : "rgb(0 0 0 / 0.25)";
  return (
    <svg viewBox="0 0 56 30" className={cn("shrink-0", className)} aria-hidden>
      <rect x="1" y="7" width="54" height="9" rx="3" fill={belt.color} stroke={edge} strokeWidth="1.5" />
      <path d="M24 14 L17 28 L22 28 L27 16 Z" fill={belt.color} stroke={edge} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M32 14 L39 28 L34 28 L29 16 Z" fill={belt.color} stroke={edge} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="22" y="4" width="12" height="14" rx="3" fill={belt.color} stroke={edge} strokeWidth="1.5" />
      {Array.from({ length: belt.stripes ?? 0 }, (_, i) => (
        <rect key={i} x={44 - i * 4} y="7.75" width="2.4" height="7.5" fill="#ffd23f" />
      ))}
      {review && <circle cx="50" cy="5" r="4" fill="#e5484d" stroke="#fff" strokeWidth="1.5" />}
    </svg>
  );
}

export const shortName = (b: Belt) => (b.stripes ? `${b.stripes}${["st", "nd", "rd"][b.stripes - 1]} dan` : b.name.replace(" belt", ""));

// header chip: your belt, links to the full ladder
export function BeltChip({ progress }: { progress: Progress }) {
  const s = beltStatus(progress);
  return (
    <Link
      href="/progress#belts"
      className="hidden items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-sm font-extrabold shadow-[0_3px_0_var(--border)] hover:brightness-95 sm:flex"
      aria-label={`${s.belt.name}${s.needsReview ? ", needs review" : ""}. See all belts`}
    >
      <BeltIcon belt={s.belt} review={s.needsReview} className="h-5 w-9" />
      {shortName(s.belt)}
    </Link>
  );
}

// belt name plus what's left for the next one
export function BeltProgress({ status, light = false, className }: { status: BeltStatus; light?: boolean; className?: string }) {
  const { belt, next, nextStep, needsReview } = status;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-3 text-xs font-bold">
        <span className="flex items-center gap-2">
          <BeltIcon belt={belt} review={needsReview} className="h-5 w-9" />
          {belt.name}
        </span>
        {next && nextStep && (
          <span className={cn("text-right", light ? "opacity-80" : "text-muted")}>
            {nextStep.have}/{nextStep.need} to {shortName(next)}
          </span>
        )}
      </div>
      {next && nextStep ? (
        <>
          <ProgressBar value={nextStep.have / nextStep.need} label={`Progress to ${next.name}`} className={light ? "bg-white/20" : undefined} barClassName={light ? "bg-sun" : undefined} />
          <p className={cn("text-xs", light ? "opacity-80" : "text-muted")}>{needsReview ? "Some of your kana have slipped. Practise them to clear the review stripe." : nextStep.label}</p>
        </>
      ) : (
        <p className={cn("text-xs", light ? "opacity-80" : "text-muted")}>Top rank. Nothing left but to keep it sharp.</p>
      )}
    </div>
  );
}

// every belt, with what earns it and where you are
export function BeltLadder({ progress }: { progress: Progress }) {
  const s = beltStatus(progress);
  return (
    <ol className="space-y-2">
      {BELTS.map((b, i) => {
        const earned = i <= s.index;
        const current = i === s.index;
        return (
          <li
            key={b.id}
            className={cn(
              "flex items-center gap-3 rounded-2xl p-3",
              current ? "bg-primary-soft ring-2 ring-primary" : earned ? "bg-surface-2/60" : "bg-surface-2/30 opacity-70",
            )}
          >
            <BeltIcon belt={b} review={current && s.needsReview} className="h-7 w-12" />
            <div className="min-w-0 flex-1">
              <p className="font-extrabold">{b.name}</p>
              <p className="text-xs text-muted">{b.goal}</p>
            </div>
            {earned ? <Check className="size-5 text-good" aria-label="Earned" /> : <Lock className="size-4 text-muted" aria-label="Not earned yet" />}
          </li>
        );
      })}
    </ol>
  );
}

// the big moment after a round
export function BeltPromotion({ belt }: { belt: Belt }) {
  return (
    <div role="status" className="animate-stamp flex items-center gap-4 rounded-2xl p-4" style={{ background: belt.color, color: belt.ink }}>
      <BeltIcon belt={belt} className="h-12 w-20 drop-shadow-[0_3px_0_rgb(0_0_0/0.2)]" />
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wider opacity-80">Promotion</p>
        <p className="font-display text-2xl">You earned your {belt.name}!</p>
        <p className="text-sm font-bold opacity-90">{belt.goal}</p>
      </div>
    </div>
  );
}
