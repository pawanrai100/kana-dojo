import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "primary" | "good" | "bad" | "sakura" | "warn" | "sun" }) {
  const tones = {
    default: "bg-surface-2 text-muted",
    primary: "bg-primary-soft text-primary",
    good: "bg-good-soft text-good",
    bad: "bg-bad-soft text-bad",
    sakura: "bg-sakura-soft text-sakura",
    warn: "bg-sun-soft text-warn",
    sun: "bg-sun text-sun-ink",
  };
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold", tones[tone], className)}
      {...props}
    />
  );
}

export function ProgressBar({
  value,
  className,
  barClassName,
  label,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  label: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cn("h-3 w-full overflow-hidden rounded-full bg-surface-2", className)}
    >
      <div className={cn("h-full rounded-full bg-primary transition-[width] duration-500", barClassName)} style={{ width: `${v * 100}%` }} />
    </div>
  );
}

export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn("rounded-lg bg-surface px-1.5 py-0.5 font-sans text-[11px] font-bold text-muted shadow-[0_2px_0_var(--border)]", className)}
      {...props}
    />
  );
}

// pill switcher for small option sets
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex flex-wrap gap-1 rounded-2xl bg-surface-2 p-1", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-9 rounded-xl px-3.5 py-1.5 text-sm font-bold transition-colors",
            o.value === value ? "bg-surface text-primary shadow-[0_3px_0_var(--border)]" : "text-muted hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
