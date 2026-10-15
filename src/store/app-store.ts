"use client";

import { useSyncExternalStore } from "react";
import { sanitizeProgress } from "@/lib/progress/sanitize";
import { emptyProgress, type Progress } from "@/lib/progress/types";
import { applyGradedRound } from "@/lib/progress/update";
import type { GeneratorState, GradedRound } from "@/lib/quiz/types";
import { sanitizeActiveRound, type ActiveRound } from "@/lib/quiz/session";
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from "@/lib/settings/types";
import { localRepo, STORAGE_PREFIX } from "@/lib/storage/local";

// all persistence goes through these repos. replace with an api-backed
// Repository when accounts + cloud sync land
const repos = {
  settings: localRepo<Settings>("settings", sanitizeSettings),
  progress: localRepo<Progress>("progress", sanitizeProgress),
  active: localRepo<ActiveRound | null>("active-round", sanitizeActiveRound),
};

export const SETTINGS_STORAGE_KEY = STORAGE_PREFIX + "settings";

export interface AppState {
  settings: Settings;
  progress: Progress;
  active: ActiveRound | null;
}

let state: AppState | null = null;
const listeners = new Set<() => void>();

function load(): AppState {
  return { settings: repos.settings.load(), progress: repos.progress.load(), active: repos.active.load() };
}

function ensure(): AppState {
  if (!state) state = load();
  return state;
}

function set(patch: Partial<AppState>) {
  const prev = ensure();
  state = { ...prev, ...patch };
  if (patch.settings) repos.settings.save(state.settings);
  if (patch.progress) repos.progress.save(state.progress);
  if ("active" in patch) {
    if (state.active) repos.active.save(state.active);
    else repos.active.clear();
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // keep tabs in sync
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(STORAGE_PREFIX)) {
      state = load();
      listeners.forEach((l) => l());
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
    set({ active, progress: { ...ensure().progress, gen } });
  },
  saveActive(active: ActiveRound | null) {
    set({ active });
  },
  recordRound(graded: GradedRound) {
    const s = ensure();
    set({ progress: applyGradedRound(s.progress, graded, s.progress.gen), active: null });
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
};

// null during ssr + hydration, real state right after
export function useAppState(): AppState | null {
  return useSyncExternalStore(subscribe, ensure, () => null);
}
