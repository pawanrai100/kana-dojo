"use client";

import { ArrowRight, Hourglass, Lightbulb, ScrollText, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStartDrill } from "@/features/coach/coach-card";
import type { Debrief, Trick } from "@/lib/coach/debrief";
import type { Floor } from "@/lib/tower/floors";
import { cn } from "@/lib/utils";

function Kana({ k, className }: { k: string; className?: string }) {
  return (
    <span lang="ja" className={cn("font-kana leading-none", k.length > 1 && "kana-combo", className)}>
      {k}
    </span>
  );
}

function TrickCard({ t, i }: { t: Trick; i: number }) {
  return (
    <li className="animate-deal flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-[0_4px_0_var(--border)]" style={{ animationDelay: `${150 + i * 90}ms` }}>
      <div className="flex items-center gap-3">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Kana k={t.kana} className="text-4xl" />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-2xl leading-tight">{t.reading}</span>
          {t.readAs ? (
            <span className="block text-xs font-bold text-bad">
              you read it as <Kana k={t.readAs.kana} className="text-sm" /> ({t.readAs.reading})
            </span>
          ) : (
            <span className="block text-xs font-bold text-muted">{t.misses > 1 ? `missed ${t.misses} times` : "missed"}</span>
          )}
        </span>
      </div>
      <p className="text-sm">
        <Lightbulb className="mr-1 inline size-4 -translate-y-px text-warn" aria-hidden />
        {t.trick}
      </p>
      {t.twin && (
        <div className="rounded-xl bg-bad-soft/60 p-3">
          <p className="mb-2 flex items-center justify-center gap-3" aria-label={`${t.kana} versus ${t.twin.kana}`}>
            <span className="flex flex-col items-center">
              <Kana k={t.kana} className="text-3xl" />
              <span className="text-[11px] font-extrabold">{t.reading}</span>
            </span>
            <span className="text-xs font-extrabold text-muted">vs</span>
            <span className="flex flex-col items-center">
              <Kana k={t.twin.kana} className="text-3xl" />
              <span className="text-[11px] font-extrabold">{t.twin.reading}</span>
            </span>
          </p>
          <p className="text-center text-xs font-bold">{t.twin.diff}</p>
        </div>
      )}
    </li>
  );
}

// a short taunt so losing to a boss stings a little (in a fun way)
function taunt(floor: Floor, d: Debrief): string | undefined {
  if (!floor.boss) return undefined;
  const name = floor.boss.name.split(",")[0];
  const k = d.tricks[0]?.kana;
  if (d.cause === "clock") return `${name}: "Too slow! Read faster next time."`;
  if (k) return `${name}: "Come back when you can read ${k}."`;
  return `${name}: "Is that all you've got?"`;
}

// shown after you lose a floor: what went wrong and how to fix it
export function DebriefPanel({ floor, d }: { floor: Floor; d: Debrief }) {
  const startDrill = useStartDrill();
  const line = taunt(floor, d);
  return (
    <section aria-label="How to win next time" className="w-full space-y-4 rounded-2xl bg-sun-soft p-4 text-left sm:p-5">
      {line && <p className="animate-pop rounded-xl bg-foreground px-3 py-2 text-center text-sm font-extrabold text-background">{line}</p>}
      <div>
        <p className="flex items-center gap-2 text-sm font-extrabold text-warn">
          <ScrollText className="size-4" aria-hidden /> Sensei&apos;s notes
        </p>
        <h2 className="mt-1 font-display text-2xl leading-tight">{d.headline}</h2>
        <p className="mt-1 text-sm text-muted">{d.advice}</p>
        {d.timeouts > 0 && d.cause !== "clock" && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-muted">
            <Hourglass className="size-3.5" aria-hidden /> {d.timeouts} ran out of time. Type the first sound right away, then keep going.
          </p>
        )}
      </div>

      {d.tricks.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {d.tricks.map((t, i) => (
            <TrickCard key={t.kana} t={t} i={i} />
          ))}
        </ul>
      )}

      {d.habits.length > 0 && (
        <ul className="space-y-2">
          {d.habits.map((h) => (
            <li key={h.label} className="flex gap-2 text-sm">
              <Target className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="font-extrabold">{h.label}:</span> {h.tip}
              </span>
            </li>
          ))}
        </ul>
      )}

      {d.drill.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t-2 border-sun/40 pt-4">
          <p className="min-w-0 flex-1 basis-56 text-sm">
            <span className="font-extrabold">Drill these before you try again.</span>{" "}
            <span className="text-muted">10 quick cards, only the kana you missed{d.tricks.some((t) => t.twin) ? " and their twins" : ""}.</span>
          </p>
          <Button variant="sun" onClick={() => startDrill(d.drill)}>
            Drill {d.drill.length} kana <ArrowRight />
          </Button>
        </div>
      )}
    </section>
  );
}
