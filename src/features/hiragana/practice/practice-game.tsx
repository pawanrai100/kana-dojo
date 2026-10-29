"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { AlertCircle, Check, Flag, Info, RotateCcw, SkipForward, Target, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Kbd, ProgressBar, Segmented } from "@/components/ui/misc";
import { PageSkeleton } from "@/components/layout/page-header";
import { describeSelection } from "@/lib/kana/hiragana";
import { generateRound, makeRetryQuestion } from "@/lib/quiz/generate";
import { coachContext } from "@/lib/quiz/adaptive";
import { analyzeAnswer } from "@/lib/coach/analyze";
import { particleInfo } from "@/lib/quiz/tokens";
import { emptyAnswer, gradeRound } from "@/lib/quiz/grade";
import { checkQuestion } from "@/lib/quiz/validate";
import type { ActiveRound } from "@/lib/quiz/session";
import type { AnswerState, GeneratorState, GradedRound } from "@/lib/quiz/types";
import type { PracticeMode, Settings, TimerPace } from "@/lib/settings/types";
import { beltStatus } from "@/lib/progress/belts";
import { BeltIcon } from "@/features/belts/belt";
import type { Achievement } from "@/lib/tower/achievements";
import { playSound, type SoundName } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { actions, useAppState } from "@/store/app-store";
import { ActiveCard, AnswerFeedback, ResultCard } from "./question-card";
import { RoundSummary } from "./round-summary";
import { Petals } from "./petals";
import { todaysQuests } from "@/lib/progress/quests";

type Current =
  | { kind: "round"; active: ActiveRound; fresh?: GeneratorState }
  | { kind: "error"; message: string };

const MODE_OPTIONS: { value: PracticeMode; label: string }[] = [
  { value: "mixed", label: "Mixed" },
  { value: "words", label: "Real words" },
  { value: "random", label: "Random combos" },
  { value: "sentences", label: "Sentences" },
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
    coach: coachContext(s.progress),
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
      <div>
        <h1 className="font-display text-3xl sm:text-4xl">Practice</h1>
        <p className="mt-1 hidden text-sm text-muted sm:block">Read the kana, type it in romaji, beat the clock.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm [&_[role=radio]]:px-2.5 [&_[role=radio]]:text-xs sm:[&_[role=radio]]:px-3.5 sm:[&_[role=radio]]:text-sm">
        <Segmented label="Practice mode" value={settings.mode} options={MODE_OPTIONS} onChange={(mode) => changeSetting({ mode })} />
        <span className="flex items-center gap-1.5">
          <Timer className="size-4 text-muted" aria-hidden />
          <Segmented label="Timer pace" value={settings.timerPace} options={PACE_OPTIONS} onChange={(timerPace) => changeSetting({ timerPace })} />
        </span>
        <span className="ml-auto flex items-center gap-2">
          <Badge tone="primary">{describeSelection(settings.enabledChars)}</Badge>
          <Link href="/chart" className="text-xs font-extrabold text-primary hover:underline">
            Change
          </Link>
        </span>
      </div>

      {current.kind === "error" ? (
        <div role="alert" className="rounded-[var(--radius-card)] bg-surface p-6 shadow-card">
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
  promoted?: number;
  isBest: boolean;
  badges: Achievement[];
  quests: string[]; // quests that paid out this round
}

// the answer you just checked, shown until you move on
interface Checked {
  i: number;
  correct: boolean;
  missedIdx: number[];
  timedOut: boolean;
}

const AUTO_NEXT_MS = 750;

function nextOpen(answers: AnswerState[], from: number): number {
  for (let k = 1; k <= answers.length; k++) {
    const j = (from + k) % answers.length;
    if (!answers[j].locked) return j;
  }
  return -1;
}

function RoundPlayer({ initial, settings, roundNo, onNext }: PlayerProps) {
  // the round can change mid-play: a missed kana swaps itself into a later card
  const [round, setRound] = useState(initial.round);
  const total = round.questions.length;
  const timed = round.questions.some((q) => q.timeLimitSec != null);

  const [answers, setAnswers] = useState<AnswerState[]>(initial.answers);
  // after a refresh the saved card might already be checked, so start on the next open one
  const [activeIndex, setActiveIndex] = useState(() =>
    initial.answers[initial.activeIndex]?.locked ? Math.max(0, nextOpen(initial.answers, initial.activeIndex)) : initial.activeIndex,
  );
  const [view, setView] = useState<GradedView | null>(null);
  const [elapsed, setElapsed] = useState<{ idx: number; ms: number } | null>(null);
  const [checked, setChecked] = useState<Checked | null>(null);
  const [blankTry, setBlankTry] = useState(0); // bumps when you try to check an empty answer
  const checkedAt = useRef(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const summaryTop = useRef<HTMLDivElement>(null);
  const usedNow = useRef<() => number>(() => 0);

  const sfx = (n: SoundName) => {
    if (settings.sound) playSound(n);
  };

  const finish = (final: AnswerState[]) => {
    const g = gradeRound(round, final, { durationMs: Date.now() - initial.startedAt });
    const prevBest = actions.getState().progress.bestRoundPoints;
    const beltBefore = beltStatus(actions.getState().progress).index;
    const paidBefore = new Set(todaysQuests(actions.getState().progress).filter((q) => q.done).map((q) => q.quest.id));
    const badges = actions.recordRound(g);
    const beltAfter = beltStatus(actions.getState().progress).index;
    const quests = todaysQuests(actions.getState().progress)
      .filter((q) => q.done && !paidBefore.has(q.quest.id))
      .map((q) => q.quest.label);
    setAnswers(final);
    setView({ graded: g, promoted: beltAfter > beltBefore ? beltAfter : undefined, isBest: g.totalPoints > prevBest, badges, quests });
    sfx(g.stars === 3 ? "fanfare" : g.correctCount >= total / 2 ? "correct" : "wrong");
  };

  // swap a card you haven't reached for one with the kana you just missed (max 3 a round)
  const secondChance = (i: number, missed: string[], next: AnswerState[]) => {
    if (round.questions.filter((qq) => qq.retry).length >= 3) return;
    const open = (j: number) => !next[j].locked && !next[j].value.trim() && !round.questions[j].retry;
    const later = round.questions.map((_, j) => j).filter((j) => j > i + 1 && open(j));
    const slot = later.find((j) => j > i + 2) ?? later[0];
    if (slot === undefined) return;
    const s = actions.getState();
    const nq = makeRetryQuestion({
      missed,
      settings: s.settings,
      chars: s.progress.chars,
      avoid: new Set(round.questions.map((qq) => qq.kana)),
    });
    if (!nq) return;
    setRound((r) => ({ ...r, questions: r.questions.map((qq, j) => (j === slot ? { ...nq, id: `${r.id}-r${j}` } : qq)) }));
  };

  // enter (or the clock running out) locks the answer and shows right/wrong straight away
  const lock = (i: number, timedOut: boolean) => {
    if (checked || answers[i].locked) return;
    const q = round.questions[i];
    const used = timed ? (timedOut && q.timeLimitSec ? q.timeLimitSec * 1000 : Math.round(usedNow.current())) : 0;
    const next = answers.map((a, j) => (j === i ? { ...a, locked: true, timedOut, timeUsedMs: used } : a));
    setAnswers(next);
    const res = checkQuestion(q, next[i].value);
    setChecked({ i, correct: res.correct, missedIdx: res.missedIdx, timedOut });
    checkedAt.current = Date.now();
    sfx(res.correct ? "correct" : timedOut ? "timeout" : "wrong");
    if (!res.correct) {
      // retry the kana you missed plus whatever you read it as, so you see both side by side
      const parts = particleInfo(q).units;
      const missedK = (res.missedIdx.length ? res.missedIdx : q.chars.map((_, x) => x)).filter((x) => !parts.has(x)).map((x) => q.chars[x]);
      const twins = analyzeAnswer(q.chars, res.typed, res.missedIdx, parts).confusions.map(([, as]) => as);
      if (missedK.length) secondChance(i, [...missedK, ...twins], next);
    }
  };

  const advance = () => {
    if (!checked) return;
    const ni = nextOpen(answers, checked.i);
    setChecked(null);
    setElapsed(null);
    if (ni === -1) finish(answers);
    else setActiveIndex(ni);
  };

  // after a blank try, put the cursor back in the box
  useEffect(() => {
    if (blankTry > 0) inputRef.current?.focus({ preventScroll: true });
  }, [blankTry]);

  const onTimeout = useEffectEvent((i: number) => lock(i, true));
  const onAutoNext = useEffectEvent(() => advance());

  // right answers move on by themselves, misses wait so you can read the fix
  useEffect(() => {
    if (!checked?.correct) return;
    const t = window.setTimeout(() => onAutoNext(), AUTO_NEXT_MS);
    return () => window.clearTimeout(t);
  }, [checked]);
  const onTick = useEffectEvent(() => sfx("tick"));

  // per-question countdown, pauses while the tab is hidden
  useEffect(() => {
    if (view || !timed || checked) return;
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
  }, [activeIndex, view, timed, round, initial.answers, checked]);

  // keep the unfinished round saved so it survives a refresh
  useEffect(() => {
    if (view) return;
    actions.saveActive({ ...initial, round, answers, activeIndex });
  }, [answers, activeIndex, view, initial, round]);

  // focus the card that just got dealt
  useEffect(() => {
    if (view || checked) return;
    if (settings.autoFocus) inputRef.current?.focus({ preventScroll: true });
  }, [activeIndex, view, settings.autoFocus, checked]);

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
    if (checked && e.key === "Enter") {
      if (Date.now() - checkedAt.current < 250) return; // the same press that checked it
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "BUTTON" || tag === "A") return;
      e.preventDefault();
      advance();
      return;
    }
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

  // enter or the check button. blank answers don't count, only the clock can lock a blank
  const submit = (i: number) => {
    if (!answers[i].value.trim()) {
      setBlankTry((n) => n + 1);
      return;
    }
    lock(i, false);
  };

  const onInputKey = (i: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (e.shiftKey) {
      if (settings.shortcuts) skipRound();
      return;
    }
    submit(i);
  };

  const setValue = (i: number, v: string) => {
    setBlankTry(0);
    setAnswers((prev) => prev.map((a, j) => (j === i ? { ...a, value: v } : a)));
  };

  const checkNow = () => {
    // lock whatever is typed, including the question on the clock
    const final = answers.map((a, j) =>
      j === activeIndex && timed && !a.locked ? { ...a, timeUsedMs: Math.round(usedNow.current()) } : a,
    );
    finish(final);
  };

  // untimed rounds let you jump back to any card
  const canJump = (i: number) => !view && !timed && !checked && i !== activeIndex && !answers[i].locked;
  // locked answers already know if they're right, so the chips can show it
  const lockedOk = (i: number) => checkQuestion(round.questions[i], answers[i].value).correct;

  const timeLeft = (i: number) => {
    const q = round.questions[i];
    if (!q.timeLimitSec) return undefined;
    const used = elapsed && elapsed.idx === i ? elapsed.ms : answers[i].timeUsedMs;
    return Math.max(0, q.timeLimitSec - used / 1000);
  };

  const done = answers.filter((a) => a.locked || a.value.trim()).length;
  const belt = beltStatus(actions.getState().progress);
  const results = view?.graded.results;

  const chipTone = (i: number) => {
    const r = results?.[i];
    if (r) return r.correct ? "bg-good text-white shadow-[0_3px_0_var(--good-deep)]" : "bg-bad text-white shadow-[0_3px_0_var(--bad-deep)]";
    if (answers[i].locked)
      return lockedOk(i) ? "bg-good text-white shadow-[0_3px_0_var(--good-deep)]" : "bg-bad text-white shadow-[0_3px_0_var(--bad-deep)]";
    if (i === activeIndex) return "bg-surface text-primary ring-[3px] ring-inset ring-primary shadow-[0_3px_0_var(--border)]";
    if (answers[i].value.trim()) return "bg-primary-soft text-primary shadow-[0_3px_0_var(--border)]";
    return "bg-surface text-muted shadow-[0_3px_0_var(--border)]";
  };

  const chipLabel = (i: number) => {
    const r = results?.[i];
    const st = r ? (r.correct ? "correct" : "incorrect") : answers[i].locked ? (lockedOk(i) ? "correct" : "incorrect") : i === activeIndex ? "current" : answers[i].value.trim() ? "answered" : "not answered";
    return `Question ${i + 1}: ${st}`;
  };

  const q = round.questions[activeIndex];

  return (
    <div className="space-y-6">
      {view?.graded.stars === 3 && <Petals />}

      <div ref={summaryTop} className="scroll-mt-24" />
      {view && (
        <RoundSummary
          ref={nextBtn}
          graded={view.graded}
          belt={belt}
          promoted={view.promoted}
          quests={view.quests}
          isBest={view.isBest}
          badges={view.badges}
          shortcuts={settings.shortcuts}
          nextLabel={`Next ${settings.questionsPerRound} Words →`}
          onNext={onNext}
        />
      )}

      {round.notice && (
        <p className="flex items-start gap-2 rounded-2xl bg-primary-soft px-4 py-3 text-sm font-bold text-primary">
          <Info className="mt-0.5 size-4 shrink-0" />
          {round.notice}
        </p>
      )}

      {round.drill && (
        <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-primary-soft px-4 py-2.5 text-sm font-bold text-primary">
          <Target className="size-4 shrink-0" aria-hidden />
          Coach drill: just your trouble kana, side by side. The next round goes back to normal.
        </p>
      )}

      {!view && !round.drill && round.focus && round.focus.length > 0 && (
        <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-sun-soft px-4 py-2.5 text-sm font-bold text-warn" aria-label={`Extra practice on ${round.focus.join(" ")}`}>
          <RotateCcw className="size-4 shrink-0" aria-hidden />
          Extra practice on
          {round.focus.map((k) => (
            <span key={k} lang="ja" className="font-kana rounded-lg bg-surface px-1.5 text-base text-foreground shadow-[0_2px_0_var(--border)]">
              {k}
            </span>
          ))}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-extrabold">Round {view ? roundNo - 1 : roundNo}</span>
        <ol className="order-last grid w-full grid-cols-10 gap-1 sm:order-none sm:flex sm:w-auto sm:flex-1 sm:flex-wrap sm:gap-1.5" aria-label="Round progress">
          {round.questions.map((qq, i) => (
            <li key={qq.id}>
              <button
                type="button"
                aria-label={chipLabel(i)}
                aria-current={i === activeIndex && !view ? "step" : undefined}
                disabled={!canJump(i)}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "grid h-9 w-full place-items-center rounded-xl text-sm font-extrabold transition-colors disabled:cursor-default sm:w-9",
                  chipTone(i),
                  canJump(i) && "press hover:brightness-95",
                )}
              >
                {settings.showNumbers ? i + 1 : ""}
              </button>
            </li>
          ))}
        </ol>
        <span className="ml-auto flex items-center gap-2 text-xs font-extrabold text-muted sm:ml-0">
          <BeltIcon belt={belt.belt} review={belt.needsReview} className="h-4 w-7" />
          {belt.next && belt.nextStep && (
            <ProgressBar value={belt.nextStep.have / belt.nextStep.need} label={`Progress to ${belt.next.name}`} className="h-2.5 w-24" />
          )}
        </span>
      </div>

      {!view && checked && (
        <AnswerFeedback
          q={round.questions[checked.i]}
          correct={checked.correct}
          missedIdx={checked.missedIdx}
          answer={answers[checked.i].value}
          timedOut={checked.timedOut}
          onNext={advance}
          nextLabel={nextOpen(answers, checked.i) === -1 ? "See results" : "Got it"}
        />
      )}

      {!view && !checked && q && (
        <>
          <ActiveCard
            key={q.id}
            q={q}
            index={activeIndex}
            total={total}
            showNumber={settings.showNumbers}
            answer={answers[activeIndex]}
            timed={timed}
            timeLeftSec={timeLeft(activeIndex)}
            inputRef={inputRef}
            onChange={(v) => setValue(activeIndex, v)}
            onKeyDown={onInputKey(activeIndex)}
          />

          <div className="flex flex-col items-center gap-4">
            {blankTry > 0 && (
              <p key={blankTry} role="alert" className="animate-shake rounded-full bg-bad-soft px-4 py-1.5 text-sm font-extrabold text-bad">
                Type the reading first
              </p>
            )}
            <Button size="lg" className="w-full max-w-xs" onClick={() => submit(activeIndex)}>
              <Check /> Check
            </Button>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={checkNow}>
                <Flag /> Finish round
              </Button>
              <Button variant="outline" onClick={skipRound}>
                <SkipForward /> Skip round
              </Button>
            </div>
            <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-bold text-muted">
              <span>
                {done}/{total} answered
              </span>
              <span>
                <Kbd>Enter</Kbd> check answer
              </span>
              {settings.shortcuts && (
                <span className="hidden sm:inline">
                  <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> skip round
                </span>
              )}
            </p>
          </div>
        </>
      )}

      {view && results && (
        <section aria-label="Answers" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((r, i) => (
            <ResultCard key={r.question.id} result={r} index={i} showNumber={settings.showNumbers} revealDelayMs={i * 50} />
          ))}
        </section>
      )}
    </div>
  );
}
