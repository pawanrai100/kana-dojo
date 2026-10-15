import { NextResponse, type NextRequest } from "next/server";
import { authEnabled } from "@/lib/supabase/config";
import { getServerSupabase, safeNext } from "@/lib/supabase/server";

// google sign in, email confirmation and password reset links all land here
// with a one time code that we trade for a session cookie
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const back = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  if (!authEnabled) return back("/");

  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (providerError) return back(`/login?error=${encodeURIComponent(providerError)}`);

  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return back(next);
  }
  // usually an email link opened on a different device or browser. the email
  // is still confirmed, they just need to log in here
  return back("/login?error=link");
}
