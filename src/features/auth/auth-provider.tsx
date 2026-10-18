"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { authEnabled } from "@/lib/supabase/config";
import { SyncEngine } from "@/lib/sync/engine";
import { hasProgress } from "@/lib/sync/merge";
import { supabaseCloud } from "@/lib/sync/supabase-cloud";
import type { SyncStatus } from "@/lib/sync/types";
import { actions, localSideFor } from "@/store/app-store";
import { GuestImportDialog } from "./guest-import-dialog";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_kana: string;
  created_at: string;
}

export type AuthStatus = "disabled" | "loading" | "guest" | "signed-in";

export interface SignOutResult {
  ok: boolean;
  unsynced?: boolean;
}

interface AuthValue {
  status: AuthStatus;
  user: User | null;
  profile: Profile | null;
  sync: SyncStatus;
  refreshProfile: () => Promise<void>;
  syncNow: () => Promise<void>;
  signOut: (opts?: { everywhere?: boolean; force?: boolean }) => Promise<SignOutResult>;
}

const AuthContext = createContext<AuthValue | null>(null);

const FOCUS_SYNC_GAP_MS = 30_000;
const POLL_MS = 120_000;
const declinedKey = (id: string) => `kana-dojo:v1:u:${id}:guest-declined`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(authEnabled ? "loading" : "disabled");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sync, setSync] = useState<SyncStatus>("idle");
  const [guestPrompt, setGuestPrompt] = useState<number | null>(null);
  const engine = useRef<SyncEngine | null>(null);
  const userId = useRef<string | null>(null);

  const loadProfile = useCallback(async (id: string) => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.from("profiles").select("id, username, display_name, avatar_url, avatar_kana, created_at").eq("id", id).maybeSingle();
    if (userId.current === id) setProfile(data ?? null);
  }, []);

  const stopEngine = () => {
    engine.current?.stop();
    engine.current = null;
  };

  // runs on every auth change: page load, sign in, sign out, token refresh
  const handleSession = useCallback(
    (session: Session | null) => {
      const sb = getSupabase();
      const next = session?.user ?? null;
      setUser(next);
      if (!next || !sb) {
        if (userId.current) stopEngine();
        userId.current = null;
        setProfile(null);
        setSync("idle");
        actions.switchOwner(null);
        setStatus("guest");
        return;
      }
      setStatus("signed-in");
      if (userId.current === next.id) return; // token refresh, nothing to redo

      stopEngine();
      userId.current = next.id;
      actions.switchOwner(next.id);
      const e = new SyncEngine(supabaseCloud(sb, next.id), localSideFor(next.id), {
        isOnline: () => navigator.onLine,
      });
      e.onStatus(setSync);
      engine.current = e;
      void e.sync();
      void loadProfile(next.id);

      // offer to bring guest progress into the account
      const guest = actions.guestProgress();
      let declined = false;
      try {
        declined = localStorage.getItem(declinedKey(next.id)) === "1";
      } catch {}
      if (hasProgress(guest) && !declined) setGuestPrompt(guest.totalAnswered);
    },
    [loadProfile],
  );

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      // supabase asks not to call it again inside this callback, so defer
      setTimeout(() => handleSession(session), 0);
    });
    return () => {
      data.subscription.unsubscribe();
      stopEngine();
    };
  }, [handleSession]);

  // push local edits, and pull when coming back to the tab or online
  useEffect(() => {
    if (status !== "signed-in") return;
    let lastPull = Date.now();
    const pull = (force = false) => {
      if (!force && Date.now() - lastPull < FOCUS_SYNC_GAP_MS) return;
      lastPull = Date.now();
      void engine.current?.sync();
    };
    const offChange = actions.onLocalChange(() => engine.current?.schedule());
    const onVisible = () => {
      if (document.visibilityState === "visible") pull();
      // leaving the page: try to upload right away
      else void engine.current?.sync();
    };
    const onOnline = () => pull(true);
    const onOffline = () => setSync("offline");
    const poll = window.setInterval(() => document.visibilityState === "visible" && pull(true), POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      offChange();
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [status]);

  const signOut = useCallback(async (opts: { everywhere?: boolean; force?: boolean } = {}): Promise<SignOutResult> => {
    const sb = getSupabase();
    const id = userId.current;
    if (!sb || !id) return { ok: true };
    // upload anything left before leaving
    if (engine.current) await engine.current.sync();
    if (localSideFor(id).meta().dirty && !opts.force) return { ok: false, unsynced: true };
    stopEngine();
    userId.current = null;
    await sb.auth.signOut({ scope: opts.everywhere ? "global" : "local" });
    // their copy is safe in the cloud, so don't leave it on a possibly shared device
    actions.switchOwner(null);
    actions.forgetUser(id);
    setUser(null);
    setProfile(null);
    setSync("idle");
    setStatus("guest");
    return { ok: true };
  }, []);

  const value: AuthValue = {
    status,
    user,
    profile,
    sync,
    refreshProfile: async () => {
      if (userId.current) await loadProfile(userId.current);
    },
    syncNow: async () => {
      await engine.current?.sync();
    },
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <GuestImportDialog
        answers={guestPrompt}
        onImport={() => {
          actions.importGuestProgress();
          setGuestPrompt(null);
        }}
        onKeepSeparate={() => {
          try {
            if (userId.current) localStorage.setItem(declinedKey(userId.current), "1");
          } catch {}
          setGuestPrompt(null);
        }}
      />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
