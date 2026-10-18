// thin localStorage wrapper. signed in users get their own namespace,
// and lib/sync keeps that copy in step with the cloud

export interface Repository<T> {
  load(): T;
  save(value: T): void;
  clear(): void;
  exists(): boolean;
}

export const STORAGE_PREFIX = "kana-dojo:v1:";

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window.localStorage;
    return s;
  } catch {
    return null;
  }
}

export function localRepo<T>(key: string, sanitize: (raw: unknown) => T): Repository<T> {
  const fullKey = STORAGE_PREFIX + key;
  return {
    load() {
      const s = storage();
      if (!s) return sanitize(undefined);
      try {
        const raw = s.getItem(fullKey);
        return sanitize(raw == null ? undefined : JSON.parse(raw));
      } catch {
        // corrupted json, start fresh rather than crash
        return sanitize(undefined);
      }
    },
    save(value) {
      try {
        storage()?.setItem(fullKey, JSON.stringify(value));
      } catch {
        // quota or private mode, progress just won't persist
      }
    },
    clear() {
      try {
        storage()?.removeItem(fullKey);
      } catch {}
    },
    exists() {
      try {
        return storage()?.getItem(fullKey) != null;
      } catch {
        return false;
      }
    },
  };
}
