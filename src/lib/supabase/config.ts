// public supabase settings. both are safe in the browser: the publishable key
// only allows what row level security allows. never put the secret key here

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// refuse admin keys if one ever gets pasted into a public variable by mistake
export function looksLikeSecretKey(k: string): boolean {
  if (k.startsWith("sb_secret_")) return true;
  const parts = k.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

const unsafe = key !== "" && looksLikeSecretKey(key);
if (unsafe && typeof window !== "undefined") {
  console.error("Kana Dojo: a Supabase secret key was set as a public variable. Accounts are disabled until it's replaced with the publishable key.");
}

export const SUPABASE_URL = url;
export const SUPABASE_KEY = key;

// false = no keys yet (or an unsafe key), the site runs in guest-only mode
export const authEnabled = url !== "" && key !== "" && !unsafe;
