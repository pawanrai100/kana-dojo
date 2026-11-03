"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { learningKey, sanitizeLearning, type LearningProgress } from "@/lib/learning/progress";

const memory = new Map<string, string>();
const EVENT = "kana-dojo-learning-changed";
function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key) memory.delete(event.key); else memory.clear(); callback(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, callback);
  return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(EVENT, callback); };
}
function read(key: string) {
  if (memory.has(key)) return memory.get(key)!;
  try { return window.localStorage.getItem(key) ?? "{}"; }
  catch { return memory.get(key) ?? "{}"; }
}

export function useLearning() {
  const auth = useAuth();
  const key = learningKey(auth.user?.id ?? null);
  const snapshot = useCallback(() => read(key), [key]);
  const raw = useSyncExternalStore(subscribe, snapshot, () => "{}");
  const progress = useMemo(() => {
    try { return sanitizeLearning(JSON.parse(raw)); } catch { return {}; }
  }, [raw]);
  const save = (next: LearningProgress) => {
    const value = JSON.stringify(sanitizeLearning(next));
    let saved = true;
    try { window.localStorage.setItem(key, value); memory.delete(key); } catch { saved = false; memory.set(key, value); }
    window.dispatchEvent(new Event(EVENT));
    return saved;
  };
  return { progress, save, owner: key, loading: auth.status === "loading" };
}
