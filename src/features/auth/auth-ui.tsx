"use client";

import Link from "next/link";
import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// two column frame: a quiet kana panel on wide screens, the form on the right
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-card md:grid-cols-[0.9fr_1fr]">
      <div aria-hidden className="relative hidden flex-col justify-between bg-primary p-8 text-primary-foreground md:flex">
        <span className="text-sm opacity-80">Kana Dojo</span>
        <div className="font-kana select-none text-[9rem] leading-none opacity-95">
          あ<span className="opacity-40">い</span>
        </div>
        <p className="max-w-[16rem] text-sm leading-relaxed opacity-85">
          Read a little every day. Your streak, mastery and settings follow you to every device.
        </p>
      </div>
      <div className="p-6 sm:p-10">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
        <div className="mt-7">{children}</div>
        {footer && <div className="mt-6 border-t border-border pt-5 text-sm text-muted">{footer}</div>}
        <p className="mt-5 text-xs text-muted">
          By continuing you agree to the{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">Terms</Link> and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
  trailing?: React.ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, hint, error, trailing, className, id, ...props }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            "h-11 w-full rounded-xl border bg-background px-3 text-[15px] outline-none transition-colors placeholder:text-muted/60 focus:border-primary",
            error ? "border-bad" : "border-border",
            trailing && "pr-11",
            className,
          )}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-bad">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export function PasswordField(props: Omit<FieldProps, "type" | "trailing">) {
  const [show, setShow] = useState(false);
  return (
    <Field
      {...props}
      type={show ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  );
}

export function SubmitButton({ loading, children, className }: { loading: boolean; children: React.ReactNode; className?: string }) {
  return (
    <Button type="submit" size="lg" disabled={loading} className={cn("w-full", className)}>
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}

export function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-muted">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "info" | "success"; children: React.ReactNode }) {
  const tones = { error: "bg-bad-soft text-bad", info: "bg-primary-soft text-primary", success: "bg-good-soft text-good" };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl px-4 py-3 text-sm", tones[tone])}>
      {children}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-[18px]">
      <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8.1Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4Z" />
    </svg>
  );
}

export function GoogleButton({ next, label = "Continue with Google" }: { next: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setLoading(true);
    setError(null);
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    // on success the browser leaves for google, so we only get here on failure
    if (error) {
      setError(friendlyAuthError(error.message));
      setLoading(false);
    }
  };
  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="lg" className="w-full" onClick={go} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <GoogleMark />}
        {label}
      </Button>
      {error && <p className="text-xs text-bad">{error}</p>}
    </div>
  );
}

// turn supabase's messages into plain ones
export function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Check for typos, or reset your password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. We sent you a link when you signed up.";
  if (m.includes("user already registered")) return "There's already an account with this email. Try logging in instead.";
  if (m.includes("password should be") || m.includes("weak password")) return "Pick a stronger password: at least 8 characters, mixing letters and numbers.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many tries in a short time. Wait a minute and try again.";
  if (m.includes("provider is not enabled")) return "Google sign in isn't switched on yet for this site.";
  if (m.includes("same password") || m.includes("different from the old")) return "Your new password has to be different from the old one.";
  if (m.includes("fetch") || m.includes("network")) return "Couldn't reach the server. Check your connection and try again.";
  if (m.includes("signups not allowed")) return "New sign ups are turned off right now.";
  return msg;
}

export function validEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Use at least 8 characters.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return "Mix letters and numbers.";
  return null;
}

export function AuthDisabled() {
  return (
    <AuthShell title="Accounts are coming soon" subtitle="Sign in isn't switched on for this site yet.">
      <p className="text-sm text-muted">You can keep practicing as a guest. Your progress saves in this browser.</p>
      <Button asChild size="lg" className="mt-6 w-full">
        <Link href="/practice">Keep practicing</Link>
      </Button>
    </AuthShell>
  );
}
