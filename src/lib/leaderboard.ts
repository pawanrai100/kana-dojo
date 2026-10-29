import type { SupabaseClient } from "@supabase/supabase-js";
import { dayKey } from "@/lib/progress/stats";

// one line on the weekly board. the database works these out from synced progress
// and never sends anyone's actual progress (see supabase/migrations/0002_leaderboard.sql)
export interface BoardRow {
  rank: number | null; // null = you, but not on the board (hidden or no score yet)
  username: string;
  display_name: string | null;
  avatar_kana: string;
  belt: number;
  score: number; // correct answers this week
  is_me: boolean;
  hidden: boolean;
}

export type BoardResult = { ok: true; rows: BoardRow[] } | { ok: false; reason: "not-ready" | "failed" };

// monday of this week, in your own time zone
export function weekStart(now = Date.now()): string {
  const d = new Date(now);
  const back = (d.getDay() + 6) % 7;
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime());
}

// counting today, so sunday = 1
export function daysLeft(now = Date.now()): number {
  return 7 - ((new Date(now).getDay() + 6) % 7);
}

// the same number the board shows for you, worked out locally
export function weekScore(days: Record<string, { correct: number }>, now = Date.now()): number {
  const start = weekStart(now);
  const end = dayKey(new Date(`${start}T12:00:00`).getTime() + 6 * 86_400_000);
  return Object.entries(days).reduce((n, [k, d]) => (k >= start && k <= end ? n + Math.min(Math.max(d.correct, 0), 5000) : n), 0);
}

const MISSING_FUNCTION = "PGRST202";

export async function fetchBoard(sb: SupabaseClient, now = Date.now()): Promise<BoardResult> {
  const { data, error } = await sb.rpc("weekly_leaderboard", { week_start: weekStart(now) });
  if (error) return { ok: false, reason: error.code === MISSING_FUNCTION ? "not-ready" : "failed" };
  return { ok: true, rows: (data ?? []) as BoardRow[] };
}

// null when the setting isn't there yet (the sql hasn't been run)
export async function getShowOnBoard(sb: SupabaseClient, userId: string): Promise<boolean | null> {
  const { data, error } = await sb.from("profiles").select("show_on_leaderboard").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return data.show_on_leaderboard;
}

export async function setShowOnBoard(sb: SupabaseClient, userId: string, show: boolean): Promise<boolean> {
  const { error } = await sb.from("profiles").update({ show_on_leaderboard: show }).eq("id", userId);
  return !error;
}
