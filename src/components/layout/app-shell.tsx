"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Flame, Ellipsis } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MAIN_NAV } from "@/lib/modules";
import { currentStreak } from "@/lib/progress/stats";
import { cn } from "@/lib/utils";
import { useAppState } from "@/store/app-store";
import { AccountChip } from "./account-chip";
import { LogoMark } from "./logo";
import { ThemeSync } from "./theme-sync";
import { UpdateWatcher } from "./update-watcher";
import { BeltChip } from "@/features/belts/belt";
import { beltScriptFor } from "@/lib/progress/belts";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const SHORT: Record<string, string> = {
  "/": "Home",
  "/practice": "Practice",
  "/learn": "Speak",
  "/tower": "Tower",
  "/chart": "Chart",
  "/progress": "Stats",
  "/leaderboard": "Leaders",
  "/settings": "Settings",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const state = useAppState();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = MAIN_NAV.filter((item) => ["/", "/practice", "/learn", "/tower"].includes(item.href));
  const secondary = MAIN_NAV.filter((item) => !primary.includes(item));
  const moreActive = secondary.some((item) => isActive(pathname, item.href));
  const streak = state ? currentStreak(state.progress) : 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <ThemeSync />
      <UpdateWatcher />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Kana Dojo home">
            <LogoMark size={40} />
            <span className="font-display hidden text-xl sm:inline lg:hidden xl:inline">Kana Dojo</span>
          </Link>

          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
            {primary.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-4 py-2 text-[15px] font-extrabold transition-colors",
                    active ? "bg-surface text-primary shadow-[0_3px_0_var(--border)]" : "text-muted hover:text-foreground",
                  )}
                >
                  {SHORT[item.href] ?? item.label}
                </Link>
              );
            })}
            <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" className={cn("rounded-full px-4 py-2 text-[15px] font-extrabold", moreActive ? "bg-surface text-primary" : "text-muted")}>More</button>
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            {state && <BeltChip progress={state.progress} script={beltScriptFor(state.settings.script)} />}
            <span
              className="flex items-center gap-1.5 rounded-full bg-sun px-3 py-1.5 text-sm font-extrabold text-sun-ink shadow-[0_3px_0_var(--sun-deep)]"
              aria-label={`${streak} day streak`}
            >
              <Flame className="size-4" aria-hidden /> {streak}
            </span>
            <AccountChip compact />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-14 lg:pt-6">
        {children}
      </main>

      <footer className="mx-auto hidden w-full max-w-6xl gap-5 px-8 pb-8 text-xs font-bold text-muted lg:flex">
        <span>Kana Dojo</span>
        <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
        <Link href="/terms" className="hover:text-foreground">Terms</Link>
      </footer>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_0_var(--border)] lg:hidden"
      >
        {primary.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex flex-col items-center gap-1 py-2.5 text-[10px] font-extrabold sm:text-[11px]", active ? "text-primary" : "text-muted")}
            >
              <span className={cn("grid h-8 w-10 place-items-center rounded-full sm:w-11", active && "bg-primary-soft")}>
                <item.icon className="size-5" />
              </span>
              {SHORT[item.href] ?? item.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-extrabold", moreActive ? "text-primary" : "text-muted")}>
          <span className={cn("grid h-8 w-10 place-items-center rounded-full", moreActive && "bg-primary-soft")}><Ellipsis className="size-5" aria-hidden /></span>More
        </button>
      </nav>
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent>
          <DialogTitle>Explore Kana Dojo</DialogTitle>
          <DialogDescription>Your chart, progress, leaderboard, and settings.</DialogDescription>
          <nav aria-label="More pages" className="grid gap-3">
            {secondary.map((item) => <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} aria-current={isActive(pathname, item.href) ? "page" : undefined} className="flex min-h-12 items-center gap-3 rounded-xl bg-primary-soft px-4 py-3 font-bold text-primary"><item.icon className="size-5" aria-hidden />{item.label}</Link>)}
          </nav>
        </DialogContent>
      </Dialog>
    </div>
  );
}
