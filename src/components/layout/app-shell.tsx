"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame } from "lucide-react";
import { MAIN_NAV } from "@/lib/modules";
import { currentStreak, levelInfo } from "@/lib/progress/stats";
import { cn } from "@/lib/utils";
import { useAppState } from "@/store/app-store";
import { AccountChip } from "./account-chip";
import { LogoMark } from "./logo";
import { ThemeSync } from "./theme-sync";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const SHORT: Record<string, string> = {
  "/": "Home",
  "/practice": "Practice",
  "/chart": "Chart",
  "/progress": "Stats",
  "/settings": "Settings",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const state = useAppState();
  const streak = state ? currentStreak(state.progress) : 0;
  const lvl = state ? levelInfo(state.progress.xp).level : 1;

  return (
    <div className="flex min-h-dvh flex-col">
      <ThemeSync />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Kana Dojo home">
            <LogoMark size={40} />
            <span className="font-display hidden text-xl sm:inline">Kana Dojo</span>
          </Link>

          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
            {MAIN_NAV.map((item) => {
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
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <span className="hidden rounded-full bg-surface px-3 py-1.5 text-sm font-extrabold text-primary shadow-[0_3px_0_var(--border)] sm:inline">
              Lv {lvl}
            </span>
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
        {MAIN_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-extrabold", active ? "text-primary" : "text-muted")}
            >
              <span className={cn("grid h-8 w-12 place-items-center rounded-full", active && "bg-primary-soft")}>
                <item.icon className="size-5" />
              </span>
              {SHORT[item.href] ?? item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
