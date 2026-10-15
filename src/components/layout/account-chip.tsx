"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";
import { Avatar, SyncBadge, displayName } from "@/features/auth/account-bits";
import { cn } from "@/lib/utils";

// sidebar: who's signed in + sync state, or a nudge to make an account
export function AccountChip({ compact }: { compact?: boolean }) {
  const { status, user, profile, sync } = useAuth();
  if (status === "disabled") return null;

  if (status === "loading") {
    return <div className={cn("animate-pulse rounded-full bg-surface-2", compact ? "size-8" : "h-14 rounded-xl")} aria-hidden />;
  }

  if (status === "guest") {
    if (compact) {
      return (
        <Link href="/login" className="rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
          Log in
        </Link>
      );
    }
    return (
      <Link href="/signup" className="block rounded-xl border border-dashed border-primary/40 px-3 py-3 text-sm transition-colors hover:bg-primary-soft">
        <span className="flex items-center gap-2 font-medium text-primary">
          <UserRound className="size-4" /> Save your progress
        </span>
        <span className="mt-0.5 block text-xs text-muted">Free account, syncs across devices</span>
      </Link>
    );
  }

  if (compact) {
    return (
      <Link href="/profile" aria-label="Your profile" className="rounded-full ring-2 ring-transparent transition hover:ring-primary/40">
        <Avatar profile={profile} size={32} />
      </Link>
    );
  }

  return (
    <Link href="/profile" className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2">
      <Avatar profile={profile} size={36} />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-medium">{displayName(profile, user?.email)}</span>
        <SyncBadge status={sync} />
      </span>
    </Link>
  );
}
