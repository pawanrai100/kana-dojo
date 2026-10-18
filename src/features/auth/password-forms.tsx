"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "./auth-provider";
import { AuthDisabled, AuthShell, Field, FormMessage, PasswordField, SubmitButton, friendlyAuthError, passwordProblem, validEmail } from "./auth-ui";

export function ForgotPasswordForm() {
  const { status } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (status === "disabled") return <AuthDisabled />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validEmail(email)) return setError("Enter a valid email address.");
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    setError(null);
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    // rate limits are worth showing, everything else looks the same so nobody
    // can use this form to find out which emails have accounts
    if (error && /rate|too many/i.test(error.message)) return setError(friendlyAuthError(error.message));
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle="If an account uses that address, a reset link is on its way.">
        <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <MailCheck className="size-7" />
        </div>
        <p className="text-sm text-muted">The link works once and expires after an hour. Open it on this device for the smoothest reset.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/login">Back to log in</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your account email and we'll send you a reset link."
      footer={
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <Field label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <SubmitButton loading={loading}>Send reset link</SubmitButton>
      </form>
    </AuthShell>
  );
}

// reached from the email link, which signs the user in for this one purpose
export function ResetPasswordForm() {
  const { status } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (status === "disabled") return <AuthDisabled />;
  if (status === "loading") return <AuthShell title="Reset your password"><p className="text-sm text-muted">Checking your link…</p></AuthShell>;
  if (status === "guest" && !done) {
    return (
      <AuthShell title="This reset link has expired" subtitle="Reset links work once and only for an hour.">
        <Button asChild size="lg" className="w-full">
          <Link href="/forgot-password">Send a new link</Link>
        </Button>
      </AuthShell>
    );
  }

  const problem = passwordProblem(password);
  const mismatch = confirm !== password ? "The passwords don't match." : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (problem || mismatch) return;
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    setError(null);
    const { error } = await sb.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(friendlyAuthError(error.message));
    setDone(true);
  };

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You're signed in with your new password.">
        <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-good-soft text-good">
          <KeyRound className="size-7" />
        </div>
        <Button size="lg" className="w-full" onClick={() => router.replace("/")}>
          Go to dashboard
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Make it something you don't use on other sites.">
      <form onSubmit={submit} noValidate className="space-y-4">
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <PasswordField label="New password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters, with letters and numbers." error={touched ? problem : null} />
        <PasswordField label="Confirm new password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={touched ? mismatch : null} />
        <SubmitButton loading={loading}>Save new password</SubmitButton>
      </form>
    </AuthShell>
  );
}
