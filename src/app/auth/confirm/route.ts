import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { authEnabled } from "@/lib/supabase/config";
import { getServerSupabase, safeNext } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["signup", "recovery", "invite", "magiclink", "email_change", "email"];

// optional: email links that work on any device. used when the supabase email
// templates point at /auth/confirm (see SETUP-ACCOUNTS.md)
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const back = (path: string) => NextResponse.redirect(new URL(path, url.origin));
  if (!authEnabled) return back("/");

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const fallback = type === "recovery" ? "/reset-password" : "/";
  const next = safeNext(url.searchParams.get("next"), fallback);

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return back(next);
  }
  return back("/login?error=link");
}
