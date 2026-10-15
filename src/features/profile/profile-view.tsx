"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CloudUpload, Download, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, PageSkeleton } from "@/components/layout/page-header";
import { accuracy, currentStreak, levelInfo, masteredChars, rankTitle, wordsLearned } from "@/lib/progress/stats";
import type { Progress } from "@/lib/progress/types";
import { getSupabase } from "@/lib/supabase/client";
import { cn, pct, plural } from "@/lib/utils";
import { useAppState } from "@/store/app-store";
import { useAuth, type Profile } from "@/features/auth/auth-provider";
import { Avatar, SyncBadge, displayName } from "@/features/auth/account-bits";
import { Field, FormMessage, PasswordField, friendlyAuthError, passwordProblem } from "@/features/auth/auth-ui";
import { USERNAME_RE } from "@/features/auth/signup-form";

const AVATAR_KANA = ["か", "さ", "た", "な", "は", "ま", "や", "ら", "わ", "ね", "の", "ゆ", "そ", "ほ", "み", "ん"];

export function ProfileView() {
  const auth = useAuth();
  const app = useAppState();
  if (!app || auth.status === "loading") return <PageSkeleton />;
  if (auth.status !== "signed-in") return <GuestProfile progress={app.progress} enabled={auth.status !== "disabled"} />;
  return <SignedInProfile progress={app.progress} />;
}

function StatGrid({ progress }: { progress: Progress }) {
  const lvl = levelInfo(progress.xp);
  const tiles = [
    { label: "Level", value: String(lvl.level), sub: rankTitle(lvl.level) },
    { label: "Total XP", value: progress.xp.toLocaleString(), sub: `${lvl.needed - lvl.intoLevel} to next level` },
    { label: "Accuracy", value: progress.totalAnswered ? pct(accuracy(progress.totalCorrect, progress.totalAnswered)) : "No data", sub: plural(progress.totalAnswered, "answer") },
    { label: "Mastered", value: `${masteredChars(progress).length}/46`, sub: "hiragana" },
    { label: "Streak", value: plural(currentStreak(progress), "day"), sub: `Best ${plural(progress.bestStreak, "day")}` },
    { label: "Words learned", value: String(wordsLearned(progress)), sub: plural(progress.roundsCompleted, "round") },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-surface-2/60 p-3.5">
            <p className="text-xs text-muted">{t.label}</p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums">{t.value}</p>
            <p className="text-xs text-muted">{t.sub}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs text-muted">
          <span>Level {lvl.level}</span>
          <span>
            {lvl.intoLevel}/{lvl.needed} XP
          </span>
        </div>
        <ProgressBar value={lvl.pct} label="Level progress" />
      </div>
    </div>
  );
}

function GuestProfile({ progress, enabled }: { progress: Progress; enabled: boolean }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Profile" />
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <span className="font-kana grid size-20 shrink-0 place-items-center rounded-full bg-surface-2 text-4xl text-muted" aria-hidden>
            ？
          </span>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">You&apos;re practicing as a guest</h2>
            <p className="mt-1 max-w-prose text-sm text-muted">
              {enabled
                ? "Your progress is saved in this browser only. Create a free account to keep it safe and pick up on any device."
                : "Your progress is saved in this browser. Accounts are coming soon."}
            </p>
          </div>
          {enabled && (
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/signup?next=/profile">Create account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login?next=/profile">Log in</Link>
              </Button>
            </div>
          )}
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Your progress on this device</CardTitle>
        </CardHeader>
        <CardContent>
          <StatGrid progress={progress} />
        </CardContent>
      </Card>
    </div>
  );
}

function SignedInProfile({ progress }: { progress: Progress }) {
  const { user, profile, sync, syncNow } = useAuth();
  const email = user?.email ?? null;
  const providers = (user?.app_metadata?.providers as string[] | undefined) ?? [user?.app_metadata?.provider ?? "email"];
  const usesPassword = providers.includes("email");
  const joined = profile?.created_at ?? user?.created_at;

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" />

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar profile={profile} size={84} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-2xl font-semibold tracking-tight">{displayName(profile, email)}</h2>
            <p className="text-sm text-muted">
              {profile ? `@${profile.username}` : "Loading profile…"}
              {joined && <>, joined {new Date(joined).toLocaleDateString([], { month: "long", year: "numeric" })}</>}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <SyncBadge status={sync} />
              {(sync === "error" || sync === "offline") && (
                <button type="button" onClick={() => void syncNow()} className="text-xs text-primary underline-offset-4 hover:underline">
                  Try now
                </button>
              )}
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/progress">Full statistics</Link>
          </Button>
        </div>
        <div className="mt-6 border-t border-border pt-6">
          <StatGrid progress={progress} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {profile && <EditProfile profile={profile} />}
        <AccountCard email={email} providers={providers} usesPassword={usesPassword} />
      </div>
    </div>
  );
}

function EditProfile({ profile }: { profile: Profile }) {
  const { refreshProfile } = useAuth();
  const [name, setName] = useState(profile.display_name ?? "");
  const [username, setUsername] = useState(profile.username);
  const [kana, setKana] = useState(profile.avatar_kana);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const uname = username.trim().toLowerCase();
  const unameError = USERNAME_RE.test(uname) ? null : "3 to 20 characters: lowercase letters, numbers and _";
  const nameError = name.trim().length > 40 ? "40 characters max." : null;
  const changed = name.trim() !== (profile.display_name ?? "") || uname !== profile.username || kana !== profile.avatar_kana;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (unameError || nameError || !changed) return;
    const sb = getSupabase();
    if (!sb) return;
    setSaving(true);
    setMsg(null);
    const { error } = await sb
      .from("profiles")
      .update({ display_name: name.trim() || null, username: uname, avatar_kana: kana })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      setMsg({ tone: "error", text: error.code === "23505" ? "That username is taken. Try another." : friendlyAuthError(error.message) });
      return;
    }
    await refreshProfile();
    setMsg({ tone: "success", text: "Profile saved." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit profile</CardTitle>
        <CardDescription>How you appear in Kana Dojo.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} noValidate className="space-y-4">
          {msg && <FormMessage tone={msg.tone}>{msg.text}</FormMessage>}
          <Field label="Display name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={profile.username} error={nameError} />
          <Field
            label="Username"
            value={username}
            maxLength={20}
            autoCapitalize="none"
            spellCheck={false}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            error={unameError}
          />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Avatar</legend>
            {profile.avatar_url && <p className="mb-2 text-xs text-muted">Your Google photo is shown. The kana is used if the photo isn&apos;t available.</p>}
            <div role="radiogroup" aria-label="Avatar kana" className="flex flex-wrap gap-1.5">
              {AVATAR_KANA.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={k === kana}
                  aria-label={`Avatar ${k}`}
                  onClick={() => setKana(k)}
                  className={cn(
                    "font-kana grid size-10 place-items-center rounded-full text-lg transition-colors",
                    k === kana ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted hover:text-foreground",
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          </fieldset>
          <Button type="submit" disabled={saving || !changed || !!unameError || !!nameError}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AccountCard({ email, providers, usesPassword }: { email: string | null; providers: string[]; usesPassword: boolean }) {
  const { signOut } = useAuth();
  const app = useAppState();
  const router = useRouter();
  const [busy, setBusy] = useState<"local" | "global" | null>(null);
  const [pending, setPending] = useState<{ everywhere: boolean } | null>(null);

  const doSignOut = async (everywhere: boolean, force = false) => {
    setBusy(everywhere ? "global" : "local");
    const res = await signOut({ everywhere, force });
    setBusy(null);
    if (res.unsynced) return setPending({ everywhere });
    setPending(null);
    router.replace("/");
  };

  const download = () => {
    if (!app) return;
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), settings: app.settings, progress: app.progress }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kana-dojo-progress.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Sign in details and security.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Email</dt>
            <dd className="truncate">{email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Signs in with</dt>
            <dd>{providers.map((p) => (p === "google" ? "Google" : p === "email" ? "Email and password" : p)).join(", ")}</dd>
          </div>
        </dl>

        {usesPassword && <ChangePassword />}

        <div className="flex flex-wrap gap-2 border-t border-border pt-5">
          <Button variant="outline" onClick={() => doSignOut(false)} disabled={!!busy}>
            <LogOut /> {busy === "local" ? "Signing out…" : "Sign out"}
          </Button>
          <Button variant="ghost" onClick={() => doSignOut(true)} disabled={!!busy}>
            <ShieldCheck /> {busy === "global" ? "Signing out…" : "Sign out on all devices"}
          </Button>
          <Button variant="ghost" onClick={download}>
            <Download /> Download my data
          </Button>
        </div>
      </CardContent>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-sakura-soft text-sakura">
            <CloudUpload className="size-6" />
          </div>
          <DialogTitle>Some progress hasn&apos;t uploaded yet</DialogTitle>
          <DialogDescription className="mt-2">
            We couldn&apos;t reach the server, so your latest rounds are only on this device. If you sign out now, they&apos;ll be lost.
            Reconnect to the internet and try again, or download a backup first.
          </DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" className="text-bad" onClick={() => pending && doSignOut(pending.everywhere, true)}>
              Sign out anyway
            </Button>
            <Button variant="outline" onClick={download}>
              Download backup
            </Button>
            <Button onClick={() => setPending(null)}>Stay signed in</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const problem = passwordProblem(pw);

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Change password
      </Button>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (problem) return;
    const sb = getSupabase();
    if (!sb) return;
    setSaving(true);
    const { error } = await sb.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) return setMsg({ tone: "error", text: friendlyAuthError(error.message) });
    setMsg({ tone: "success", text: "Password changed." });
    setPw("");
    setTouched(false);
  };

  return (
    <form onSubmit={save} noValidate className="space-y-3 rounded-xl bg-surface-2/50 p-4">
      {msg && <FormMessage tone={msg.tone}>{msg.text}</FormMessage>}
      <PasswordField label="New password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} error={touched ? problem : null} hint="At least 8 characters, with letters and numbers." />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Save password"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
