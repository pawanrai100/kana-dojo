"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Ear, MessageCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { SpeechControls } from "@/components/learning/pronunciation";
import { VoiceRecorder } from "@/components/learning/voice-recorder";
import { listeningOptions, matchesReply, SPEAKING_LESSONS, type SpeakingLesson } from "@/lib/learning/lessons";
import { completeLesson, recommendedLesson } from "@/lib/learning/progress";
import { useLearning } from "./use-learning";

export function LearningView() {
  const learning = useLearning();
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => { const update = () => setNow(Date.now()); update(); const timer = setInterval(update, 60_000); return () => clearInterval(timer); }, []);
  const lesson = SPEAKING_LESSONS.find((l) => l.id === selected);
  const recommended = recommendedLesson(learning.progress, now);
  if (learning.loading) return <p role="status">Loading your learning path…</p>;
  if (lesson) return <LessonPlayer key={`${lesson.id}-${learning.owner}`} lesson={lesson} onExit={() => setSelected(null)} />;

  return <div className="space-y-6">
    <PageHeader title="Your first conversations" description="Start speaking while you learn kana. Listen, understand, and practise a short exchange. Every lesson is open from day one." />
    <section className="rounded-[var(--radius-card)] bg-primary p-6 text-primary-foreground shadow-card sm:p-8" aria-label="Today's lesson">
      <p className="text-sm font-extrabold">{learning.progress[recommended.id]?.dueAt <= now ? "Review due" : "Today's lesson"} · about 5–10 minutes</p>
      <h2 className="font-display mt-2 text-2xl">{recommended.title}</h2>
      <p className="my-4">{recommended.goal}</p>
      <Button variant="sun" onClick={() => setSelected(recommended.id)}>Start recommended lesson <ArrowRight aria-hidden /></Button>
    </section>
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Conversation lessons">
      {SPEAKING_LESSONS.map((l, i) => {
        const review = learning.progress[l.id];
        return <li key={l.id} className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
          <p className="text-xs font-extrabold text-primary">Mission {i + 1} · polite Japanese</p>
          <h2 className="font-display text-xl">{l.title}</h2>
          <p className="flex-1 text-sm text-muted">{l.goal}</p>
          <p className="text-sm font-bold">{!review ? "Ready to start" : review.dueAt <= now ? "Review due" : review.independent ? "Completed without revealed answers · self-assessed speaking" : "Completed with help"}</p>
          {review && <p className="text-xs text-muted">Review {new Date(review.dueAt).toLocaleDateString()}</p>}
          <Button variant="secondary" aria-label={`${review ? "Practise again" : "Start lesson"}: ${l.title}`} onClick={() => setSelected(l.id)}>{review ? "Practise again" : "Start lesson"}</Button>
        </li>;
      })}
    </ol>
    <p className="text-sm text-muted">Lesson progress is saved on this browser, separately for each account or guest. It does not sync across devices yet. Speech uses your device&apos;s Japanese voice; availability and quality vary.</p>
    <Button asChild variant="outline"><Link href="/practice">Practise kana instead</Link></Button>
  </div>;
}

function LessonPlayer({ lesson, onExit }: { lesson: SpeakingLesson; onExit: () => void }) {
  const learning = useLearning();
  const [phase, setPhase] = useState<"learn" | "listen" | "speak" | "done">("learn");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [reply, setReply] = useState("");
  const [feedback, setFeedback] = useState("");
  const [turnDone, setTurnDone] = useState(false);
  const [aloud, setAloud] = useState(false);
  const [saved, setSaved] = useState(true);
  const phrase = lesson.phrases[index];
  const turn = lesson.turns[index];

  const nextTurn = () => {
    if (index + 1 < lesson.turns.length) {
      setIndex(index + 1); setReply(""); setFeedback(""); setRevealed(false); setTurnDone(false); setAloud(false);
    } else {
      setSaved(learning.save(completeLesson(learning.progress, lesson.id, !assisted, Date.now())));
      setPhase("done");
    }
  };

  return <div className="mx-auto max-w-3xl space-y-6">
    <Button variant="ghost" onClick={onExit}><ArrowLeft aria-hidden /> All lessons</Button>
    <PageHeader title={lesson.title} description={lesson.goal} />
    <ol aria-label="Lesson steps" className="flex flex-wrap gap-3 text-sm font-bold">
      {["learn", "listen", "speak", "done"].map((step, i) => <li key={step} aria-current={phase === step ? "step" : undefined} className={phase === step ? "rounded-full bg-primary-soft px-3 py-2 text-primary" : "px-3 py-2 text-muted"}>{i + 1}. {step === "done" ? "Reflect" : step[0].toUpperCase() + step.slice(1)}</li>)}
    </ol>
    {phase === "learn" && <>
      <p className="rounded-2xl bg-sun-soft p-4 text-sm">{lesson.setting} Listen, repeat, and notice the pattern. Audio is synthesized, not a human recording.</p>
      {lesson.phrases.map((p) => <article key={p.id} className="space-y-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
        <h2 lang="ja" className="font-kana break-words text-2xl">{p.japanese}</h2>
        <p className="font-bold text-primary">{p.reading}</p><p className="font-bold">{p.meaning}</p>
        <p className="text-sm text-muted">{p.note}</p><SpeechControls text={p.speech} />
      </article>)}
      <Button onClick={() => { setPhase("listen"); setIndex(0); }}><Ear aria-hidden /> Try listening</Button>
    </>}

    {phase === "listen" && <section key={phrase.id} className="space-y-5 rounded-[var(--radius-card)] bg-surface p-5 shadow-card sm:p-7" aria-label="Listening check">
      <p className="text-sm font-bold text-primary">Listening {index + 1} of {lesson.phrases.length}</p>
      <h2 className="font-display text-2xl">What does it mean?</h2>
      <SpeechControls text={phrase.speech} />
      <Button variant="ghost" onClick={() => { setRevealed(true); setAssisted(true); }}>Show text / audio unavailable</Button>
      {revealed && <p lang="ja" className="font-kana text-xl">{phrase.japanese}</p>}
      <div className="grid gap-3">{listeningOptions(lesson, phrase).map((meaning) => <Button key={meaning} variant={selected === meaning ? "secondary" : "outline"} className="h-auto min-h-12 justify-start whitespace-normal py-3 text-left" disabled={selected === phrase.meaning} onClick={() => {
        setSelected(meaning); if (meaning !== phrase.meaning) setAssisted(true);
      }}>{meaning}</Button>)}</div>
      {selected && <p role="status" className="font-bold">{selected === phrase.meaning ? "That's right." : "Not quite. Replay the audio and try again."}</p>}
      {selected === phrase.meaning && <Button onClick={() => {
        setSelected(""); setRevealed(false);
        if (index + 1 < lesson.phrases.length) setIndex(index + 1);
        else { setPhase("speak"); setIndex(0); }
      }}>{index + 1 < lesson.phrases.length ? "Next listening check" : "Try the conversation"}<ArrowRight aria-hidden /></Button>}
    </section>}

    {phase === "speak" && <section key={turn.prompt} className="space-y-5 rounded-[var(--radius-card)] bg-surface p-5 shadow-card sm:p-7" aria-label="Conversation practice">
      <p className="text-sm font-bold text-primary">Conversation {index + 1} of {lesson.turns.length}</p>
      <h2 className="font-display text-2xl">Your partner says…</h2>
      <SpeechControls text={turn.speech} />
      <details><summary className="cursor-pointer font-bold text-primary" onClick={() => setAssisted(true)}>Show partner&apos;s words and meaning</summary><p lang="ja" className="font-kana mt-3 text-xl">{turn.prompt}</p><p>{turn.meaning}</p></details>
      <p className="rounded-2xl bg-primary-soft p-4 font-bold">{turn.hint}</p>
      <VoiceRecorder />
      <p className="text-sm text-muted">Speak aloud first if you can. Typed practice checks a few sample replies; other natural replies may also be valid.</p>
      <label htmlFor="conversation-reply" className="block font-bold">Optional typed reply (Japanese or romaji)</label>
      <input id="conversation-reply" value={reply} onChange={(e) => { setReply(e.target.value); setFeedback(""); setTurnDone(false); }} onKeyDown={(e) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing && reply.trim()) {
          const ok = matchesReply(turn, reply); setTurnDone(ok); setFeedback(ok ? "That matches a sample reply." : "That doesn't match the sample replies. Try again or compare with the model; your wording may still be valid."); if (!ok) setAssisted(true);
        }
      }} autoComplete="off" maxLength={180} className="min-h-12 w-full rounded-xl border-2 border-primary bg-background px-4 py-3" />
      <div className="flex flex-wrap gap-3">
        <Button disabled={!reply.trim()} onClick={() => { const ok = matchesReply(turn, reply); setTurnDone(ok); setFeedback(ok ? "That matches a sample reply." : "That doesn't match the sample replies. Try again or compare with the model; your wording may still be valid."); if (!ok) setAssisted(true); }}>Check typed reply</Button>
        <Button variant="outline" onClick={() => { setAloud(true); setRevealed(true); }}>I said my reply aloud</Button>
        <Button variant="ghost" onClick={() => { setRevealed(true); setAssisted(true); }}>I need a model reply</Button>
      </div>
      {feedback && <p role="status" className="text-sm font-bold">{feedback}</p>}
      {revealed && <div className="space-y-3 rounded-2xl bg-background p-4">
        <p className="text-sm font-bold">One possible reply</p><p lang="ja" className="font-kana text-2xl">{turn.model}</p><p>{turn.reading}</p><SpeechControls text={turn.model} />
        {aloud && !turnDone && <p className="text-sm text-muted">Compare your reply with the model. This is your own assessment; no pronunciation score is calculated.</p>}
        {!turnDone && <div className="flex flex-wrap gap-3">
          {aloud && <Button variant="secondary" onClick={() => setTurnDone(true)}>I communicated this without help</Button>}
          <Button variant="outline" onClick={() => { setAssisted(true); setTurnDone(true); }}>I practised with the model</Button>
        </div>}
      </div>}
      {turnDone && <Button onClick={nextTurn}>{index + 1 < lesson.turns.length ? "Next exchange" : "Finish lesson"}<ArrowRight aria-hidden /></Button>}
    </section>}

    {phase === "done" && <section className="space-y-5 rounded-[var(--radius-card)] bg-surface p-6 shadow-card" aria-label="Lesson reflection">
      <Check className="size-10 text-good" aria-hidden /><h2 className="font-display text-2xl">You practised a real exchange.</h2>
      <p>{lesson.goal}</p><p className="font-bold text-primary">{assisted ? "Completed with help. Try again tomorrow with fewer hints." : "Completed without revealed answers. Speaking was self-assessed."}</p>
      <p className="text-sm text-muted">{saved ? "A review is scheduled in this browser. Repeating early won’t push the review further away." : "Browser storage is unavailable. Your progress is available for this session, but may be lost on reload."}</p>
      <p className="text-sm">Try the exchange again later with a friend, tutor, or conversation partner.</p>
      <Button onClick={onExit}><RotateCcw aria-hidden /> Back to learning path</Button>
    </section>}
  </div>;
}

export function LearningCard() {
  return <section aria-label="Start speaking" className="flex flex-wrap items-center gap-5 rounded-[var(--radius-card)] bg-primary-soft p-6 shadow-card">
    <MessageCircle className="size-10 shrink-0 text-primary" aria-hidden />
    <div className="min-w-0 flex-1 basis-60"><h2 className="font-display text-xl">Your first Japanese conversation</h2><p className="mt-1 text-sm text-muted">You don&apos;t need to finish kana first. Learn useful phrases, listen, and practise a reply.</p></div>
    <Button asChild><Link href="/learn">Start speaking <ArrowRight aria-hidden /></Link></Button>
  </section>;
}
