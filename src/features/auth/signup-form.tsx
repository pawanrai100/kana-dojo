"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase/client";
import { safeNext } from "@/lib/supabase/redirect";
import { useAppState } from "@/store/app-store";
import { useAuth } from "./auth-provider";
import { AuthDisabled, AuthShell, Divider, Field, FormMessage, GoogleButton, PasswordField, SubmitButton, friendlyAuthError, passwordProblem, validEmail } from "./auth-ui";

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function SignupForm() {
  const { status } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const app = useAppState();
  const guestAnswers = app && !app.owner ? app.progress.totalAnswered : 0;

  useEffect(() => {
    if (status === "signed-in") router.replace(next);
  }, [status, next, router]);

  if (status === "disabled") return <AuthDisabled />;

  const uname = username.trim().toLowerCase();
  const errors = {
    username: !USERNAME_RE.test(uname) ? "3 to 20 characters: lowercase letters, numbers and _" : null,
    email: !validEmail(email) ? "Enter a valid email address." : null,
    password: passwordProblem(password),
  };
  const show = (k: keyof typeof errors) => (touched ? errors[k] : null);
  const callback = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=${encodeURIComponent(next)}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (errors.username || errors.email || errors.password) return;
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    setError(null);
    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: callback, data: { username: uname } },
    });
    setLoading(false);
    if (error) return setError(friendlyAuthError(error.message));
    // supabase hides whether an email is taken: no identities means it already exists
    if (data.user && data.user.identities?.length === 0) {
      return setError("There's already an account with this email. Try logging in instead.");
    }
    if (data.session) router.replace(next);
    else setSentTo(email.trim());
  };

  const resend = async () => {
    const sb = getSupabase();
    if (!sb || !sentTo) return;
    await sb.auth.resend({ type: "signup", email: sentTo, options: { emailRedirectTo: callback } });
    setResent(true);
  };

  if (sentTo) {
    return (
      <AuthShell title="Check your inbox" subtitle={<>We sent a confirmation link to <strong className="text-foreground">{sentTo}</strong>.</>}>
        <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <MailCheck className="size-7" />
        </div>
        <p className="text-sm text-muted">
          Open the email and tap the link to finish creating your account. It can take a minute, and sometimes lands in spam.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={resend} disabled={resent}>
            {resent ? "Sent again" : "Resend email"}
          </Button>
          <Button variant="ghost" onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free. Your streak and progress sync to every device."
      footer={
        <span>
          Already have an account?{" "}
          <Link href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
        </span>
      }
    >
      {guestAnswers > 0 && (
        <div className="mb-5">
          <FormMessage tone="info">You&apos;ve practiced {guestAnswers} answers as a guest. You can add them to your new account right after signing up.</FormMessage>
        </div>
      )}
      <GoogleButton next={next} label="Sign up with Google" />
      <Divider />
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <Field
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          hint="Shown on your profile. You can change it later."
          error={show("username")}
        />
        <Field label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={show("email")} />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters, with letters and numbers."
          error={show("password")}
        />
        <SubmitButton loading={loading}>Create account</SubmitButton>
      </form>
    </AuthShell>
  );
}
