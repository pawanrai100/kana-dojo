"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { emptyStudy, sanitizeStudy, studyKey, type StudyProgress } from "@/lib/learning/study-progress";
const EVENT = "kana-study-change";
const fallback = new Map<string, string>();
function subscribe(callback: () => void) {
  const storage = (event: StorageEvent) => { if (event.key) fallback.delete(event.key); else fallback.clear(); callback(); };
  window.addEventListener("storage", storage); window.addEventListener(EVENT, callback);
  return () => { window.removeEventListener("storage", storage); window.removeEventListener(EVENT, callback); };
}
function read(key: string) { if (fallback.has(key)) return fallback.get(key)!; try { return localStorage.getItem(key) ?? "{}"; } catch { return "{}"; } }
export function useStudy() {
  const auth = useAuth();
  const key = studyKey(auth.user?.id ?? null);
  const raw = useSyncExternalStore(subscribe, useCallback(() => read(key), [key]), () => "{}");
  const state = useMemo(() => { try { return sanitizeStudy(JSON.parse(raw)); } catch { return emptyStudy(); } }, [raw]);
  function save(next: StudyProgress) {
    const value = JSON.stringify(sanitizeStudy(next)); let ok = true;
    try { localStorage.setItem(key, value); fallback.delete(key); } catch { fallback.set(key, value); ok = false; }
    window.dispatchEvent(new Event(EVENT)); return ok;
  }
  return { state, save, owner: key, loading: auth.status === "loading" };
}
