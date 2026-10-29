"use client";

import { useSyncExternalStore } from "react";
import { sanitizeProgress } from "@/lib/progress/sanitize";
import { currentStreak } from "@/lib/progress/stats";
import { emptyProgress, type Progress } from "@/lib/progress/types";
import { applyGradedRound } from "@/lib/progress/update";
import type { GeneratorState, GradedRound } from "@/lib/quiz/types";
import { sanitizeActiveRound, type ActiveRound } from "@/lib/quiz/session";
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from "@/lib/settings/types";
import { localRepo, STORAGE_PREFIX } from "@/lib/storage/local";
import { hasProgress, mergeGuestInto } from "@/lib/sync/merge";
import { newlyEarned, type Achievement } from "@/lib/tower/achievements";
import type { BattleState } from "@/lib/tower/battle";
import { applyBattle, type TowerOutcome } from "@/lib/tower/progress";
import type { LocalSide, SyncMeta } from "@/lib/sync/types";
import { withBelt } from "@/lib/progress/belts";
import { claimQuests } from "@/lib/progress/quests";

// guest data lives under the same keys as before accounts existed, so nobody's
// old progress moves. a signed in user gets their own "u:<id>:" copy that syncs
type Owner = string | null;

const sanitizeMeta = (raw: unknown): SyncMeta => {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { rev: typeof r.rev === "number" ? r.rev : null, dirty: r.dirty === true };
};

function reposFor(owner: Owner) {
  const ns = owner ? `u:${owner}:` : "";
  return {
    settings: localRepo<Settings>(ns + "settings", sanitizeSettings),
    progress: localRepo<Progress>(ns + "progress", sanitizeProgress),
    active: localRepo<ActiveRound | null>(ns + "active-round", sanitizeActiveRound),
    meta: localRepo<SyncMeta>(ns + "sync", sanitizeMeta),
  };
}

// remembers who was signed in so the right data shows before auth finishes loading
const ownerHint = localRepo<Owner>("owner", (v) => (typeof v === "string" && v.length < 100 ? v : null));
// theme kept outside per-user data so the no-flash script in layout.tsx can read it
const themeMirror = localRepo<string>("theme", (v) => (typeof v === "string" ? v : "system"));
const guestBackup = localRepo<unknown>("guest-backup", (v) => v ?? null);

export const SETTINGS_STORAGE_KEY = STORAGE_PREFIX + "settings";

export interface AppState {
  owner: Owner;
  settings: Settings;
  progress: Progress;
  active: ActiveRound | null;
}

let owner: Owner = null;
let repos = reposFor(null);
let state: AppState | null = null;
let meta: SyncMeta = { rev: null, dirty: false };
let localVersion = 0;
const listeners = new Set<() => void>();
const localChangeListeners = new Set<() => void>();

function load(): AppState {
  return { owner, settings: repos.settings.load(), progress: repos.progress.load(), active: repos.active.load() };
}

function ensure(): AppState {
  if (!state) {
    owner = ownerHint.load();
    repos = reposFor(owner);
    meta = repos.meta.load();
    state = load();
    themeMirror.save(state.settings.theme);
  }
  return state;
}

const emit = () => listeners.forEach((l) => l());

// local = the user did something here, so it needs uploading
function set(patch: Partial<Omit<AppState, "owner">>, opts: { local: boolean } = { local: true }) {
  const prev = ensure();
  state = { ...prev, ...patch };
  if (patch.settings) {
    repos.settings.save(state.settings);
    themeMirror.save(state.settings.theme);
  }
  if (patch.progress) repos.progress.save(state.progress);
  if ("active" in patch) {
    if (state.active) repos.active.save(state.active);
    else repos.active.clear();
  }
  const synced = !!(patch.settings || patch.progress);
  if (opts.local && synced && owner) {
    localVersion++;
    meta = { ...meta, dirty: true };
    repos.meta.save(meta);
  }
  emit();
  if (opts.local && synced && owner) localChangeListeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // keep tabs in sync
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(STORAGE_PREFIX)) {
      owner = ownerHint.load();
      repos = reposFor(owner);
      meta = repos.meta.load();
      state = load();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export const actions = {
  updateSettings(patch: Partial<Settings>) {
    set({ settings: sanitizeSettings({ ...ensure().settings, ...patch }) });
  },
  // start a fresh round and remember where the generator is
  startRound(active: ActiveRound, gen: GeneratorState) {
    // generator position is device-local, no need to upload for it
    set({ active, progress: { ...ensure().progress, gen } }, { local: false });
  },
  saveActive(active: ActiveRound | null) {
    set({ active });
  },
  // returns any badges this round just earned
  recordRound(graded: GradedRound): Achievement[] {
    const before = ensure().progress;
    const after = withBelt(claimQuests(applyGradedRound(before, graded, before.gen)).progress);
    set({ progress: after, active: null });
    return newlyEarned(before, after);
  },
  // a tower battle counts as practice too, then the floor result goes on top
  recordBattle(graded: GradedRound | null, battle: BattleState): { outcome: TowerOutcome; badges: Achievement[] } {
    const before = ensure().progress;
    const practiced = graded ? applyGradedRound(before, graded, before.gen) : before;
    const { progress: battled, outcome } = applyBattle(practiced, battle);
    const progress = withBelt(claimQuests(battled).progress);
    set({ progress });
    return { outcome, badges: newlyEarned(before, progress) };
  },
  clearActive() {
    set({ active: null });
  },
  resetProgress() {
    set({ progress: emptyProgress(), active: null });
  },
  resetSettings() {
    set({ settings: { ...DEFAULT_SETTINGS, enabledChars: [...DEFAULT_SETTINGS.enabledChars] } });
  },
  getState(): AppState {
    return ensure();
  },

  // switch between guest data and a signed in user's copy
  switchOwner(next: Owner) {
    ensure();
    if (next === owner) return;
    const firstTimeHere = next !== null && !reposFor(next).settings.exists();
    const guestSettings = reposFor(null).settings.load();
    owner = next;
    repos = reposFor(next);
    ownerHint.save(next);
    meta = repos.meta.load();
    state = load();
    // a new account on this device starts with the guest's settings
    if (firstTimeHere) {
      state = { ...state, settings: guestSettings };
      repos.settings.save(guestSettings);
    }
    themeMirror.save(state.settings.theme);
    emit();
  },

  // wipes a signed out user's copy from this device (it lives in the cloud)
  forgetUser(id: string) {
    const r = reposFor(id);
    r.settings.clear();
    r.progress.clear();
    r.active.clear();
    r.meta.clear();
  },

  guestProgress(): Progress {
    return reposFor(null).progress.load();
  },

  // moves guest progress into the signed in account. the guest copy is backed
  // up first, never just deleted
  importGuestProgress(): boolean {
    const s = ensure();
    if (!owner) return false;
    const guest = reposFor(null);
    const gp = guest.progress.load();
    if (!hasProgress(gp)) return false;
    guestBackup.save({ at: Date.now(), into: owner, progress: gp });
    const merged = mergeGuestInto(s.progress, gp);
    set({ progress: { ...merged, bestStreak: Math.max(merged.bestStreak, currentStreak(merged)) } });
    guest.progress.save(emptyProgress());
    guest.active.clear();
    return true;
  },

  onLocalChange(cb: () => void) {
    localChangeListeners.add(cb);
    return () => {
      localChangeListeners.delete(cb);
    };
  },
};

// what the sync engine sees of the store, pinned to one user. if the owner
// changes mid-upload (sign out) late replies are dropped, never mixed in
export function localSideFor(userId: string): LocalSide {
  const mine = () => ensure() && owner === userId;
  return {
    read: () => {
      const s = ensure();
      return { progress: s.progress, settings: s.settings };
    },
    meta: () => (mine() ? meta : { rev: null, dirty: false }),
    setMeta: (m) => {
      if (!mine()) return;
      meta = m;
      repos.meta.save(m);
    },
    applyRemote: (progress, settings) => {
      if (!mine()) return;
      set({ progress: { ...progress, gen: ensure().progress.gen }, settings }, { local: false });
    },
    version: () => localVersion,
  };
}

// null during ssr + hydration, real state right after
export function useAppState(): AppState | null {
  return useSyncExternalStore(subscribe, ensure, () => null);
}
