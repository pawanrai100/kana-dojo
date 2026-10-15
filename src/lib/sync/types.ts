import type { Progress } from "@/lib/progress/types";
import type { Settings } from "@/lib/settings/types";

// what the cloud stores for one user
export interface CloudRow {
  progress: unknown; // untrusted until sanitized
  settings: unknown;
  rev: number;
}

export type WriteResult = { ok: true; rev: number } | { ok: false; conflict: true };

// anything that can store a user's progress. supabase today, could be anything later
export interface CloudRepo {
  fetch(): Promise<CloudRow | null>;
  insert(progress: Progress, settings: Settings): Promise<WriteResult>;
  // only succeeds if the stored rev still equals expectedRev
  update(progress: Progress, settings: Settings, expectedRev: number): Promise<WriteResult>;
}

export interface SyncMeta {
  rev: number | null; // last cloud rev this device has seen, null = never synced
  dirty: boolean; // local changes not in the cloud yet
}

// the slice of the app store the engine needs
export interface LocalSide {
  read(): { progress: Progress; settings: Settings };
  meta(): SyncMeta;
  setMeta(m: SyncMeta): void;
  applyRemote(progress: Progress, settings: Settings): void;
  version(): number; // bumps on every local edit
}

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";
