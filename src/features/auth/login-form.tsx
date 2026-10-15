"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { safeNext } from "@/lib/supabase/redirect";
import { useAuth } from "./auth-provider";
import { AuthDisabled, AuthShell, Divider, Field, FormMessage, GoogleButton, PasswordField, SubmitButton, friendlyAuthError, validEmail } from "./auth-ui";

const LINK_ERROR = "That link didn't finish signing you in. It may have expired or been opened in a different browser. If you just confirmed your email, log in below.";

export function LoginForm() {
  const { status } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/");
  const urlError = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError ? (urlError === "link" ? LINK_ERROR : friendlyAuthError(urlError)) : null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (status === "signed-in") router.replace(next);
  }, [status, next, router]);

  if (status === "disabled") return <AuthDisabled />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validEmail(email)) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    setError(null);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setNeedsConfirm(error.message.toLowerCase().includes("not confirmed"));
      setError(friendlyAuthError(error.message));
      return;
    }
    router.replace(next);
  };

  const resend = async () => {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/` } });
    setResent(true);
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to sync your progress across devices."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            New here?{" "}
            <Link href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </span>
          <Link href="/practice" className="underline-offset-4 hover:text-foreground hover:underline">
            Practice as a guest
          </Link>
        </div>
      }
    >
      <GoogleButton next={next} />
      <Divider />
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && (
          <FormMessage tone="error">
            {error}
            {needsConfirm && (
              <button type="button" onClick={resend} disabled={resent} className="mt-2 block font-medium underline underline-offset-4">
                {resent ? "Confirmation email sent" : "Send the confirmation email again"}
              </button>
            )}
          </FormMessage>
        )}
        <Field label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <PasswordField label="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Link href="/forgot-password" className="mt-2 inline-block text-xs text-primary underline-offset-4 hover:underline">
            Forgot your password?
          </Link>
        </div>
        <SubmitButton loading={loading}>Log in</SubmitButton>
      </form>
    </AuthShell>
  );
}
