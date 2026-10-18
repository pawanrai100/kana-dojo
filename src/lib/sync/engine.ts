import { sanitizeProgress } from "@/lib/progress/sanitize";
import { currentStreak } from "@/lib/progress/stats";
import type { Progress } from "@/lib/progress/types";
import { sanitizeSettings } from "@/lib/settings/types";
import { mergeDiverged } from "./merge";
import type { CloudRepo, LocalSide, SyncStatus } from "./types";

const MAX_CONFLICT_RETRIES = 3;
const RETRY_DELAYS = [5_000, 15_000, 60_000];

function withStreak(p: Progress): Progress {
  return { ...p, bestStreak: Math.max(p.bestStreak, currentStreak(p)) };
}

// keeps one user's local cache and their cloud row in step.
// local edits are saved instantly on the device, then pushed a moment later
export class SyncEngine {
  private running: Promise<void> | null = null;
  private again = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private retryIdx = 0;
  private stopped = false;
  private listeners = new Set<(s: SyncStatus) => void>();
  status: SyncStatus = "idle";
  lastError: string | null = null;

  constructor(
    private cloud: CloudRepo,
    private local: LocalSide,
    private opts: { debounceMs?: number; isOnline?: () => boolean } = {},
  ) {}

  onStatus(cb: (s: SyncStatus) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private setStatus(s: SyncStatus) {
    this.status = s;
    this.listeners.forEach((l) => l(s));
  }

  // call after any local edit
  schedule() {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.sync(), this.opts.debounceMs ?? 1500);
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.listeners.clear();
  }

  // runs one sync at a time, coalescing extra requests into one more pass
  sync(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      do {
        this.again = false;
        await this.runOnce();
      } while (this.again && !this.stopped);
    })().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async runOnce() {
    if (this.opts.isOnline && !this.opts.isOnline()) {
      this.setStatus("offline");
      return;
    }
    this.setStatus("syncing");
    try {
      for (let attempt = 0; attempt <= MAX_CONFLICT_RETRIES; attempt++) {
        const done = await this.pullThenPush();
        if (done) {
          this.retryIdx = 0;
          this.lastError = null;
          this.setStatus("synced");
          return;
        }
      }
      throw new Error("too many save conflicts");
    } catch (e) {
      this.lastError = e instanceof Error ? e.message : String(e);
      const offline = this.opts.isOnline ? !this.opts.isOnline() : false;
      this.setStatus(offline ? "offline" : "error");
      // try again later, local data is safe meanwhile
      const delay = RETRY_DELAYS[Math.min(this.retryIdx++, RETRY_DELAYS.length - 1)];
      if (!this.stopped) this.timer = setTimeout(() => void this.sync(), delay);
    }
  }

  // returns false when a write lost a race and we need another round
  private async pullThenPush(): Promise<boolean> {
    const row = await this.cloud.fetch();
    let meta = this.local.meta();

    if (row && row.rev !== meta.rev) {
      const remoteProgress = sanitizeProgress(row.progress);
      const remoteSettings = sanitizeSettings(row.settings);
      if (!meta.dirty) {
        // nothing new here, just take the cloud copy
        this.local.applyRemote(remoteProgress, remoteSettings);
        this.local.setMeta({ rev: row.rev, dirty: false });
        return true;
      }
      // both sides changed: merge, keep this device's settings, then push
      const { progress, settings } = this.local.read();
      this.local.applyRemote(withStreak(mergeDiverged(progress, remoteProgress)), settings);
      meta = { rev: row.rev, dirty: true };
      this.local.setMeta(meta);
    }

    if (row && !meta.dirty) return true;

    const v = this.local.version();
    const { progress, settings } = this.local.read();
    const res = row ? await this.cloud.update(progress, settings, meta.rev!) : await this.cloud.insert(progress, settings);
    if (!res.ok) return false;
    // edits that happened while we were uploading stay dirty for the next pass
    const stillDirty = this.local.version() !== v;
    this.local.setMeta({ rev: res.rev, dirty: stillDirty });
    if (stillDirty) this.again = true;
    return true;
  }
}
