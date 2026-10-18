"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ArrowRight, Check, Crown, Heart, Map as MapIcon, RotateCcw, Star, Swords, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/misc";
import { generateRound } from "@/lib/quiz/generate";
import { gradeRound } from "@/lib/quiz/grade";
import { EMPTY_GEN_STATE, type AnswerState, type GeneratorState, type Question } from "@/lib/quiz/types";
import { checkAnswer } from "@/lib/quiz/validate";
import { DEFAULT_SETTINGS } from "@/lib/settings/types";
import { playSound, type SoundName } from "@/lib/sound";
import type { Achievement } from "@/lib/tower/achievements";
import { applyAnswer, startBattle, type BattleState } from "@/lib/tower/battle";
import { TOP_FLOOR, type Floor } from "@/lib/tower/floors";
import type { TowerOutcome } from "@/lib/tower/progress";
import { cn, pct } from "@/lib/utils";
import { actions } from "@/store/app-store";
import { ActiveCard } from "@/features/hiragana/practice/question-card";
import { Petals } from "@/features/hiragana/practice/petals";
import { Medal } from "./medal";

type Phase = "intro" | "answer" | "feedback" | "result";

interface Feedback {
  q: Question;
  correct: boolean;
  missedIdx: number[];
  answer: string;
  timedOut: boolean;
}

interface Logged {
  q: Question;
  a: AnswerState;
}

const AUTO_NEXT_MS = 750;

export function BattleView({ floor, onExit, onPlay }: { floor: Floor; onExit: () => void; onPlay: (id: number) => void }) {
  const settings = actions.getState().settings;
  const isBoss = floor.kind !== "floor";

  const [phase, setPhase] = useState<Phase>("intro");
  const [battle, setBattle] = useState<BattleState>(() => startBattle(floor));
  const [queue, setQueue] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [fb, setFb] = useState<Feedback | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ outcome: TowerOutcome; badges: Achievement[]; misses: Question[] } | null>(null);

  const gen = useRef<GeneratorState>(EMPTY_GEN_STATE);
  const log = useRef<Logged[]>([]);
  const startedAt = useRef(0);
  const lockedAt = useRef(0);
  const usedNow = useRef<() => number>(() => 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const startBtn = useRef<HTMLButtonElement>(null);

  const sfx = (n: SoundName) => {
    if (settings.sound) playSound(n);
  };

  // a fresh batch of questions using only this floor's kana
  const batch = (): Question[] => {
    const p = actions.getState().progress;
    const r = generateRound({
      settings: {
        ...DEFAULT_SETTINGS,
        mode: floor.mode,
        enabledChars: floor.chars,
        lengthRange: floor.lengthRange,
        timerPace: floor.pace,
        questionsPerRound: 10,
      },
      chars: p.chars,
      words: p.words,
      gen: gen.current,
    });
    if (!r.ok) return [];
    gen.current = r.gen;
    return r.round.questions;
  };

  const begin = () => {
    gen.current = EMPTY_GEN_STATE;
    log.current = [];
    startedAt.current = Date.now();
    setBattle(startBattle(floor));
    setQueue(batch());
    setIdx(0);
    setValue("");
    setFb(null);
    setResult(null);
    setPhase("answer");
  };

  const q = queue[idx];

  const lock = (timedOut: boolean) => {
    if (phase !== "answer" || !q) return;
    const check = checkAnswer(q.kana, value);
    const used = timedOut && q.timeLimitSec ? q.timeLimitSec * 1000 : Math.round(usedNow.current());
    log.current.push({ q, a: { value, locked: true, timedOut, timeUsedMs: used } });
    setBattle((b) => applyAnswer(b, check.correct));
    setFb({ q, correct: check.correct, missedIdx: check.missedIdx, answer: value, timedOut });
    lockedAt.current = Date.now();
    setPhase("feedback");
    sfx(check.correct ? "correct" : timedOut ? "timeout" : "wrong");
  };

  const finish = (final: BattleState) => {
    const items = log.current;
    const round = {
      id: `tower-${floor.id}-${startedAt.current.toString(36)}`,
      createdAt: startedAt.current,
      mode: floor.mode,
      questions: items.map((l, i) => ({ ...l.q, id: `${l.q.id}-${i}` })),
    };
    const graded = items.length ? gradeRound(round, items.map((l) => l.a), { durationMs: Date.now() - startedAt.current }) : null;
    const { outcome, badges } = actions.recordBattle(graded, final);
    const seen = new Set<string>();
    const misses = items
      .filter((l) => !checkAnswer(l.q.kana, l.a.value).correct)
      .map((l) => l.q)
      .filter((m) => (seen.has(m.kana) ? false : (seen.add(m.kana), true)));
    setResult({ outcome, badges, misses });
    setPhase("result");
    sfx(final.status === "won" ? "fanfare" : "wrong");
  };

  const advance = () => {
    if (phase !== "feedback") return;
    if (battle.status !== "fighting") {
      finish(battle);
      return;
    }
    const next = idx + 1;
    if (next >= queue.length - 2) setQueue((qs) => [...qs, ...batch()]);
    setIdx(next);
    setValue("");
    setFb(null);
    setElapsed(0);
    setPhase("answer");
  };

  const onTimeout = useEffectEvent(() => lock(true));
  const onAutoNext = useEffectEvent(() => advance());

  // countdown for the current card, pauses while the tab is hidden
  useEffect(() => {
    if (phase !== "answer" || !q?.timeLimitSec) return;
    const limit = q.timeLimitSec * 1000;
    let acc = 0;
    let start = performance.now();
    let paused = document.hidden;
    usedNow.current = () => (paused ? acc : acc + performance.now() - start);
    const id = window.setInterval(() => {
      if (paused) return;
      const used = acc + performance.now() - start;
      setElapsed(used);
      if (used >= limit) {
        window.clearInterval(id);
        onTimeout();
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
  }, [phase, q]);

  // right answers move on by themselves, misses wait so you can read the fix
  useEffect(() => {
    if (phase !== "feedback" || !fb?.correct) return;
    const t = window.setTimeout(() => onAutoNext(), AUTO_NEXT_MS);
    return () => window.clearTimeout(t);
  }, [phase, fb]);

  useEffect(() => {
    if (phase === "answer" && settings.autoFocus) inputRef.current?.focus({ preventScroll: true });
    if (phase === "intro") startBtn.current?.focus({ preventScroll: true });
  }, [phase, idx, settings.autoFocus]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== "Enter" || phase !== "feedback") return;
    if (Date.now() - lockedAt.current < 250) return; // same key press that locked
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "BUTTON" || tag === "A") return;
    e.preventDefault();
    advance();
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (phase === "intro") return <Intro floor={floor} startRef={startBtn} onStart={begin} onExit={onExit} />;

  if (phase === "result" && result) {
    return (
      <Result
        floor={floor}
        battle={battle}
        outcome={result.outcome}
        badges={result.badges}
        misses={result.misses}
        onRetry={begin}
        onNext={() => onPlay(floor.id + 1)}
        onExit={onExit}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Hud floor={floor} battle={battle} isBoss={isBoss} />

      {phase === "answer" && q && (
        <>
          <ActiveCard
            key={`${q.id}-${idx}`}
            q={q}
            index={idx}
            total={0}
            showNumber={false}
            answer={{ value, locked: false, timedOut: false, timeUsedMs: 0 }}
            timed
            timeLeftSec={q.timeLimitSec ? Math.max(0, q.timeLimitSec - elapsed / 1000) : undefined}
            inputRef={inputRef}
            onChange={setValue}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                lock(false);
              }
            }}
          />
          <p className="text-center text-xs font-bold text-muted">
            <Kbd>Enter</Kbd> to strike
          </p>
        </>
      )}

      {phase === "feedback" && fb && <FeedbackCard fb={fb} onNext={advance} last={battle.status !== "fighting"} />}

      <div className="text-center">
        <button type="button" onClick={onExit} className="text-sm font-bold text-muted hover:text-foreground">
          Leave the floor
        </button>
      </div>
    </div>
  );
}

function Hearts({ n, max }: { n: number; max: number }) {
  return (
    <span className="flex gap-1" role="img" aria-label={`${n} of ${max} hearts left`}>
      {Array.from({ length: max }, (_, i) => (
        <Heart
          key={i}
          aria-hidden
          className={cn("size-6 transition-transform", i < n ? "fill-bad text-bad" : "fill-surface-2 text-border scale-90")}
        />
      ))}
    </span>
  );
}

function Hud({ floor, battle, isBoss }: { floor: Floor; battle: BattleState; isBoss: boolean }) {
  const hpPct = battle.enemyHp / battle.maxEnemyHp;
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[620px] flex-wrap items-center gap-x-5 gap-y-3 rounded-[var(--radius-card)] p-4 sm:p-5",
        isBoss ? "bg-bad text-white shadow-[0_6px_0_var(--bad-deep)]" : "bg-surface shadow-[0_6px_0_var(--border)]",
      )}
    >
      <div className="min-w-0 flex-1 basis-56">
        <div className="mb-2 flex items-baseline gap-2">
          {isBoss && floor.boss && (
            <span lang="ja" className="font-display text-xl">
              {floor.boss.kana}
            </span>
          )}
          <span className="truncate font-extrabold">{isBoss ? floor.boss?.name : `Floor ${floor.id}: ${floor.name}`}</span>
          <span className={cn("ml-auto text-xs font-extrabold tabular-nums", isBoss ? "text-white/80" : "text-muted")}>
            HP {battle.enemyHp}/{battle.maxEnemyHp}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Enemy health"
          aria-valuemin={0}
          aria-valuemax={battle.maxEnemyHp}
          aria-valuenow={battle.enemyHp}
          className={cn("h-4 overflow-hidden rounded-full", isBoss ? "bg-black/25" : "bg-surface-2")}
        >
          <div
            className={cn("h-full rounded-full transition-[width] duration-300", isBoss ? "bg-sun" : "bg-primary")}
            style={{ width: `${hpPct * 100}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        {battle.combo >= 2 && (
          <span className="animate-pop rounded-full bg-sun px-2.5 py-1 text-xs font-extrabold text-sun-ink">Combo ×{battle.combo}</span>
        )}
        <span className={cn("rounded-xl px-2 py-1", isBoss && "bg-white")}>
          <Hearts n={battle.hearts} max={battle.maxHearts} />
        </span>
      </div>
    </div>
  );
}

function FeedbackCard({ fb, onNext, last }: { fb: Feedback; onNext: () => void; last: boolean }) {
  const missed = new Set(fb.missedIdx);
  return (
    <div className="mx-auto w-full max-w-[620px]">
      <article
        role="status"
        className={cn(
          "animate-stamp flex flex-col items-center gap-3 rounded-[1.75rem] px-6 py-8 text-center",
          fb.correct ? "bg-good-soft shadow-[0_10px_0_var(--good)]" : "animate-shake bg-bad-soft shadow-[0_10px_0_var(--bad)]",
        )}
      >
        <span className={cn("grid size-12 place-items-center rounded-full text-white", fb.correct ? "bg-good" : "bg-bad")}>
          {fb.correct ? <Check className="size-7" aria-label="Correct" /> : <X className="size-7" aria-label="Missed" />}
        </span>
        <p lang="ja" className="font-kana text-6xl sm:text-7xl">
          {fb.q.chars.map((k, i) => (
            <span key={i} className={cn(missed.has(i) && !fb.correct && "text-bad underline decoration-4 underline-offset-[12px]")}>
              {k}
            </span>
          ))}
        </p>
        <p className="text-2xl font-extrabold">{fb.q.romaji}</p>
        {!fb.correct && (
          <p className="text-sm text-muted">
            {fb.timedOut && !fb.answer ? "Time ran out." : <>You typed <span className="font-bold text-bad line-through">{fb.answer || "nothing"}</span></>}
          </p>
        )}
        <p className="text-sm font-bold">{fb.q.meaning ?? <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-extrabold text-muted">Reading practice</span>}</p>
        {!fb.correct && (
          <Button className="mt-2" onClick={onNext} autoFocus>
            {last ? "See result" : "Got it"} <ArrowRight />
          </Button>
        )}
      </article>
    </div>
  );
}

function Intro({ floor, startRef, onStart, onExit }: { floor: Floor; startRef: React.Ref<HTMLButtonElement>; onStart: () => void; onExit: () => void }) {
  const boss = floor.boss;
  const final = floor.kind === "final";
  return (
    <div className="mx-auto max-w-[620px] space-y-5">
      <section
        className={cn(
          "animate-deal flex flex-col items-center gap-4 rounded-[var(--radius-card)] p-7 text-center sm:p-9",
          final
            ? "bg-foreground text-background shadow-[0_8px_0_var(--sun-deep)]"
            : boss
              ? "bg-bad text-white shadow-[0_8px_0_var(--bad-deep)]"
              : "bg-surface shadow-[0_8px_0_var(--border)]",
        )}
      >
        <span className={cn("rounded-full px-3 py-1 text-xs font-extrabold", boss ? "bg-sun text-sun-ink" : "bg-primary-soft text-primary")}>
          {final ? "Final boss" : boss ? "Boss room" : `Floor ${floor.id}`}
        </span>
        {boss ? (
          <>
            <p lang="ja" className="font-display text-6xl sm:text-7xl">
              {boss.kana}
            </p>
            <h1 className="font-display text-3xl">{boss.name}</h1>
            <p className="max-w-sm font-medium opacity-90">{boss.blurb}</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl">{floor.name}</h1>
            {floor.newChars.length > 0 ? (
              <>
                <p className="text-sm text-muted">New kana on this floor</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {floor.newChars.map((k) => (
                    <span key={k} lang="ja" className="font-kana grid size-14 place-items-center rounded-2xl bg-primary-soft text-3xl text-primary">
                      {k}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">Everything from this zone, mixed together, with longer words.</p>
            )}
          </>
        )}
        <ul className={cn("flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-bold", boss ? "opacity-90" : "text-muted")}>
          <li className="flex items-center gap-1.5">
            <Swords className="size-4" aria-hidden /> Read {floor.enemyHp} right to win
          </li>
          <li className="flex items-center gap-1.5">
            <Heart className="size-4" aria-hidden /> {floor.hearts} hearts
          </li>
          <li className="flex items-center gap-1.5">
            <Zap className="size-4" aria-hidden /> {floor.pace === "fast" ? "Fast" : floor.pace === "normal" ? "Normal" : "Relaxed"} timer
          </li>
        </ul>
        <Button ref={startRef} size="lg" variant={boss ? "sun" : "default"} onClick={onStart} className="mt-1">
          {boss ? "Fight" : "Start floor"}
        </Button>
      </section>
      <div className="text-center">
        <Button variant="ghost" onClick={onExit}>
          <MapIcon /> Back to the tower
        </Button>
      </div>
    </div>
  );
}

function Result({
  floor,
  battle,
  outcome,
  badges,
  misses,
  onRetry,
  onNext,
  onExit,
}: {
  floor: Floor;
  battle: BattleState;
  outcome: TowerOutcome;
  badges: Achievement[];
  misses: Question[];
  onRetry: () => void;
  onNext: () => void;
  onExit: () => void;
}) {
  const won = outcome.won;
  const boss = floor.boss;
  const nextRef = useRef<HTMLButtonElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    (won && floor.id < TOP_FLOOR ? nextRef : retryRef).current?.focus({ preventScroll: true });
  }, [won, floor.id]);

  const headline = won ? (boss ? `${boss.name} defeated!` : "Floor cleared!") : boss ? `${boss.name} wins this time` : "Out of hearts";
  const title = badges.find((b) => b.title)?.title;

  return (
    <div className="mx-auto max-w-[620px] space-y-5">
      {won && boss && <Petals count={40} />}
      <section aria-label="Battle result" className="animate-pop flex flex-col items-center gap-4 rounded-[var(--radius-card)] bg-surface p-7 text-center shadow-[0_8px_0_var(--border)] sm:p-9">
        {won ? (
          <div className="flex gap-1.5" aria-label={`${outcome.stars} of 3 stars`}>
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                aria-hidden
                className={cn("size-12", s <= outcome.stars ? "animate-stamp fill-sun text-sun-deep" : "fill-surface-2 text-surface-2")}
                style={{ animationDelay: `${s * 140}ms` }}
              />
            ))}
          </div>
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-bad-soft text-bad">
            <Heart className="size-8" aria-hidden />
          </span>
        )}
        <h1 className="font-display text-3xl sm:text-4xl">{headline}</h1>
        <p className="text-muted">
          {battle.correct} of {battle.answered} read right ({pct(battle.answered ? battle.correct / battle.answered : 0)}), best combo ×{battle.bestCombo}
        </p>

        {(outcome.bonusXp > 0 || title || badges.length > 0 || (won && outcome.newBest && !outcome.firstClear)) && (
          <div className="w-full space-y-3 rounded-2xl bg-sun-soft p-4 text-left">
            <p className="flex items-center gap-2 text-sm font-extrabold text-warn">
              <Crown className="size-4" aria-hidden /> Rewards
            </p>
            <ul className="space-y-2.5">
              {outcome.bonusXp > 0 && (
                <li className="flex items-center gap-3 font-bold">
                  <span className="grid size-11 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">XP</span>
                  +{outcome.bonusXp} XP {boss ? "boss bounty" : "floor bonus"}
                </li>
              )}
              {won && outcome.newBest && !outcome.firstClear && (
                <li className="flex items-center gap-3 font-bold">
                  <span className="grid size-11 place-items-center rounded-full bg-sun text-sun-ink">
                    <Star className="size-5" aria-hidden />
                  </span>
                  New best: {outcome.stars} stars
                </li>
              )}
              {badges.map((b) => (
                <li key={b.id} className="animate-stamp flex items-center gap-3">
                  <Medal a={b} size={44} />
                  <span>
                    <span className="block font-extrabold">New badge: {b.name}</span>
                    <span className="block text-xs text-muted">{b.how}</span>
                  </span>
                </li>
              ))}
              {title && (
                <li className="text-sm font-bold">
                  New title unlocked: <span className="rounded-full bg-sun px-2 py-0.5 font-extrabold text-sun-ink">{title}</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {misses.length > 0 && (
          <div className="w-full text-left">
            <p className="mb-2 text-sm font-extrabold">Readings to remember</p>
            <ul className="flex flex-wrap gap-2">
              {misses.slice(0, 8).map((m) => (
                <li key={m.kana} className="rounded-xl bg-bad-soft px-3 py-1.5 text-sm">
                  <span lang="ja" className="font-kana mr-2">{m.kana}</span>
                  <span className="font-extrabold">{m.romaji}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {won && floor.id < TOP_FLOOR && (
            <Button ref={nextRef} size="lg" onClick={onNext}>
              Next floor <ArrowRight />
            </Button>
          )}
          <Button ref={retryRef} size="lg" variant={won ? "outline" : "default"} onClick={onRetry}>
            <RotateCcw /> {won ? "Play again" : "Try again"}
          </Button>
          <Button size="lg" variant="ghost" onClick={onExit}>
            <MapIcon /> Tower
          </Button>
        </div>
      </section>
    </div>
  );
}
