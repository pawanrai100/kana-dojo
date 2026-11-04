"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Ear, Lightbulb, Mic, MicOff, MessageCircle, RotateCcw, Snail, Square, Volume2, X } from "lucide-react";
import { PageHeader, PageSkeleton } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/misc";
import { useAuth } from "@/features/auth/auth-provider";
import { scriptOf, splitKana, toRomaji, usesOnly } from "@/lib/kana/hiragana";
import { coachContext } from "@/lib/quiz/adaptive";
import { generateRound, resolveEnabled } from "@/lib/quiz/generate";
import { gradeRound } from "@/lib/quiz/grade";
import { shuffle } from "@/lib/quiz/random";
import { EMPTY_GEN_STATE, type AnswerState, type Question, type Round } from "@/lib/quiz/types";
import { checkQuestion } from "@/lib/quiz/validate";
import { activeChars, type Settings } from "@/lib/settings/types";
import type { Achievement } from "@/lib/tower/achievements";
import { ALL_VOCAB } from "@/lib/vocab/all";
import { WRITTEN, heardText, heardWord } from "@/lib/voice/match";
import { HUH, SCENES, TRY_THIS, fill, matchReply, type Scene } from "@/lib/voice/scenes";
import { canListen, type Heard } from "@/lib/voice/speech";
import { cn } from "@/lib/utils";
import { actions, useAppState } from "@/store/app-store";
import { Hana } from "./hana";
import { useVoice } from "./use-voice";

type Mode = "talk" | "listen" | "speak";

const YAY = ["せいかい！", "いいね！", "すごい！", "かんぺき！", "じょうず！"];
const AW = ["おしい！", "ざんねん！", "ちがうよ〜"];
const pick = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)];
const since = (t: number) => Date.now() - t;

export function VoiceView() {
  const state = useAppState();
  const [mode, setMode] = useState<Mode>("talk");
  if (!state) return <PageSkeleton />;
  return (
    <div className="space-y-5">
      <PageHeader title="Voice" description="Talk with Hana-sensei, train your ears, and practise saying words out loud." />
      <Segmented
        label="Voice mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: "talk", label: <span className="flex items-center gap-1.5"><MessageCircle className="size-4" />Talk</span> },
          { value: "listen", label: <span className="flex items-center gap-1.5"><Ear className="size-4" />Listen</span> },
          { value: "speak", label: <span className="flex items-center gap-1.5"><Mic className="size-4" />Speak</span> },
        ]}
      />
      <Support />
      {mode === "talk" ? <TalkMode /> : mode === "listen" ? <ListenMode settings={state.settings} /> : <SpeakMode settings={state.settings} />}
    </div>
  );
}

// tell people up front if their browser can't do part of this
function Support() {
  // only ever rendered in the browser (the page waits for saved progress first)
  const [can] = useState(() => (typeof window === "undefined" ? null : { speak: "speechSynthesis" in window, listen: canListen() }));
  if (!can || (can.speak && can.listen)) return null;
  return (
    <p role="status" className="rounded-2xl bg-sun-soft px-4 py-3 text-sm">
      {!can.speak
        ? "This browser can't play Hana's voice. Try Chrome, Edge or Safari."
        : "This browser can't use the microphone for Japanese, so tap the answers instead. Chrome, Edge and Safari can listen."}
    </p>
  );
}

function Bubble({ who, ja, en, showEn, children }: { who: "hana" | "you"; ja: string; en?: string; showEn?: boolean; children?: React.ReactNode }) {
  return (
    <li className={cn("flex", who === "you" ? "justify-end" : "justify-start")}>
      <div className={cn("animate-pop max-w-[85%] rounded-2xl px-4 py-2.5", who === "hana" ? "rounded-bl-sm bg-surface shadow-[0_3px_0_var(--border)]" : "rounded-br-sm bg-primary text-primary-foreground")}>
        <p lang="ja" className="font-kana text-lg leading-snug">
          {ja}
        </p>
        {en && showEn && <p className={cn("mt-0.5 text-xs", who === "hana" ? "text-muted" : "opacity-80")}>{en}</p>}
        {children}
      </div>
    </li>
  );
}

function MicButton({ listening, onStart, onStop, disabled }: { listening: boolean; onStart: () => void; onStop: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={listening ? onStop : onStart}
      aria-label={listening ? "Stop listening" : "Answer with your voice"}
      className={cn(
        "relative grid size-20 place-items-center rounded-full text-white shadow-[0_6px_0_rgb(0_0_0/0.2)] transition-transform active:translate-y-1 disabled:opacity-40",
        listening ? "bg-bad" : "bg-primary",
      )}
    >
      {listening && <span className="animate-mic-ring absolute inset-0 rounded-full bg-bad/50" />}
      {listening ? <Square className="relative size-7" /> : <Mic className="relative size-8" />}
    </button>
  );
}

function micProblem(h: Heard): string | undefined {
  if (h.error === "not-allowed") return "Hana can't hear you. Let this site use your microphone in the browser settings, then try again.";
  if (h.error === "unsupported") return "This browser can't listen. Tap an answer instead.";
  if (h.error === "network") return "Speech recognition needs internet. Check your connection.";
  if (h.error === "no-speech") return "Hana didn't catch anything. Tap the mic and talk a little louder.";
  return undefined;
}

// ---------------- talk ----------------

function TalkMode() {
  const [scene, setScene] = useState<Scene | null>(null);
  if (!scene) {
    return (
      <div className="space-y-4">
        <Card className="flex items-center gap-4 p-5">
          <Hana className="size-20" state="happy" />
          <div>
            <p className="font-display text-xl">Hi, I&apos;m Hana-sensei!</p>
            <p className="text-sm text-muted">Pick a conversation. I talk, you answer out loud (or tap an answer), and I&apos;ll tell you if it made sense.</p>
          </div>
        </Card>
        <ul className="grid gap-3 sm:grid-cols-2">
          {SCENES.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => setScene(s)} className="press flex w-full items-center gap-3 rounded-2xl bg-surface p-4 text-left shadow-[0_5px_0_var(--border)]">
                <span lang="ja" className="font-kana grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft px-1 text-center text-sm leading-tight text-primary">
                  {s.ja}
                </span>
                <span className="min-w-0">
                  <span className="block font-extrabold">{s.title}</span>
                  <span className="block text-xs text-muted">{s.blurb}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return <Conversation key={scene.id} scene={scene} onExit={() => setScene(null)} />;
}

interface Line {
  who: "hana" | "you";
  ja: string;
  en?: string;
}

function Conversation({ scene, onExit }: { scene: Scene; onExit: () => void }) {
  const { profile } = useAuth();
  const me = profile?.display_name || profile?.username || "パワン";
  const { say, hear, stopListening, speaking, listening } = useVoice();
  const [lines, setLines] = useState<Line[]>([]);
  const [turn, setTurn] = useState(0);
  const [tries, setTries] = useState(0);
  const [busy, setBusy] = useState(true);
  const [showEn, setShowEn] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [mood, setMood] = useState<"idle" | "happy" | "sad">("idle");
  const [problem, setProblem] = useState<string>();
  const [firstTry, setFirstTry] = useState(0);
  const [done, setDone] = useState<Achievement[] | null>(null);
  const vars = useRef<Record<string, string>>({ name: me, me });
  const endRef = useRef<HTMLDivElement>(null);
  const hasMic = useMemo(() => canListen(), []);

  const t = scene.turns[turn];

  const hanaSays = async (ja: string, en?: string) => {
    setLines((ls) => [...ls, { who: "hana", ja, en }]);
    await say(ja);
  };

  // she opens each turn
  const ask = async (i: number) => {
    setBusy(true);
    setShowHint(false);
    setTries(0);
    setMood("idle");
    const tt = scene.turns[i];
    await hanaSays(fill(tt.say, vars.current), fill(tt.en, vars.current));
    setBusy(false);
  };

  useEffect(() => {
    const id = window.setTimeout(() => void ask(0), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [lines, busy]);

  const answer = async (alternatives: string[], spoken: string) => {
    setBusy(true);
    setProblem(undefined);
    setLines((ls) => [...ls, { who: "you", ja: spoken }]);
    const m = matchReply(t, alternatives);
    if (m) {
      if (tries === 0) setFirstTry((n) => n + 1);
      const x = m.x || spoken;
      if (m.reply.save === "name") vars.current.name = x;
      setMood("happy");
      await hanaSays(fill(m.reply.then, { ...vars.current, x }), fill(m.reply.en, { ...vars.current, x }));
      if (turn + 1 < scene.turns.length) {
        setTurn(turn + 1);
        await ask(turn + 1);
      } else {
        setDone(actions.recordVoice(null, { talk: true }));
        setBusy(false);
      }
      return;
    }
    // didn't fit: ask again, then model the answer
    setMood("sad");
    setTries((n) => n + 1);
    if (tries === 0) await hanaSays(HUH.ja, HUH.en);
    else {
      setShowHint(true);
      await hanaSays(`${TRY_THIS.ja} ${t.hint.ja.replace("（なまえ）", me)}`, `${TRY_THIS.en} ${t.hint.en}`);
    }
    setBusy(false);
  };

  const talk = async () => {
    const h = await hear();
    const p = micProblem(h);
    if (!h.alternatives.length) {
      setProblem(p);
      return;
    }
    await answer(h.alternatives, heardText(h.alternatives));
  };

  const state = speaking ? "talking" : listening ? "listening" : mood;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <X /> Leave
        </Button>
        <span className="font-extrabold">{scene.title}</span>
        <label className="ml-auto flex items-center gap-2 text-xs font-bold text-muted">
          <input type="checkbox" checked={showEn} onChange={(e) => setShowEn(e.target.checked)} className="accent-[var(--primary)]" /> English
        </label>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-3">
          <Hana className="size-16" state={state} />
          <div className="text-sm">
            <p className="font-extrabold">Hana-sensei</p>
            <p className="text-muted">{speaking ? "talking…" : listening ? "listening…" : done ? "had fun!" : busy ? "…" : "your turn"}</p>
          </div>
          <span className="ml-auto text-xs font-bold text-muted">
            {Math.min(turn + 1, scene.turns.length)}/{scene.turns.length}
          </span>
        </div>
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1" aria-live="polite">
          {lines.map((l, i) => (
            <Bubble key={i} who={l.who} ja={l.ja} en={l.en} showEn={showEn}>
              {l.who === "hana" && (
                <button type="button" onClick={() => void say(l.ja)} aria-label="Hear that again" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary">
                  <Volume2 className="size-3.5" /> again
                </button>
              )}
            </Bubble>
          ))}
          <div ref={endRef} />
        </ul>
      </Card>

      {done ? (
        <Card className="space-y-3 p-5 text-center">
          <Hana className="mx-auto size-20" state="happy" />
          <p className="font-display text-2xl">おつかれさま！</p>
          <p className="text-muted">
            You answered {firstTry} of {scene.turns.length} on the first try.
          </p>
          {done.length > 0 && <p className="text-sm font-extrabold text-good">New badge: {done.map((b) => b.name).join(", ")}</p>}
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={onExit}>Another conversation</Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {problem && (
            <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-center text-sm text-bad">
              {problem}
            </p>
          )}
          {hasMic && <MicButton listening={listening} disabled={busy && !listening} onStart={() => void talk()} onStop={stopListening} />}
          <p className="text-xs font-bold text-muted">{hasMic ? "Tap the mic and answer in Japanese, or tap an answer:" : "Tap an answer:"}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {t.options.map((o) => {
              const text = o.replace("{me}", me);
              return (
                <button
                  key={o}
                  type="button"
                  disabled={busy}
                  onClick={() => void answer([text], text)}
                  lang="ja"
                  className="font-kana rounded-2xl border-2 border-border bg-surface px-3 py-1.5 text-base hover:border-primary disabled:opacity-50"
                >
                  {text}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => setShowHint((s) => !s)} className="flex items-center gap-1 text-xs font-extrabold text-primary">
            <Lightbulb className="size-3.5" /> What can I say?
          </button>
          {showHint && (
            <div className="rounded-2xl bg-primary-soft px-4 py-2 text-center">
              <p lang="ja" className="font-kana text-lg">
                {t.hint.ja.replace("（なまえ）", me)}
              </p>
              <p className="text-xs text-muted">
                {t.hint.romaji}, “{t.hint.en}”
              </p>
              <button type="button" onClick={() => void say(t.hint.ja.replace("（なまえ）", me))} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary">
                <Volume2 className="size-3.5" /> hear it
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- listen ----------------

function newListenRound(settings: Settings, kind: "words" | "random"): Round | string {
  const p = actions.getState().progress;
  const make = (mode: "words" | "random") =>
    generateRound({
      settings: { ...settings, mode, questionsPerRound: 10, timerPace: "off", lengthRange: mode === "random" ? "2-3" : settings.lengthRange },
      chars: p.chars,
      words: p.words,
      gen: EMPTY_GEN_STATE,
      coach: coachContext(p),
    });
  let r = make(kind);
  if (!r.ok && kind === "words") r = make("random");
  return r.ok ? r.round : r.message;
}

function ListenMode({ settings }: { settings: Settings }) {
  const { say, speaking } = useVoice();
  const [kind, setKind] = useState<"words" | "random">("words");
  const [round, setRound] = useState<Round | string>(() => newListenRound(settings, "words"));
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState<boolean | null>(null);
  const [nudge, setNudge] = useState(false);
  const [badges, setBadges] = useState<Achievement[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef(0);

  const restart = (k = kind) => {
    setKind(k);
    setRound(newListenRound(actions.getState().settings, k));
    setIdx(0);
    setAnswers([]);
    setValue("");
    setChecked(null);
    setBadges(null);
  };

  const q = typeof round === "string" ? undefined : round.questions[idx];

  // she reads each new card out loud
  useEffect(() => {
    if (!q || checked !== null) return;
    startedAt.current = Date.now();
    const id = window.setTimeout(() => void say(q.kana), 350);
    inputRef.current?.focus({ preventScroll: true });
    return () => window.clearTimeout(id);
  }, [q, checked, say]);

  if (typeof round === "string") return <p className="rounded-2xl bg-bad-soft p-4 text-sm text-bad">{round}</p>;

  if (badges) {
    const right = answers.filter((a, i) => checkQuestion(round.questions[i], a.value).correct).length;
    return (
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <Hana className="size-16" state={right >= 7 ? "happy" : "idle"} />
          <div>
            <p className="font-display text-2xl">
              {right}/{round.questions.length} by ear
            </p>
            <p className="text-sm text-muted">{right >= 9 ? "Your ears are sharp!" : right >= 6 ? "Nice listening." : "Keep at it, your ears will catch up."}</p>
          </div>
        </div>
        {badges.length > 0 && <p className="text-sm font-extrabold text-good">New badge: {badges.map((b) => b.name).join(", ")}</p>}
        <ul className="space-y-1">
          {round.questions.map((qq, i) => {
            const ok = checkQuestion(qq, answers[i]?.value ?? "").correct;
            return (
              <li key={qq.id} className="flex items-center gap-3 rounded-xl bg-surface-2/60 px-3 py-1.5">
                {ok ? <Check className="size-4 text-good" /> : <X className="size-4 text-bad" />}
                <span lang="ja" className="font-kana text-lg">
                  {qq.kana}
                </span>
                <span className="text-sm text-muted">{qq.romaji}</span>
                {qq.meaning && <span className="truncate text-xs text-muted">{qq.meaning}</span>}
                <button type="button" onClick={() => void say(qq.kana)} aria-label={`Hear ${qq.kana}`} className="ml-auto text-primary">
                  <Volume2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
        <Button onClick={() => restart()}>
          <RotateCcw /> Listen again
        </Button>
      </Card>
    );
  }
  if (!q) return null;

  const submit = () => {
    if (checked !== null) {
      next();
      return;
    }
    if (!value.trim()) {
      setNudge(true);
      return;
    }
    const ok = checkQuestion(q, value).correct;
    const a: AnswerState = { value, locked: true, timedOut: false, timeUsedMs: since(startedAt.current) };
    setAnswers((as) => [...as, a]);
    setChecked(ok);
    void say(ok ? `${pick(YAY)} ${q.kana}！` : `${pick(AW)} ${q.kana}、 だよ。`);
  };

  const next = () => {
    if (idx + 1 >= round.questions.length) {
      const all = [...answers];
      setBadges(actions.recordVoice(gradeRound(round, all, { durationMs: 0 })));
      return;
    }
    setIdx(idx + 1);
    setValue("");
    setChecked(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="What Hana says"
          value={kind}
          onChange={(k) => restart(k)}
          options={[
            { value: "words", label: "Real words" },
            { value: "random", label: "Random kana" },
          ]}
        />
        <span className="ml-auto text-sm font-bold text-muted">
          {idx + 1}/{round.questions.length}
        </span>
      </div>
      <Card className="flex flex-col items-center gap-4 p-6 text-center">
        <Hana className="size-24" state={speaking ? "talking" : checked === true ? "happy" : checked === false ? "sad" : "idle"} />
        <p className="text-sm text-muted">Listen and type what she says in romaji.</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void say(q.kana)}>
            <Volume2 /> Again
          </Button>
          <Button variant="ghost" onClick={() => void say(q.kana, true)}>
            <Snail /> Slowly
          </Button>
        </div>
        {checked !== null && (
          <div className={cn("animate-pop w-full rounded-2xl p-3", checked ? "bg-good-soft" : "bg-bad-soft")}>
            <p lang="ja" className="font-kana text-4xl">
              {q.kana}
            </p>
            <p className="font-extrabold">{q.romaji}</p>
            {q.meaning && <p className="text-sm text-muted">{q.meaning}</p>}
            {!checked && <p className="text-xs font-bold text-bad">you typed {value}</p>}
          </div>
        )}
        <form
          className="flex w-full max-w-sm gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            ref={inputRef}
            value={value}
            readOnly={checked !== null}
            onChange={(e) => {
              setNudge(false);
              setValue(e.target.value);
            }}
            placeholder="type what you heard"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            aria-label="What did Hana say?"
            className="h-12 min-w-0 flex-1 rounded-2xl border-2 border-border bg-background px-4 text-lg font-bold outline-none focus:border-primary"
          />
          <Button type="submit" size="lg">
            {checked === null ? "Check" : <>Next <ArrowRight /></>}
          </Button>
        </form>
        {nudge && <p className="text-sm font-bold text-bad">Type what you heard first.</p>}
      </Card>
    </div>
  );
}

// ---------------- speak ----------------

// words the mic can actually check: katakana loanwords come back as katakana,
// hiragana words need their usual kanji listed in WRITTEN
function speakDeck(settings: Settings): Question[] {
  const allowed = new Set(resolveEnabled(activeChars(settings)));
  const words = ALL_VOCAB.filter((w) => usesOnly(w.kana, allowed) && (splitKana(w.kana).every((k) => scriptOf(k) === "katakana") || WRITTEN[w.kana]));
  return shuffle(words, Math.random)
    .slice(0, 10)
    .map((w, i) => ({ id: `say-${i}-${w.id}`, kind: "word", kana: w.kana, romaji: toRomaji(w.kana), chars: splitKana(w.kana), meaning: w.meaning, wordId: w.id, difficulty: "easy", timeLimitSec: null }));
}

function SpeakMode({ settings }: { settings: Settings }) {
  const { say, hear, stopListening, speaking, listening } = useVoice();
  const hasMic = useMemo(() => canListen(), []);
  const [deck, setDeck] = useState<Question[]>(() => speakDeck(settings));
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [result, setResult] = useState<{ ok: boolean; heard: string } | null>(null);
  const [tries, setTries] = useState(0);
  const [showRomaji, setShowRomaji] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [badges, setBadges] = useState<Achievement[] | null>(null);

  const restart = () => {
    setDeck(speakDeck(actions.getState().settings));
    setIdx(0);
    setAnswers([]);
    setResult(null);
    setTries(0);
    setBadges(null);
  };

  if (deck.length < 3)
    return (
      <p className="rounded-2xl bg-sun-soft p-4 text-sm">
        Not enough speakable words with the kana you have on. Turn on more rows on the <Link href="/chart" className="font-bold text-primary underline">chart</Link>, or switch to katakana.
      </p>
    );

  if (badges) {
    const right = answers.filter((a) => a.value).length;
    return (
      <Card className="space-y-4 p-5 text-center">
        <Hana className="mx-auto size-20" state={right >= 7 ? "happy" : "idle"} />
        <p className="font-display text-2xl">
          {right}/{deck.length} said right
        </p>
        <p className="text-sm text-muted">{right >= 8 ? "Your Japanese sounds great!" : "Say them slowly and clearly, one sound at a time."}</p>
        {badges.length > 0 && <p className="text-sm font-extrabold text-good">New badge: {badges.map((b) => b.name).join(", ")}</p>}
        <Button onClick={restart}>
          <RotateCcw /> Speak again
        </Button>
      </Card>
    );
  }

  const q = deck[idx];
  const settle = (ok: boolean) => {
    const a: AnswerState = { value: ok ? q.romaji : "?", locked: true, timedOut: false, timeUsedMs: 0 };
    const all = [...answers, a];
    setAnswers(all);
    if (idx + 1 >= deck.length) {
      const round: Round = { id: `voice-${Date.now().toString(36)}`, createdAt: Date.now(), mode: "words", questions: deck };
      setBadges(actions.recordVoice(gradeRound(round, all, { durationMs: 0 })));
      return;
    }
    setIdx(idx + 1);
    setResult(null);
    setTries(0);
    setShowRomaji(false);
  };

  const tryIt = async () => {
    setProblem(undefined);
    const h = await hear();
    if (!h.alternatives.length) {
      setProblem(micProblem(h));
      return;
    }
    const ok = heardWord(h.alternatives, q.kana);
    setResult({ ok, heard: heardText(h.alternatives) });
    setTries((n) => n + 1);
    await say(ok ? `${pick(YAY)}` : `${pick(AW)} ${q.kana}。`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-bold text-muted">
        <span>Say the word out loud</span>
        <span>
          {idx + 1}/{deck.length}
        </span>
      </div>
      <Card className="flex flex-col items-center gap-4 p-6 text-center">
        <Hana className="size-20" state={speaking ? "talking" : listening ? "listening" : result?.ok ? "happy" : result ? "sad" : "idle"} />
        <p lang="ja" className="font-kana text-5xl sm:text-6xl">
          {q.kana}
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <button type="button" onClick={() => setShowRomaji((s) => !s)} className="font-bold text-primary">
            {showRomaji ? q.romaji : "show romaji"}
          </button>
          {q.meaning && <span className="text-muted">· {q.meaning}</span>}
        </div>
        <Button variant="secondary" size="sm" onClick={() => void say(q.kana)}>
          <Volume2 /> Hear Hana say it
        </Button>

        {result && (
          <div className={cn("animate-pop w-full max-w-sm rounded-2xl p-3", result.ok ? "bg-good-soft" : "bg-bad-soft")}>
            <p className="font-extrabold">{result.ok ? "She understood you!" : "Hmm, that didn't sound like it."}</p>
            <p className="text-xs text-muted">
              Hana heard: <span lang="ja" className="font-kana text-sm text-foreground">{result.heard || "…"}</span>
            </p>
          </div>
        )}
        {problem && (
          <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">
            {problem}
          </p>
        )}

        {result?.ok ? (
          <Button size="lg" onClick={() => settle(true)}>
            Next <ArrowRight />
          </Button>
        ) : hasMic ? (
          <>
            <MicButton listening={listening} disabled={speaking} onStart={() => void tryIt()} onStop={stopListening} />
            <div className="flex flex-wrap justify-center gap-2">
              {tries > 0 && (
                <Button variant="ghost" size="sm" onClick={() => settle(true)}>
                  <Check /> I said it right
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => settle(false)}>
                Skip
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="flex items-center justify-center gap-1.5 text-sm text-muted">
              <MicOff className="size-4" /> No mic here. Say it out loud, then check yourself.
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => settle(true)}>
                <Check /> I said it
              </Button>
              <Button variant="ghost" onClick={() => settle(false)}>
                Skip
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
