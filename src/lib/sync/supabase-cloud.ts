import type { SupabaseClient } from "@supabase/supabase-js";
import type { Progress } from "@/lib/progress/types";
import type { Settings } from "@/lib/settings/types";
import type { CloudRepo, CloudRow, WriteResult } from "./types";

const TABLE = "user_progress";
const UNIQUE_VIOLATION = "23505";

// row level security makes sure this can only ever reach the signed in user's row
export function supabaseCloud(client: SupabaseClient, userId: string): CloudRepo {
  return {
    async fetch(): Promise<CloudRow | null> {
      const { data, error } = await client
        .from(TABLE)
        .select("progress, settings, rev")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },

    async insert(progress: Progress, settings: Settings): Promise<WriteResult> {
      const { data, error } = await client
        .from(TABLE)
        .insert({ user_id: userId, progress, settings, rev: 1 })
        .select("rev")
        .single();
      if (error?.code === UNIQUE_VIOLATION) return { ok: false, conflict: true };
      if (error) throw new Error(error.message);
      return { ok: true, rev: data.rev };
    },

    async update(progress: Progress, settings: Settings, expectedRev: number): Promise<WriteResult> {
      const { data, error } = await client
        .from(TABLE)
        .update({ progress, settings, rev: expectedRev + 1 })
        .eq("user_id", userId)
        .eq("rev", expectedRev)
        .select("rev");
      if (error) throw new Error(error.message);
      // no row matched: another device saved first
      if (!data || data.length === 0) return { ok: false, conflict: true };
      return { ok: true, rev: data[0].rev };
    },
  };
}
