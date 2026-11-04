"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { SpeechControls } from "@/components/learning/pronunciation";
import { VoiceRecorder } from "@/components/learning/voice-recorder";
import { GRAMMAR, KANJI, SOUNDS, WORDS } from "@/lib/learning/study-content";
import { reviewItem, type StudyProgress } from "@/lib/learning/study-progress";
import { SPEAKING_LESSONS, matchesReply } from "@/lib/learning/lessons";
import { useStudy } from "./use-study";
import { useLearning } from "./use-learning";
import { Notebook, PreviewStatus, Tutor } from "./study-services";

export const SECTIONS = ["plan", "words", "grammar", "kanji", "sounds", "shadowing", "roleplay", "tutor", "notebook", "preview"] as const;
type Section = typeof SECTIONS[number];
const titles: Record<Section, string> = { plan: "My plan", words: "Vocabulary", grammar: "Grammar", kanji: "First kanji", sounds: "Sounds", shadowing: "Shadowing", roleplay: "Roleplay", tutor: "AI tutor", notebook: "Notebook", preview: "Feature status" };
export const panel = "space-y-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-card sm:p-7";
export const inputStyle = "min-h-12 w-full rounded-xl border-2 border-primary bg-background px-4 py-3";
type Study = ReturnType<typeof useStudy>;
function useClock() {
  const [now, setNow] = useState(0);
  useEffect(() => { const update = () => setNow(Date.now()); update(); const timer = setInterval(update, 60_000); return () => clearInterval(timer); }, []);
  return now;
}
export function StudyView() {
  const study = useStudy();
  if (study.loading) return <p role="status">Loading your study studio…</p>;
  return <Studio key={study.owner} study={study} />;
}
function Studio({ study }: { study: Study }) {
  const [section, setSection] = useState<Section>("plan");
  const [message, setMessage] = useState("");
  useEffect(() => { const change = () => { const hash = location.hash.slice(1); setSection(SECTIONS.includes(hash as Section) ? hash as Section : "plan"); }; change(); window.addEventListener("hashchange", change); return () => window.removeEventListener("hashchange", change); }, []);
  const save = (next: StudyProgress) => { const ok = study.save(next); setMessage(ok ? "Saved on this browser." : "Storage unavailable. Changes last only for this session; export a backup to keep them."); return ok; };
  const rate = (id: string, correct: boolean) => save(reviewItem(study.state, id, correct, Date.now()));
  return <div className="space-y-6">
    <PageHeader title="Your Japanese study studio" description="Read it. Understand it. Say it. Build a little Japanese you can use every day." />
    <nav aria-label="Study activities" className="flex flex-wrap gap-2">{SECTIONS.map(s => <a key={s} href={`#${s}`} aria-current={section === s ? "page" : undefined} onClick={() => { setSection(s); setMessage(""); }} className={`rounded-full px-4 py-3 text-sm font-bold ${section === s ? "bg-primary text-primary-foreground" : "bg-surface text-muted hover:text-primary"}`}>{titles[s]}</a>)}</nav>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p className="text-muted">A beginner path alongside your kana practice.</p><label className="flex items-center gap-2"><input type="checkbox" checked={study.state.romaji} onChange={e => save({ ...study.state, romaji: e.target.checked, updatedAt: Date.now() })} /> Show romaji in speaking activities</label></div>
    <p role="status" className="text-sm text-muted">{message}</p>
    <div key={section}>
      {section === "plan" && <DailyPlan study={study} save={save} />}
      {section === "words" && <Vocabulary study={study} save={save} rate={rate} />}
      {section === "grammar" && <Grammar state={study.state} rate={rate} />}
      {section === "kanji" && <Kanji rate={rate} />}
      {section === "sounds" && <Sounds rate={rate} />}
      {section === "shadowing" && <Shadowing romaji={study.state.romaji} rate={rate} />}
      {section === "roleplay" && <Roleplay romaji={study.state.romaji} rate={rate} />}
      {section === "notebook" && <Notebook study={study} save={save} />}
      {section === "preview" && <PreviewStatus />}
      {section === "tutor" && <Tutor />}
    </div>
    <p className="text-xs text-muted">Study progress stays in this browser unless you export it or explicitly use configured cloud backup. Model audio is synthesized. Speaking confidence is self-assessed.</p>
  </div>;
}
function DailyPlan({ study, save }: { study: Study; save: Study["save"] }) {
  const learning = useLearning();
  const now = useClock();
  const due = Object.values(study.state.reviews).filter(r => r.due <= now).length;
  const today = Object.values(study.state.reviews).filter(r => new Date(r.at).toDateString() === new Date(now).toDateString()).length;
  const conversations = Object.keys(learning.progress).length;
  return <div className="space-y-6">
    <section className="rounded-[var(--radius-card)] bg-primary p-6 text-primary-foreground sm:p-8"><p className="font-bold">Small steps, real conversations</p><h2 className="font-display my-3 text-3xl">Your next {study.state.goal} minutes</h2><p>Start with something familiar. Learn one useful pattern. Finish by saying it aloud.</p><div className="mt-5 flex flex-wrap gap-3">{[5, 10, 20].map(n => <Button key={n} variant={study.state.goal === n ? "sun" : "secondary"} aria-pressed={study.state.goal === n} onClick={() => save({ ...study.state, goal: n, updatedAt: Date.now() })}>{n} minutes</Button>)}</div></section>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[[due, "items due"], [today, "items practised today"], [conversations, "conversation missions tried"], [study.state.saved.length, "saved words"]].map(([n, label]) => <div key={label} className="rounded-2xl bg-surface p-4"><p className="font-display text-3xl text-primary">{n}</p><p className="text-sm text-muted">{label}</p></div>)}</div>
    <ol className="grid gap-4 md:grid-cols-3">{[
      ["1", "Warm up", study.state.goal === 5 ? "1 minute" : "3 minutes", "Review words you are due to see again. Say each example aloud.", "#words"],
      ["2", "Make a sentence", study.state.goal === 20 ? "7 minutes" : "2 minutes", "Learn one grammar pattern and build your own sentence.", "#grammar"],
      ["3", "Have an exchange", study.state.goal === 5 ? "2 minutes" : study.state.goal === 20 ? "10 minutes" : "5 minutes", "Listen to a partner, then reply without looking at the model.", "/learn"],
    ].map(([n, title, time, text, href]) => <li key={n} className={panel}><span className="text-sm font-bold text-primary">Step {n} · {time}</span><h2 className="font-display text-xl">{title}</h2><p className="text-sm text-muted">{text}</p><Button asChild variant="secondary"><Link href={href}>Start <ArrowRight aria-hidden /></Link></Button></li>)}</ol>
    <section className={panel}><h2 className="font-display text-xl">Your path beyond kana</h2><p>Kana → useful words → sentence patterns → guided conversations → freer conversation. You can practise speaking from the beginning.</p><p className="text-sm text-muted">These are practice milestones, not proficiency certificates. The 12 missions are a starting curriculum, not a complete Japanese course.</p><Button asChild><Link href="/learn">Explore all 12 missions</Link></Button><Button asChild variant="ghost"><Link href="/practice">Keep practising kana</Link></Button></section>
  </div>;
}
function Vocabulary({ study, save, rate }: { study: Study; save: Study["save"]; rate: (id: string, correct: boolean) => void }) {
  const now = useClock();
  const [query, setQuery] = useState(""); const [topic, setTopic] = useState("All"); const [onlySaved, setOnlySaved] = useState(false);
  const [deck, setDeck] = useState<string[] | null>(null); const [index, setIndex] = useState(0); const [reveal, setReveal] = useState(false); const [reverse, setReverse] = useState(false);
  const filtered = WORDS.filter(w => (topic === "All" || w.topic === topic) && (!onlySaved || study.state.saved.includes(w.id)) && `${w.japanese} ${w.kana} ${w.meaning}`.toLowerCase().includes(query.toLowerCase()));
  if (deck) {
    const word = WORDS.find(w => w.id === deck[index]);
    if (!word) return <section className={panel}><Check aria-hidden /><h2 className="font-display text-2xl">Review session complete</h2><p>{deck.length} words practised. Difficult items return tomorrow; successful due reviews gradually spread out.</p><Button onClick={() => setDeck(null)}>Back to word library</Button></section>;
    return <section className={panel} aria-label="Word review"><p className="text-sm text-primary">Word {index + 1} of {deck.length} · {reverse ? "Recall Japanese" : "Recall meaning"}</p><h2 lang={reverse ? "en" : "ja"} className="font-kana text-3xl">{reverse ? word.meaning : word.japanese}</h2><p>Try to recall the answer before revealing it.</p>{reveal ? <><p className="font-kana text-2xl">{reverse ? `${word.japanese} · ${word.kana}` : word.meaning}</p><p lang="ja">{word.example}</p><p>{word.translation}</p><SpeechControls text={word.example} /><div className="flex flex-wrap gap-3">{[[false, "Need practice"], [true, "Remembered"]].map(([ok, text]) => <Button key={String(ok)} onClick={() => { rate(`word:${word.id}`, Boolean(ok)); setIndex(index + 1); setReveal(false); }}>{text}</Button>)}</div></> : <Button onClick={() => setReveal(true)}>Reveal answer</Button>}<Button variant="ghost" onClick={() => setDeck(null)}>End review</Button></section>;
  }
  return <div className="space-y-5"><div className={panel}><h2 className="font-display text-2xl">Words you can use today</h2><label>Search words<input className={inputStyle} value={query} onChange={e => setQuery(e.target.value)} placeholder="English, kana, or kanji" /></label><div className="flex flex-wrap gap-4"><label>Topic<select className={inputStyle} value={topic} onChange={e => setTopic(e.target.value)}>{["All", ...new Set(WORDS.map(w => w.topic))].map(t => <option key={t}>{t}</option>)}</select></label><label className="flex items-center gap-2"><input type="checkbox" checked={onlySaved} onChange={e => setOnlySaved(e.target.checked)} /> Saved words only</label><label className="flex items-center gap-2"><input type="checkbox" checked={reverse} onChange={e => setReverse(e.target.checked)} /> English → Japanese</label></div><div className="flex flex-wrap gap-3"><Button disabled={!filtered.length} onClick={() => { setDeck(filtered.slice(0, 10).map(w => w.id)); setIndex(0); }}>Practise up to 10 words</Button><Button variant="secondary" disabled={!filtered.some(w => study.state.reviews[`word:${w.id}`]?.due <= now)} onClick={() => { setDeck(filtered.filter(w => study.state.reviews[`word:${w.id}`]?.due <= Date.now()).map(w => w.id)); setIndex(0); }}>Review due words</Button></div><p className="text-sm text-muted">Recall ratings are your own assessment. Repeating early does not inflate the review interval.</p></div>
    <p role="status">{filtered.length} words</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(w => <article key={w.id} className={panel}><p className="text-xs font-bold text-primary">{w.topic}</p><h3 lang="ja" className="font-kana text-2xl"><ruby>{w.japanese}<rt>{w.kana}</rt></ruby></h3><p className="font-bold">{w.meaning}</p><p lang="ja">{w.example}</p><p className="text-sm text-muted">{w.translation}</p><SpeechControls text={w.example} /><Button variant="ghost" aria-pressed={study.state.saved.includes(w.id)} onClick={() => save({ ...study.state, updatedAt: Date.now(), saved: study.state.saved.includes(w.id) ? study.state.saved.filter(id => id !== w.id) : [...study.state.saved, w.id] })}>{study.state.saved.includes(w.id) ? "Saved" : "Save word"}: {w.meaning}</Button></article>)}</div>{!filtered.length && <p>No matching words. Try another topic or clear your search.</p>}</div>;
}
function Grammar({ state, rate }: { state: StudyProgress; rate: (id: string, correct: boolean) => void }) {
  const [id, setId] = useState(GRAMMAR[0].id);
  return <div className="grid gap-5 md:grid-cols-[240px_1fr]"><nav aria-label="Grammar patterns" className="flex flex-col gap-2">{GRAMMAR.map(g => <Button key={g.id} variant={id === g.id ? "secondary" : "ghost"} className="h-auto justify-start whitespace-normal py-3 text-left" onClick={() => setId(g.id)}>{state.reviews[`grammar:${g.id}`]?.correct && <Check aria-label="Practised" />}{g.title}</Button>)}</nav><GrammarExercise key={id} item={GRAMMAR.find(g => g.id === id)!} rate={rate} /></div>;
}
function GrammarExercise({ item, rate }: { item: typeof GRAMMAR[number]; rate: (id: string, correct: boolean) => void }) {
  const [chosen, setChosen] = useState<number[]>([]); const [feedback, setFeedback] = useState(""); const [helped, setHelped] = useState(false); const [done, setDone] = useState(false);
  const tokens = [...item.tokens, ...item.distractors].reverse();
  return <section className={panel}><h2 className="font-display text-2xl">{item.title}</h2><p className="rounded-xl bg-primary-soft p-4 font-bold">{item.pattern}</p><p>{item.explanation}</p><h3 className="font-bold">Build: {item.prompt}</h3><p className="min-h-16 rounded-xl border-2 border-dashed border-primary p-4 font-kana text-xl" aria-label="Your sentence">{chosen.map(i => tokens[i]).join(" ") || "Choose the words in order."}</p><div className="flex flex-wrap gap-3">{tokens.map((token, i) => <Button key={i} variant="outline" disabled={done || chosen.includes(i)} onClick={() => { setChosen([...chosen, i]); setFeedback(""); }}>{token}</Button>)}</div><div className="flex flex-wrap gap-3"><Button disabled={!chosen.length || done} onClick={() => { const ok = chosen.map(i => tokens[i]).join("") === item.tokens.join(""); setFeedback(ok ? "That builds the sentence correctly." : "Try again. Notice the particle and the final verb or です."); if (!ok) setHelped(true); else { setDone(true); rate(`grammar:${item.id}`, !helped); } }}>Check sentence</Button><Button variant="ghost" disabled={done} onClick={() => { setChosen([]); setFeedback(""); }}>Clear sentence</Button><Button variant="ghost" onClick={() => { setHelped(true); setFeedback(`Model: ${item.tokens.join(" ")}`); }}>Show model</Button></div><p role="status">{feedback}</p>{done && <><SpeechControls text={item.model} /><p>Now say the sentence aloud. Change one word to make it your own.</p></>}</section>;
}
function Kanji({ rate }: { rate: (id: string, correct: boolean) => void }) {
  const [index, setIndex] = useState(0); const [reveal, setReveal] = useState(false); const [finished, setFinished] = useState(false); const k = KANJI[index];
  return <section className={panel}><h2 className="font-display text-2xl">Recognize your first kanji</h2><p>Learn each character through a useful word. Kanji can have several readings; this card teaches only the example shown.</p>{finished ? <><p>All 12 cards practised. Keep noticing these characters in real words.</p><Button onClick={() => { setIndex(0); setReveal(false); setFinished(false); }}>Practise again</Button></> : <><p>{index + 1} / {KANJI.length}</p><p lang="ja" className="font-kana text-center text-8xl">{k.id}</p><p>Can you recall its meaning and an example word?</p>{reveal ? <><p className="text-xl font-bold">{k.meaning}</p><p lang="ja" className="font-kana text-2xl">{k.word} · {k.reading}</p><p>{k.translation}</p><SpeechControls text={k.word} /><div className="flex flex-wrap gap-3">{[false, true].map(ok => <Button key={String(ok)} onClick={() => { rate(`kanji:${k.id}`, ok); setReveal(false); if (index + 1 === KANJI.length) setFinished(true); else setIndex(index + 1); }}>{ok ? "Remembered" : "Need practice"}</Button>)}</div></> : <Button onClick={() => setReveal(true)}>Reveal kanji card</Button>}</>}</section>;
}
function Sounds({ rate }: { rate: (id: string, correct: boolean) => void }) {
  const [id, setId] = useState(SOUNDS[0].id);
  return <div className="space-y-5"><div className="flex flex-wrap gap-3">{SOUNDS.map(s => <Button key={s.id} variant={id === s.id ? "secondary" : "outline"} onClick={() => setId(s.id)}>{s.title}</Button>)}</div><SoundExercise key={id} sound={SOUNDS.find(s => s.id === id)!} rate={rate} /></div>;
}
function SoundExercise({ sound, rate }: { sound: typeof SOUNDS[number]; rate: (id: string, correct: boolean) => void }) {
  const [target] = useState(() => Math.random() < 0.5 ? sound.a : sound.b); const [answer, setAnswer] = useState(""); const [shown, setShown] = useState(false);
  return <section className={panel}><h2 className="font-display text-2xl">{sound.title}</h2><p>{sound.tip}</p><p className="rounded-xl bg-primary-soft p-4">Beats: {sound.beats}</p><div className="grid gap-4 sm:grid-cols-2">{[[sound.a, sound.am], [sound.b, sound.bm]].map(([ja, en]) => <div key={ja} className="space-y-3"><p lang="ja" className="font-kana text-2xl">{ja}</p><p>{en}</p><SpeechControls text={ja} /></div>)}</div><h3 className="font-bold">Listen and choose what you heard</h3><SpeechControls text={target} /><Button variant="ghost" onClick={() => setShown(true)}>Show text if audio unavailable</Button>{shown && <p lang="ja">{target}</p>}<div className="flex flex-wrap gap-3">{[sound.a, sound.b].map(s => <Button key={s} disabled={answer === target} onClick={() => { setAnswer(s); rate(`sound:${sound.id}`, s === target && !shown && !answer); }}>{s}</Button>)}</div><p role="status">{answer && (answer === target ? "Correct. Now say both words and compare their rhythm." : "Listen again and notice the number of beats.")}</p><VoiceRecorder /></section>;
}
function Shadowing({ romaji, rate }: { romaji: boolean; rate: (id: string, correct: boolean) => void }) {
  const [lessonId, setLessonId] = useState(SPEAKING_LESSONS[0].id);
  const [index, setIndex] = useState(0); const [hidden, setHidden] = useState(false); const [saved, setSaved] = useState(false);
  const lesson = SPEAKING_LESSONS.find(l => l.id === lessonId)!; const phrase = lesson.phrases[index];
  return <section className={panel}><h2 className="font-display text-2xl">Listen, echo, then speak from memory</h2><label>Shadowing topic<select className={inputStyle} value={lessonId} onChange={e => { setLessonId(e.target.value); setIndex(0); setSaved(false); setHidden(false); }}>{SPEAKING_LESSONS.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></label><ol className="list-decimal space-y-2 pl-5"><li>Listen once for meaning.</li><li>Replay slowly and repeat just after the model.</li><li>Hide the words, record yourself, and compare.</li></ol><SpeechControls text={phrase.speech} />{!hidden && <><p lang="ja" className="font-kana text-2xl">{phrase.japanese}</p>{romaji && <p className="text-primary">{phrase.reading}</p>}<p>{phrase.meaning}</p></>}<Button variant="ghost" onClick={() => setHidden(!hidden)}>{hidden ? "Show script" : "Hide script"}</Button><VoiceRecorder key={`${lessonId}-${index}`} /><fieldset className="space-y-3"><legend className="font-bold">How did that feel? (Your assessment)</legend><div className="flex flex-wrap gap-3">{[false, true].map(ok => <Button key={String(ok)} disabled={saved} onClick={() => { rate(`shadow:${lesson.id}:${phrase.id}`, ok); setSaved(true); }}>{ok ? "Comfortable without the script" : "I need another listen"}</Button>)}</div></fieldset>{saved && <p role="status">Practice recorded. This is not an automated pronunciation score.</p>}<Button variant="secondary" onClick={() => { setIndex((index + 1) % lesson.phrases.length); setSaved(false); setHidden(false); }}>Next phrase</Button></section>;
}
function Roleplay({ romaji, rate }: { romaji: boolean; rate: (id: string, correct: boolean) => void }) {
  const [id, setId] = useState(SPEAKING_LESSONS[0].id);
  return <div className="space-y-5"><label>Conversation scenario<select className={inputStyle} value={id} onChange={e => setId(e.target.value)}>{SPEAKING_LESSONS.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></label><Scenario key={id} lesson={SPEAKING_LESSONS.find(l => l.id === id)!} romaji={romaji} rate={rate} /></div>;
}
function Scenario({ lesson, romaji, rate }: { lesson: typeof SPEAKING_LESSONS[number]; romaji: boolean; rate: (id: string, correct: boolean) => void }) {
  const [index, setIndex] = useState(0); const [reply, setReply] = useState(""); const [feedback, setFeedback] = useState(""); const [help, setHelp] = useState(false); const [assisted, setAssisted] = useState(false); const [accepted, setAccepted] = useState(false);
  const [history, setHistory] = useState<{ prompt: string; reply: string }[]>([]);
  const turn = lesson.turns[index];
  const advance = () => { setHistory([...history, { prompt: turn.prompt, reply: reply || "Practised aloud (self-assessed)" }]); if (index + 1 === lesson.turns.length) rate(`roleplay:${lesson.id}`, !assisted); setIndex(index + 1); setReply(""); setFeedback(""); setHelp(false); setAccepted(false); };
  return <section className={panel}><p className="text-sm font-bold text-primary">Scripted roleplay · no AI service required</p><h2 className="font-display text-2xl">{lesson.title}</h2><p>{lesson.setting}</p>{history.map((h, i) => <div key={i} className="space-y-2 rounded-xl bg-background p-4"><p lang="ja">Partner: {h.prompt}</p><p>You: {h.reply}</p></div>)}{turn ? <><div className="rounded-xl bg-primary-soft p-4"><p className="font-bold">Partner</p><SpeechControls text={turn.speech} /><details><summary>Show partner transcript and meaning</summary><p lang="ja">{turn.prompt}</p><p>{turn.meaning}</p></details></div><p>{turn.hint}</p><VoiceRecorder key={index} /><label>Your reply<input className={inputStyle} value={reply} maxLength={180} onChange={e => { setReply(e.target.value); setAccepted(false); setFeedback(""); }} /></label><div className="flex flex-wrap gap-3"><Button disabled={!reply.trim()} onClick={() => { const ok = matchesReply(turn, reply); setAccepted(ok); setFeedback(ok ? "That matches a sample reply." : "This wording is outside the sample answers. Compare the model; other natural replies may be valid."); if (!ok) setAssisted(true); }}>Check my reply</Button><Button variant="outline" onClick={() => { setHelp(true); setAssisted(true); }}>Help me reply</Button><Button variant="secondary" onClick={() => { setHelp(true); setAccepted(true); }}>I replied aloud · self-check</Button></div>{help && <div className="space-y-2"><p lang="ja">Model: {turn.model}</p>{romaji && <p>{turn.reading}</p>}<SpeechControls text={turn.model} /></div>}<p role="status">{feedback}</p>{accepted && <Button onClick={advance}>{index + 1 === lesson.turns.length ? "Finish roleplay" : "Continue conversation"}</Button>}</> : <><h3 className="font-display text-xl">Conversation complete</h3><p>You practised: {lesson.goal} Repeat with a friend or tutor using your own details.</p><p className="text-sm text-muted">Typed answers use sample matching. Spoken answers are self-assessed; no fluency score is awarded.</p></>}</section>;
}
