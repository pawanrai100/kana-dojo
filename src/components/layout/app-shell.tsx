"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame } from "lucide-react";
import { MAIN_NAV, UPCOMING_MODULES } from "@/lib/modules";
import { currentStreak, levelInfo } from "@/lib/progress/stats";
import { cn } from "@/lib/utils";
import { useAppState } from "@/store/app-store";
import { AccountChip } from "./account-chip";
import { ThemeSync } from "./theme-sync";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const state = useAppState();
  const streak = state ? currentStreak(state.progress) : 0;
  const lvl = state ? levelInfo(state.progress.xp).level : 1;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <ThemeSync />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface/60 px-4 py-6 backdrop-blur lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-3 px-2">
          <span className="font-kana grid size-10 place-items-center rounded-xl bg-primary text-2xl text-primary-foreground">か</span>
          <span className="leading-tight">
            <span className="block font-semibold">Kana Dojo</span>
            <span className="block text-xs text-muted">Level {lvl}</span>
          </span>
        </Link>

        <nav aria-label="Main" className="flex flex-col gap-1">
          {MAIN_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active ? "bg-primary-soft font-medium text-primary" : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 px-3 text-xs font-medium text-muted">Coming next</div>
        <ul className="mt-2 flex flex-col gap-0.5">
          {UPCOMING_MODULES.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted/70"
            >
              <m.icon className="size-4" />
              {m.label}
              <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">Soon</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto space-y-3">
          <AccountChip />
        <div className="flex items-center gap-2 rounded-xl bg-sakura-soft px-3 py-2.5 text-sm text-sakura">
          <Flame className="size-4" />
          <span>
            <strong className="font-semibold">{streak}</strong> day streak
          </span>
        </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="font-kana grid size-8 place-items-center rounded-lg bg-primary text-lg text-primary-foreground">か</span>
            Kana Dojo
          </Link>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-sakura-soft px-3 py-1 text-sm text-sakura">
              <Flame className="size-4" /> {streak}
            </span>
            <AccountChip compact />
          </span>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          {children}
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {MAIN_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px]", active ? "text-primary" : "text-muted")}
            >
              <item.icon className="size-5" />
              {item.label.replace("Hiragana ", "").replace(" & Stats", "")}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
