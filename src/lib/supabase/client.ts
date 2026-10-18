"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authEnabled, SUPABASE_KEY, SUPABASE_URL } from "./config";

let client: SupabaseClient | null = null;

// one shared browser client. it keeps the session in cookies and refreshes it
// on its own, which is what keeps people logged in between visits
export function getSupabase(): SupabaseClient | null {
  if (!authEnabled) return null;
  if (!client) client = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}
