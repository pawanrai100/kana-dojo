"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { getSupabase } from "@/lib/supabase/client";
import { mergeStudy, studyBackup, type StudyProgress } from "@/lib/learning/study-progress";
import { sanitizeLearning, type LearningProgress } from "@/lib/learning/progress";
import { WORDS } from "@/lib/learning/study-content";
import { SPEAKING_LESSONS } from "@/lib/learning/lessons";
import { useStudy } from "./use-study";
import { useLearning } from "./use-learning";

const panel = "space-y-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-card sm:p-7";
const input = "min-h-12 w-full rounded-xl border-2 border-primary bg-background px-4 py-3";
export function mergeLessons(a: LearningProgress, b: LearningProgress): LearningProgress {
  const result = { ...a }; for (const [id, item] of Object.entries(b)) if (!result[id] || item.completedAt > result[id].completedAt) result[id] = item; return result;
}
export function Notebook({ study, save }: { study: ReturnType<typeof useStudy>; save: (next: StudyProgress) => boolean }) {
  const learning = useLearning(); const auth = useAuth();
  const [notes, setNotes] = useState(study.state.notes); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ study: StudyProgress; lessons: LearningProgress } | null>(null);
  const owner = useRef(auth.user?.id);
  useEffect(() => { owner.current = auth.user?.id; return () => { owner.current = undefined; }; }, [auth.user?.id]);
  const cloud = process.env.NEXT_PUBLIC_STUDY_CLOUD_ENABLED === "true";
  const backup = () => ({ format: "kana-dojo-study-v1", exportedAt: new Date().toISOString(), study: study.state, lessons: learning.progress });
  const download = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(backup(), null, 2)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = "kana-dojo-study-backup.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  async function upload(file: File) {
    setPending(null);
    if (file.size > 250_000) { setMessage("That file is too large. Choose a study backup under 250 KB."); return; }
    try { const raw = JSON.parse(await file.text()); setPending({ study: studyBackup(raw), lessons: sanitizeLearning(raw.lessons) }); setMessage("Backup checked. Review the counts below before merging."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not read that backup."); }
  }
  async function sync() {
    const uid = auth.user?.id; const sb = getSupabase(); if (!uid || !sb || busy || !cloud) return;
    setBusy(true); setMessage("");
    try {
      const { data, error } = await sb.from("study_backups").select("payload,revision").eq("user_id", uid).maybeSingle();
      if (error) throw new Error("Cloud study storage is not available. Your browser copy is safe; export a backup instead.");
      if (owner.current !== uid) return;
      const remote = data ? studyBackup(data.payload) : null;
      const next = remote ? mergeStudy(study.state, remote) : study.state;
      const lessons = data ? mergeLessons(learning.progress, sanitizeLearning(data.payload.lessons)) : learning.progress;
      const payload = { ...backup(), study: next, lessons };
      const result = data
        ? await sb.from("study_backups").update({ payload, revision: data.revision + 1 }).eq("user_id", uid).eq("revision", data.revision).select("revision").maybeSingle()
        : await sb.from("study_backups").insert({ user_id: uid, payload, revision: 1 }).select("revision").single();
      if (result.error || !result.data) throw new Error("The cloud copy changed or could not be saved. Retry to merge the latest version; nothing was overwritten locally.");
      if (owner.current !== uid) return;
      const a = save(next); const b = learning.save(lessons); setNotes(next.notes);
      setMessage(a && b ? "Merged with your cloud backup. Use this button on your other device to bring it up to date." : "Cloud backup saved; local storage is unavailable on this browser.");
    } catch (e) { if (owner.current === uid) setMessage(e instanceof Error ? e.message : "Cloud backup failed. Try again."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5"><section className={panel}><h2 className="font-display text-2xl">Your learning notebook</h2><label>Useful phrases and questions<textarea className={input} rows={6} disabled={busy || !!pending} value={notes} maxLength={5000} onChange={e => setNotes(e.target.value)} placeholder="A phrase I want to use, a question for my tutor…" /></label><p className="text-xs text-muted">{notes.length}/5000 characters. Save before exporting or syncing.</p><Button disabled={busy || !!pending} onClick={() => { const ok = save({ ...study.state, notes, updatedAt: Date.now() }); setMessage(ok ? "Notes saved." : "Notes kept for this session only. Export a backup to keep them."); }}>Save notes</Button><h3 className="font-bold">Saved vocabulary</h3>{study.state.saved.length ? <ul className="space-y-2">{WORDS.filter(w => study.state.saved.includes(w.id)).map(w => <li key={w.id}><span lang="ja">{w.japanese} ({w.kana})</span> — {w.meaning}</li>)}</ul> : <p>Use Save word in Vocabulary to build your personal phrase list.</p>}</section>
    <section className={panel}><h2 className="font-display text-xl">Keep a portable copy</h2><p>Export studio reviews, saved words, notes, preferences, and conversation progress. Import merges newer reviews and combines saved words. Notes and preferences come from the more recently updated copy.</p><Button disabled={notes !== study.state.notes || busy} onClick={download}>Download study backup</Button><label className="block font-bold">Import study backup<input className="mt-2 block max-w-full text-sm" type="file" accept=".json,application/json" disabled={busy || notes !== study.state.notes} onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }} /></label>{pending && <div className="space-y-3 rounded-xl bg-primary-soft p-4"><p>Incoming: {Object.keys(pending.study.reviews).length} reviewed items, {pending.study.saved.length} saved words, {Object.keys(pending.lessons).length} conversation missions.</p><p className="text-sm">If incoming notes are newer, they replace your saved notes. Download your current backup first if you want both copies.</p><Button onClick={() => { const next = mergeStudy(study.state, pending.study); const a = save(next); const b = learning.save(mergeLessons(learning.progress, pending.lessons)); setNotes(next.notes); setPending(null); setMessage(a && b ? "Backup merged." : "Merged for this session. Storage unavailable; export a backup."); }}>Merge this backup</Button><Button variant="ghost" onClick={() => setPending(null)}>Cancel import</Button></div>}</section>
    <section className={panel}><h2 className="font-display text-xl">Cloud backup and merge</h2><p>{cloud ? auth.user ? "Manually merge this device with your account backup. Latest review timestamps win; saved words are combined. This is not automatic background sync." : "Sign in to use account backup." : "Not connected in this preview. Portable file backup works now. Cloud storage must be configured separately before this control can connect."}</p><Button disabled={!cloud || !auth.user || busy || notes !== study.state.notes || !!pending} onClick={() => void sync()}>{busy ? "Merging…" : "Merge with cloud backup"}</Button></section><p role="status">{message}</p></div>;
}
export function PreviewStatus() {
  return <section className={panel}><h2 className="font-display text-2xl">What you can try in this preview</h2><p>This preview expands the learning experience. It does not publish changes to the production website.</p><div className="space-y-4">{[
    ["Ready to try", "Daily study plan; 48 vocabulary cards with examples, search, saved words and reviews; eight sentence builders; 12 kanji recognition cards; four sound contrasts; shadowing; 12 guided missions and scripted roleplays; notes and portable backup."],
    ["Depends on your device", "Japanese model speech needs a Japanese browser/OS voice. Optional recording needs microphone permission. Written practice remains available."],
    ["Integration built · configuration needed", "AI tutor requires a server API key, selected model and approved preview account. Cloud backup requires a separate Supabase table and preview configuration. Neither is silently simulated."],
    ["Not included / needs specialist work", "Human-recorded audio, validated pronunciation or pitch-accent scoring, live voice AI conversation, teacher-reviewed curriculum, handwriting stroke assessment and a full intermediate course. Recording and self-checks do not substitute for these."],
    ["Before production", "Review Japanese content with a teacher, test real microphones and mobile keyboards, exercise real account/cloud flows, and evaluate tutor output and service budgets."],
  ].map(([title, text]) => <article key={title} className="rounded-xl bg-background p-4"><h3 className="font-bold text-primary">{title}</h3><p className="mt-2 text-sm">{text}</p></article>)}</div><Button asChild><Link href="/learn">Try conversation lessons</Link></Button></section>;
}
export function Tutor() {
  const [available, setAvailable] = useState<boolean | null>(null); const [consent, setConsent] = useState(false);
  const [scenario, setScenario] = useState(SPEAKING_LESSONS[0].id); const [reply, setReply] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => { const check = new AbortController(); fetch("/api/tutor", { signal: check.signal }).then(r => r.json()).then(d => setAvailable(d.available === true)).catch(() => { if (!check.signal.aborted) setAvailable(false); }); return () => { check.abort(); controller.current?.abort(); }; }, []);
  async function send() {
    if (!consent || !reply.trim() || busy || !available || messages.length >= 20) return;
    const next = [...messages, { role: "user" as const, content: reply.trim() }]; setBusy(true); setError("");
    controller.current = new AbortController();
    try {
      const response = await fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario, messages: next }), signal: controller.current.signal });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "The tutor is unavailable. Try scripted roleplay.");
      setMessages([...next, { role: "assistant", content: data.reply }]); setReply("");
    } catch (e) { if (!controller.current?.signal.aborted) setError(e instanceof Error ? e.message : "Connection failed. Your reply is still here."); }
    finally { setBusy(false); }
  }
  return <section className={panel}><h2 className="font-display text-2xl">A patient Japanese conversation partner</h2><p>Practise a short scenario with generated replies and one gentle correction at a time. AI can make mistakes; it does not certify your level or pronunciation.</p><p role="status" className="rounded-xl bg-primary-soft p-4">{available === null ? "Checking tutor availability…" : available ? "Tutor service configured. An approved preview account is required." : "AI tutor is not connected in this preview. You can use all 12 scripted roleplays now; no API key is needed for those."}</p><label>Scenario<select className={input} disabled={busy || messages.length > 0} value={scenario} onChange={e => setScenario(e.target.value)}>{SPEAKING_LESSONS.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></label><label className="flex items-start gap-3"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>I agree to send this typed conversation to the AI provider when I press Send. Avoid personal information. No microphone recording is sent.</span></label><div aria-live="polite" className="space-y-3">{messages.map((m, i) => <div key={i} className={`whitespace-pre-wrap break-words rounded-xl p-4 ${m.role === "user" ? "bg-background" : "bg-primary-soft"}`}><p className="mb-2 text-xs font-bold">{m.role === "user" ? "You" : "AI partner"}</p>{m.content}</div>)}</div><label>Your message<textarea rows={3} className={input} value={reply} maxLength={500} disabled={busy} onChange={e => setReply(e.target.value)} placeholder="こんにちは。 / Help me order a coffee." /></label><div className="flex flex-wrap gap-3"><Button disabled={!available || !consent || !reply.trim() || busy || messages.length >= 20} onClick={() => void send()}>{busy ? "Partner is thinking…" : "Send to AI tutor"}</Button><Button variant="ghost" disabled={busy} onClick={() => { setMessages([]); setReply(""); setError(""); }}>Clear conversation</Button><a href="#roleplay" className="p-3 font-bold text-primary">Use scripted roleplay</a></div>{messages.length >= 20 && <p>Session complete. Start a fresh conversation to practise another scenario.</p>}<p role="alert">{error}</p><p className="text-xs text-muted">Conversation stays in this tab. Clearing or leaving removes it from this interface; provider processing follows its own policy.</p></section>;
}
