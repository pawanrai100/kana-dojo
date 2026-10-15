"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { AlertCircle, Info, SkipForward, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Kbd, Segmented } from "@/components/ui/misc";
import { PageSkeleton } from "@/components/layout/page-header";
import { generateRound } from "@/lib/quiz/generate";
import { emptyAnswer, gradeRound } from "@/lib/quiz/grade";
import type { ActiveRound } from "@/lib/quiz/session";
import type { AnswerState, GeneratorState, GradedRound } from "@/lib/quiz/types";
import type { PracticeMode, Settings, TimerPace } from "@/lib/settings/types";
import { levelInfo } from "@/lib/progress/stats";
import { playSound, type SoundName } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { actions, useAppState } from "@/store/app-store";
import { QuestionCard, type CardState } from "./question-card";
import { RoundSummary } from "./round-summary";
import { Petals } from "./petals";

type Current =
  | { kind: "round"; active: ActiveRound; fresh?: GeneratorState }
  | { kind: "error"; message: string };

const MODE_OPTIONS: { value: PracticeMode; label: string }[] = [
  { value: "mixed", label: "Mixed" },
  { value: "words", label: "Real words" },
  { value: "random", label: "Random combos" },
];

const PACE_OPTIONS: { value: TimerPace; label: string }[] = [
  { value: "off", label: "Zen" },
  { value: "relaxed", label: "Relaxed" },
  { value: "normal", label: "Normal" },
  { value: "fast", label: "Fast" },
];

function makeRound(): Current {
  const s = actions.getState();
  const r = generateRound({
    settings: s.settings,
    chars: s.progress.chars,
    words: s.progress.words,
    gen: s.progress.gen,
  });
  if (!r.ok) return { kind: "error", message: r.message };
  return {
    kind: "round",
    fresh: r.gen,
    active: {
      round: r.round,
      answers: r.round.questions.map(emptyAnswer),
      activeIndex: 0,
      startedAt: Date.now(),
    },
  };
}

export function PracticeGame() {
  const state = useAppState();
  if (!state) return <PageSkeleton />;
  return <PracticeSession settings={state.settings} />;
}

function PracticeSession({ settings }: { settings: Settings }) {
  const [current, setCurrent] = useState<Current>(() => {
    const s = actions.getState();
    return s.active ? { kind: "round", active: s.active } : makeRound();
  });

  // a round made during the first render still needs saving
  useEffect(() => {
    if (current.kind === "round" && current.fresh) actions.startRound(current.active, current.fresh);
  }, [current]);

  const newRound = () => {
    const c = makeRound();
    if (c.kind === "round") {
      actions.startRound(c.active, c.fresh!);
      setCurrent({ kind: "round", active: c.active });
    } else {
      actions.clearActive();
      setCurrent(c);
    }
  };

  const changeSetting = (patch: Partial<Settings>) => {
    actions.updateSettings(patch);
    newRound();
  };

  const roundNo = actions.getState().progress.roundsCompleted + 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Reading practice</h1>
          <p className="mt-1 text-sm text-muted">Read each word, type it in romaji, beat the clock.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Practice mode" value={settings.mode} options={MODE_OPTIONS} onChange={(mode) => changeSetting({ mode })} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="flex items-center gap-1.5 text-muted">
          <Timer className="size-4" /> Timer
        </span>
        <Segmented
          label="Timer pace"
          value={settings.timerPace}
          options={PACE_OPTIONS}
          onChange={(timerPace) => changeSetting({ timerPace })}
          className="text-xs"
        />
        <Badge tone="primary" className="ml-auto">
          {settings.enabledChars.length === 46 ? "All 46 hiragana" : `${settings.enabledChars.length} of 46 characters`}
        </Badge>
        <Link href="/chart" className="text-xs text-primary underline-offset-4 hover:underline">
          Change
        </Link>
      </div>

      {current.kind === "error" ? (
        <div role="alert" className="rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 text-warn" />
            <div className="space-y-3">
              <p className="font-medium">{current.message}</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => changeSetting({ mode: "random" })}>Practice random combos</Button>
                <Button variant="outline" asChild>
                  <Link href="/chart">Choose characters</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <RoundPlayer
          key={current.active.round.id}
          initial={current.active}
          settings={settings}
          roundNo={roundNo}
          onNext={newRound}
        />
      )}
    </div>
  );
}

interface PlayerProps {
  initial: ActiveRound;
  settings: Settings;
  roundNo: number;
  onNext: () => void;
}

interface GradedView {
  graded: GradedRound;
  xpAfter: number;
  isBest: boolean;
}

function nextOpen(answers: AnswerState[], from: number): number {
  for (let k = 1; k <= answers.length; k++) {
    const j = (from + k) % answers.length;
    if (!answers[j].locked) return j;
  }
  return -1;
}

function RoundPlayer({ initial, settings, roundNo, onNext }: PlayerProps) {
  const { round } = initial;
  const total = round.questions.length;
  const timed = round.questions.some((q) => q.timeLimitSec != null);

  const [answers, setAnswers] = useState<AnswerState[]>(initial.answers);
  const [activeIndex, setActiveIndex] = useState(initial.activeIndex);
  const [view, setView] = useState<GradedView | null>(null);
  const [elapsed, setElapsed] = useState<{ idx: number; ms: number } | null>(null);

  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const summaryTop = useRef<HTMLDivElement>(null);
  const usedNow = useRef<() => number>(() => 0);
  const firstFocus = useRef(true);

  const sfx = (n: SoundName) => {
    if (settings.sound) playSound(n);
  };

  const finish = (final: AnswerState[]) => {
    const g = gradeRound(round, final, { durationMs: Date.now() - initial.startedAt });
    const prevBest = actions.getState().progress.bestRoundPoints;
    actions.recordRound(g);
    setAnswers(final);
    setView({ graded: g, xpAfter: actions.getState().progress.xp, isBest: g.totalPoints > prevBest });
    sfx(g.stars === 3 ? "fanfare" : g.correctCount >= total / 2 ? "correct" : "wrong");
  };

  const lock = (i: number, timedOut: boolean) => {
    const q = round.questions[i];
    const used = timedOut && q.timeLimitSec ? q.timeLimitSec * 1000 : Math.round(usedNow.current());
    const next = answers.map((a, j) => (j === i ? { ...a, locked: true, timedOut, timeUsedMs: used } : a));
    setAnswers(next);
    sfx(timedOut ? "timeout" : "lock");
    const ni = nextOpen(next, i);
    if (ni === -1) finish(next);
    else setActiveIndex(ni);
  };

  const onTimeout = useEffectEvent((i: number) => lock(i, true));
  const onTick = useEffectEvent(() => sfx("tick"));

  // per-question countdown, pauses while the tab is hidden
  useEffect(() => {
    if (view || !timed) return;
    const q = round.questions[activeIndex];
    if (!q?.timeLimitSec) return;
    const limit = q.timeLimitSec * 1000;
    let acc = initial.answers[activeIndex]?.locked ? 0 : (initial.answers[activeIndex]?.timeUsedMs ?? 0);
    let start = performance.now();
    let paused = document.hidden;
    let lastBeep = Infinity;
    usedNow.current = () => (paused ? acc : acc + performance.now() - start);

    const id = window.setInterval(() => {
      if (paused) return;
      const used = acc + performance.now() - start;
      setElapsed({ idx: activeIndex, ms: used });
      const left = Math.ceil((limit - used) / 1000);
      if (left <= 3 && left > 0 && left < lastBeep) {
        lastBeep = left;
        onTick();
      }
      if (used >= limit) {
        window.clearInterval(id);
        onTimeout(activeIndex);
      }
    }, 100);

    const onVis = () => {
      if (document.hidden) {
        acc += performance.now() - start;
        paused = true;
      } else {
        start = performance.now();
        paused = false;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [activeIndex, view, timed, round, initial.answers]);

  // keep the unfinished round saved so it survives a refresh
  useEffect(() => {
    if (view) return;
    actions.saveActive({ ...initial, answers, activeIndex });
  }, [answers, activeIndex, view, initial]);

  // focus + scroll the active question
  useEffect(() => {
    if (view) return;
    const el = inputs.current[activeIndex];
    if (settings.autoFocus && el) el.focus({ preventScroll: true });
    if (!firstFocus.current) cards.current[activeIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    firstFocus.current = false;
  }, [activeIndex, view, settings.autoFocus]);

  useEffect(() => {
    if (!view) return;
    summaryTop.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    if (settings.autoFocus) nextBtn.current?.focus({ preventScroll: true });
  }, [view, settings.autoFocus]);

  const skipRound = () => {
    if (!view) actions.recordRound(gradeRound(round, [], { durationMs: 0, skipped: true }));
    onNext();
  };

  const onGlobalKey = useEffectEvent((e: KeyboardEvent) => {
    if (!settings.shortcuts || !view) return;
    const t = e.target as HTMLElement | null;
    const tag = t?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
    // let focused buttons/links handle their own Enter
    if (e.key === "Enter" && (tag === "BUTTON" || tag === "A")) return;
    if (e.key === "Enter" || e.key.toLowerCase() === "n") {
      e.preventDefault();
      onNext();
    }
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => onGlobalKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const onInputKey = (i: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (e.shiftKey) {
      if (settings.shortcuts) skipRound();
      return;
    }
    if (timed) {
      lock(i, false);
      return;
    }
    if (i < total - 1) {
      setActiveIndex(i + 1);
      inputs.current[i + 1]?.focus();
    } else {
      finish(answers);
    }
  };

  const setValue = (i: number, v: string) =>
    setAnswers((prev) => prev.map((a, j) => (j === i ? { ...a, value: v } : a)));

  const checkNow = () => {
    // lock whatever is typed, including the question on the clock
    const final = answers.map((a, j) =>
      j === activeIndex && timed && !a.locked ? { ...a, timeUsedMs: Math.round(usedNow.current()) } : a,
    );
    finish(final);
  };

  const cardState = (i: number): CardState => {
    if (!timed) return "free";
    if (answers[i].locked) return "locked";
    return i === activeIndex ? "active" : "pending";
  };

  const timeLeft = (i: number) => {
    const q = round.questions[i];
    if (!q.timeLimitSec) return undefined;
    const used = elapsed && elapsed.idx === i ? elapsed.ms : answers[i].timeUsedMs;
    return Math.max(0, q.timeLimitSec - used / 1000);
  };

  const done = answers.filter((a) => a.locked || a.value.trim()).length;
  const lvl = levelInfo(actions.getState().progress.xp);
  const results = view?.graded.results;

  return (
    <div className="space-y-5">
      {view?.graded.stars === 3 && <Petals />}

      <div ref={summaryTop} className="scroll-mt-20" />
      {view && (
        <RoundSummary
          ref={nextBtn}
          graded={view.graded}
          xpAfter={view.xpAfter}
          isBest={view.isBest}
          shortcuts={settings.shortcuts}
          nextLabel={`Next ${settings.questionsPerRound} Words →`}
          onNext={onNext}
        />
      )}

      {round.notice && (
        <p className="flex items-start gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary">
          <Info className="mt-0.5 size-4 shrink-0" />
          {round.notice}
        </p>
      )}

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Round {view ? roundNo - 1 : roundNo}</span>
        <ol className="flex flex-1 gap-1" aria-label="Round progress">
          {round.questions.map((q, i) => {
            const r = results?.[i];
            return (
              <li
                key={q.id}
                aria-label={`Question ${i + 1}: ${r ? (r.correct ? "correct" : "incorrect") : answers[i].locked ? "locked in" : i === activeIndex ? "current" : "not answered"}`}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-300",
                  r ? (r.correct ? "bg-good" : "bg-bad") : answers[i].locked ? "bg-primary" : i === activeIndex && timed ? "bg-primary/40" : "bg-surface-2",
                )}
              />
            );
          })}
        </ol>
        <span className="text-xs tabular-nums text-muted">Lv {lvl.level}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {round.questions.map((q, i) => (
          <div key={q.id} ref={(el) => { cards.current[i] = el; }} className="scroll-mt-24 scroll-mb-28">
            <QuestionCard
              ref={(el) => { inputs.current[i] = el; }}
              q={q}
              index={i}
              showNumber={settings.showNumbers}
              answer={answers[i]}
              state={cardState(i)}
              result={results?.[i]}
              timeLeftSec={timeLeft(i)}
              revealDelayMs={i * 60}
              onChange={(v) => setValue(i, v)}
              onKeyDown={onInputKey(i)}
              onFocus={() => !timed && setActiveIndex(i)}
            />
          </div>
        ))}
      </div>

      {!view && (
        <div className="sticky bottom-[4.75rem] z-20 flex items-center gap-2 rounded-2xl border border-border bg-surface/95 p-2 shadow-card backdrop-blur sm:gap-3 sm:p-3 lg:bottom-4">
          <Button onClick={checkNow} className="flex-1 sm:h-12 sm:flex-none sm:px-6 sm:text-base">
            Check Answers
          </Button>
          <Button variant="outline" onClick={skipRound} className="sm:h-12" aria-label="Skip Round">
            <SkipForward /> <span className="hidden sm:inline">Skip Round</span>
          </Button>
          <span className="shrink-0 text-xs text-muted">
            {done}/{total} answered
          </span>
          <span className="ml-auto hidden items-center gap-3 text-xs text-muted md:flex">
            <span>
              <Kbd>Enter</Kbd> {timed ? "lock in" : "next"}
            </span>
            {settings.shortcuts && (
              <span>
                <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> skip round
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
