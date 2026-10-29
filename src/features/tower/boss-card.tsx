"use client";

import { useState } from "react";
import { Lock, Star } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CARD_COUNT, TIER_NAME, cardRole, upgradeHint, type BossCard, type CardTier } from "@/lib/tower/cards";
import { cn } from "@/lib/utils";
import { theme } from "./boss-arena";
import { YokaiArt } from "./yokai-art";

const FRAME: Record<CardTier, { edge: string; ink: string }> = {
  bronze: { edge: "linear-gradient(140deg, #f0b27a, #9a5a2a 45%, #e3a06a 70%, #7a4520)", ink: "#ffd9b5" },
  silver: { edge: "linear-gradient(140deg, #ffffff, #9aa6b8 40%, #eef2f7 65%, #7c879a)", ink: "#eef2f7" },
  gold: { edge: "linear-gradient(140deg, #fff1b0, #d79a1e 40%, #ffe27a 62%, #a8700c)", ink: "#ffe9a3" },
};

const STARS: Record<CardTier, number> = { bronze: 1, silver: 2, gold: 3 };

// one collectible card. big = the version in the drop reveal and the detail view
export function CardFace({ card, big, className }: { card: BossCard; big?: boolean; className?: string }) {
  if (!card.tier) return <CardBack card={card} className={className} />;
  const f = FRAME[card.tier];
  const t = theme(card.floor);
  return (
    <div
      className={cn("relative aspect-[5/7] rounded-[14px] p-[5px] shadow-[0_6px_0_rgb(0_0_0/0.25)]", big && "rounded-[20px] p-[7px]", className)}
      style={{ background: f.edge }}
    >
      <div
        className="relative flex size-full flex-col overflow-hidden rounded-[10px] text-white"
        style={{ background: `radial-gradient(110% 80% at 50% 30%, ${t.glow}55 0%, ${t.sky} 60%, #050505 100%)` }}
      >
        <div className="flex items-center justify-between px-2 pt-1.5 text-[10px] font-extrabold tabular-nums" style={{ color: f.ink }}>
          <span>#{String(card.no).padStart(2, "0")}</span>
          <span className="flex gap-px" aria-label={`${STARS[card.tier]} stars`}>
            {[1, 2, 3].map((s) => (
              <Star key={s} aria-hidden className={cn(big ? "size-3.5" : "size-2.5", s <= STARS[card.tier!] ? "fill-current" : "opacity-25")} />
            ))}
          </span>
        </div>
        <div className="relative min-h-0 flex-1">
          <YokaiArt id={card.floor.enemy.id} className="absolute inset-x-1 bottom-0 top-1 size-auto h-full w-[calc(100%-0.5rem)] drop-shadow-[0_6px_10px_rgb(0_0_0/0.6)]" />
        </div>
        <div className="space-y-0.5 bg-black/55 px-2 pb-2 pt-1.5 text-center">
          <p className={cn("truncate font-display leading-tight", big ? "text-2xl" : "text-xs sm:text-sm")}>{big ? card.boss.name : card.boss.name.split(/,| the /)[0]}</p>
          <p lang="ja" className={cn("font-kana truncate opacity-80", big ? "text-sm" : "text-[10px]")}>
            {card.boss.kana}
          </p>
          {big && <p className="text-xs font-bold opacity-70">{cardRole(card)}</p>}
          <p className={cn("font-extrabold uppercase tracking-widest", big ? "text-xs" : "text-[9px]")} style={{ color: f.ink }}>
            {TIER_NAME[card.tier]}
          </p>
        </div>
        {card.tier === "gold" && <span aria-hidden className="card-shine pointer-events-none absolute inset-0" />}
      </div>
    </div>
  );
}

// a card you haven't won yet: just a shadow and where to find it
function CardBack({ card, className }: { card: BossCard; className?: string }) {
  return (
    <div className={cn("relative aspect-[5/7] rounded-[14px] bg-surface-2 p-[5px] shadow-[0_6px_0_var(--border)]", className)}>
      <div className="flex size-full flex-col items-center justify-center gap-1 overflow-hidden rounded-[10px] border-2 border-dashed border-border text-muted">
        <span className="text-[10px] font-extrabold tabular-nums">#{String(card.no).padStart(2, "0")}</span>
        <div className="relative w-3/4 flex-1">
          <YokaiArt id={card.floor.enemy.id} className="absolute inset-0 size-full opacity-30 brightness-0" />
          <Lock className="absolute inset-0 m-auto size-5" aria-hidden />
        </div>
        <span className="pb-2 text-[10px] font-bold">{card.where}</span>
      </div>
    </div>
  );
}

// the whole collection, tap a card to look at it up close
export function CardGallery({ cards }: { cards: BossCard[] }) {
  const [open, setOpen] = useState<BossCard | null>(null);
  const have = cards.filter((c) => c.tier).length;
  const gold = cards.filter((c) => c.tier === "gold").length;
  return (
    <section aria-label="Boss cards" className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">Boss cards</h1>
        <p className="text-muted">
          Beat a boss and its card drops. Beat it without losing a heart to turn it gold.
        </p>
        <p className="mt-2 text-sm font-extrabold">
          {have} of {CARD_COUNT} collected, {gold} gold
        </p>
      </div>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {cards.map((c) => (
          <li key={c.no}>
            <button
              type="button"
              onClick={() => setOpen(c)}
              aria-label={c.tier ? `${c.boss.name}, ${TIER_NAME[c.tier]} card` : `Card ${c.no}, not collected yet`}
              className="block w-full transition-transform hover:-translate-y-1 focus-visible:-translate-y-1"
            >
              <CardFace card={c} />
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-sm">
          {open && (
            <div className="space-y-4 text-center">
              <DialogTitle className="pr-8 text-left">{open.tier ? open.boss.name : "Not collected yet"}</DialogTitle>
              <CardFace card={open} big className="mx-auto w-56" />
              <DialogDescription>{open.tier ? open.boss.blurb : `Card #${open.no} is waiting on ${open.where}.`}</DialogDescription>
              <p className="rounded-2xl bg-surface-2/70 p-3 text-sm font-bold">{upgradeHint(open)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

// the loot moment after a boss fight
export function CardDrop({ card, upgraded }: { card: BossCard; upgraded: boolean }) {
  return (
    <div className="flex w-full flex-col items-center gap-3 rounded-2xl bg-[#14111f] p-5 text-white">
      <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-[#ffd27a]">{upgraded ? "Card upgraded" : "Card drop"}</p>
      <div className="relative">
        <span aria-hidden className="animate-card-glow absolute inset-[-30%] rounded-full" style={{ background: "radial-gradient(closest-side, rgb(255 210 122 / 0.55), transparent)" }} />
        <CardFace card={card} big className="animate-card-drop relative w-44 sm:w-52" />
      </div>
      <p className="font-extrabold">
        {upgraded ? `${card.boss.name} is now ${TIER_NAME[card.tier!]}!` : `You got ${card.boss.name}!`}
      </p>
      {card.tier !== "gold" && <p className="text-xs text-white/60">{upgradeHint(card)}</p>}
    </div>
  );
}
