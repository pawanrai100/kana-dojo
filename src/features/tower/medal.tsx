import type { Achievement, BadgeTier } from "@/lib/tower/achievements";
import { cn } from "@/lib/utils";

const TIER: Record<BadgeTier, string> = {
  bronze: "bg-[#f6dfca] text-[#7a3f12] ring-[#c47a3a] dark:bg-[#3d2a1e] dark:text-[#f0c79f]",
  silver: "bg-[#e7ebf3] text-[#3f475b] ring-[#9aa3b5] dark:bg-[#2b3150] dark:text-[#d5dbea]",
  gold: "bg-sun-soft text-sun-ink ring-sun dark:text-sun",
  boss: "bg-bad-soft text-bad ring-bad",
};

export function Medal({ a, earned = true, size = 64, className }: { a: Achievement; earned?: boolean; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.44 }}
      className={cn(
        "font-kana relative grid shrink-0 place-items-center rounded-full ring-[5px] ring-inset",
        earned ? TIER[a.tier] : "bg-surface-2 text-muted/60 ring-border",
        earned && "shadow-[0_4px_0_rgb(0_0_0/0.12)]",
        className,
      )}
    >
      {earned ? a.glyph : "?"}
    </span>
  );
}

export function BadgeCard({ a, earned }: { a: Achievement; earned: boolean }) {
  return (
    <li className={cn("flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-[0_4px_0_var(--border)]", !earned && "opacity-75")}>
      <Medal a={a} earned={earned} size={52} />
      <div className="min-w-0">
        <p className="font-extrabold">{earned ? a.name : "Locked"}</p>
        <p className="text-xs text-muted">{a.how}</p>
      </div>
    </li>
  );
}
