"use client";

import { CloudCheck, CloudOff, Loader2, CloudAlert } from "lucide-react";
import type { SyncStatus } from "@/lib/sync/types";
import { cn } from "@/lib/utils";
import type { Profile } from "./auth-provider";

export function Avatar({ profile, size = 40, className }: { profile: Profile | null; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (profile?.avatar_url) {
    return (
      // google photos come from many hosts, a plain img avoids next/image config
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt=""
        referrerPolicy="no-referrer"
        style={style}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ ...style, fontSize: size * 0.5 }}
      className={cn("font-kana grid shrink-0 place-items-center rounded-full bg-primary text-primary-foreground", className)}
    >
      {profile?.avatar_kana ?? "か"}
    </span>
  );
}

export function displayName(profile: Profile | null, email?: string | null): string {
  return profile?.display_name || profile?.username || email?.split("@")[0] || "Learner";
}

const SYNC_COPY: Record<SyncStatus, { label: string; tone: string }> = {
  idle: { label: "Connecting", tone: "text-muted" },
  syncing: { label: "Saving", tone: "text-muted" },
  synced: { label: "Saved to cloud", tone: "text-good" },
  offline: { label: "Offline, saved on this device", tone: "text-warn" },
  error: { label: "Sync paused, retrying", tone: "text-warn" },
};

export function SyncBadge({ status, compact }: { status: SyncStatus; compact?: boolean }) {
  const c = SYNC_COPY[status];
  const Icon = status === "syncing" || status === "idle" ? Loader2 : status === "synced" ? CloudCheck : status === "offline" ? CloudOff : CloudAlert;
  return (
    <span role="status" className={cn("inline-flex items-center gap-1.5 text-xs", c.tone)} title={c.label}>
      <Icon className={cn("size-3.5", (status === "syncing" || status === "idle") && "animate-spin")} aria-hidden />
      <span className={compact ? "sr-only" : undefined}>{c.label}</span>
    </span>
  );
}
