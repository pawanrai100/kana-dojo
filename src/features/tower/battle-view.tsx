"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ArrowRight, Crown, Heart, Map as MapIcon, RotateCcw, Ruler, Star, Swords, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/misc";
import { generateRound, makeRetryQuestion } from "@/lib/quiz/generate";
import { coachContext } from "@/lib/quiz/adaptive";
import { gradeRound } from "@/lib/quiz/grade";
import { EMPTY_GEN_STATE, type AnswerState, type GeneratorState, type Question } from "@/lib/quiz/types";
import { checkQuestion } from "@/lib/quiz/validate";
import { DEFAULT_SETTINGS } from "@/lib/settings/types";
import { playSound, type SoundName } from "@/lib/sound";
import type { Achievement } from "@/lib/tower/achievements";
import { applyAnswer, startBattle, type BattleState } from "@/lib/tower/battle";
import { floorLabel, nextFloor, type Floor } from "@/lib/tower/floors";
import type { TowerOutcome } from "@/lib/tower/progress";
import { cn, pct } from "@/lib/utils";
import { actions } from "@/store/app-store";
import { ActiveCard, AnswerFeedback } from "@/features/hiragana/practice/question-card";
import { Petals } from "@/features/hiragana/practice/petals";
import { Medal } from "./medal";
import { Hearts, Sprite, type Fx } from "./battle-parts";
import { YokaiArt } from "./yokai-art";
import { BossArena, BossEntrance, BossFelled } from "./boss-arena";
import { BELTS, beltStatus } from "@/lib/progress/belts";
import { BeltPromotion } from "@/features/belts/belt";

type Phase = "intro" | "entrance" | "answer" | "feedback" | "result";

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
  const [fx, setFx] = useState<Fx>({ kind: null, n: 0 });
  const [blankTry, setBlankTry] = useState(0);
  const [result, setResult] = useState<{ outcome: TowerOutcome; badges: Achievement[]; misses: Question[]; promoted?: number } | null>(null);

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

  const floorSettings = {
    ...DEFAULT_SETTINGS,
    mode: floor.mode,
    enabledChars: floor.chars,
    lengthRange: floor.lengthRange,
    timerPace: floor.pace,
    questionsPerRound: 10 as const,
  };

  // a fresh batch of questions using only this floor's kana
  const batch = (): Question[] => {
    const p = actions.getState().progress;
    const r = generateRound({
      settings: floorSettings,
      chars: p.chars,
      words: p.words,
      gen: gen.current,
      coach: coachContext(p),
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
    setFx({ kind: null, n: 0 });
    // bosses get a proper entrance first
    setPhase(isBoss ? "entrance" : "answer");
  };

  const q = queue[idx];

  const lock = (timedOut: boolean) => {
    if (phase !== "answer" || !q) return;
    const check = checkQuestion(q, value);
    const used = timedOut && q.timeLimitSec ? q.timeLimitSec * 1000 : Math.round(usedNow.current());
    log.current.push({ q, a: { value, locked: true, timedOut, timeUsedMs: used } });
    setBattle((b) => applyAnswer(b, check.correct));
    setFx((f) => ({ kind: check.correct ? "hit" : "miss", n: f.n + 1 }));
    // a miss comes back three cards later as a second chance
    if (!check.correct) {
      const nq = makeRetryQuestion({
        missed: check.missedIdx.length ? check.missedIdx.map((x) => q.chars[x]) : q.chars,
        settings: floorSettings,
        chars: actions.getState().progress.chars,
        avoid: new Set(queue.slice(idx).map((x) => x.kana)),
      });
      if (nq) setQueue((qs) => [...qs.slice(0, idx + 3), { ...nq, id: `${q.id}-again` }, ...qs.slice(idx + 3)]);
    }
    setFb({ q, correct: check.correct, missedIdx: check.missedIdx, answer: value, timedOut });
    lockedAt.current = Date.now();
    setPhase("feedback");
    sfx(check.correct ? "correct" : timedOut ? "timeout" : "wrong");
  };

  // blank answers don't count, only the clock can lock a blank
  const strike = () => {
    if (!value.trim()) {
      setBlankTry((n) => n + 1);
      inputRef.current?.focus({ preventScroll: true });
      return;
    }
    lock(false);
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
    const beltBefore = beltStatus(actions.getState().progress).index;
    const { outcome, badges } = actions.recordBattle(graded, final);
    const beltAfter = beltStatus(actions.getState().progress).index;
    const seen = new Set<string>();
    const misses = items
      .filter((l) => !checkQuestion(l.q, l.a.value).correct)
      .map((l) => l.q)
      .filter((m) => (seen.has(m.kana) ? false : (seen.add(m.kana), true)));
    setResult({ outcome, badges, misses, promoted: beltAfter > beltBefore ? beltAfter : undefined });
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
      <>
        {isBoss && <BossFelled won={result.outcome.won} name={floor.enemy.name.split(",")[0]} />}
        <Result
        floor={floor}
        battle={battle}
        outcome={result.outcome}
        badges={result.badges}
        misses={result.misses}
        promoted={result.promoted}
        onRetry={begin}
        onNext={() => onPlay(floor.id + 1)}
        onExit={onExit}
      />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {phase === "feedback" && fx.kind === "miss" && (
        <div key={fx.n} aria-hidden className="animate-hurt pointer-events-none fixed inset-0 z-50 shadow-[inset_0_0_110px_40px_rgb(229_72_77/0.6)]" />
      )}
      {phase === "entrance" && <BossEntrance floor={floor} onDone={() => setPhase("answer")} />}
      {isBoss ? <BossArena floor={floor} battle={battle} fx={fx} /> : <Hud floor={floor} battle={battle} fx={fx} />}

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
            onChange={(v) => {
              setBlankTry(0);
              setValue(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                strike();
              }
            }}
          />
          {blankTry > 0 && (
            <p key={blankTry} role="alert" className="animate-shake mx-auto w-fit rounded-full bg-bad-soft px-4 py-1.5 text-sm font-extrabold text-bad">
              Type the reading first
            </p>
          )}
          <div className="flex justify-center">
            <Button size="lg" className="w-full max-w-xs" onClick={strike}>
              <Swords /> Strike
            </Button>
          </div>
          <p className="text-center text-xs font-bold text-muted">
            <Kbd>Enter</Kbd> to strike
          </p>
        </>
      )}

      {phase === "feedback" && fb && (
        <AnswerFeedback q={fb.q} correct={fb.correct} missedIdx={fb.missedIdx} answer={fb.answer} timedOut={fb.timedOut} onNext={advance} nextLabel={battle.status !== "fighting" ? "See result" : "Got it"} />
      )}

      <div className="text-center">
        <button type="button" onClick={onExit} className="text-sm font-bold text-muted hover:text-foreground">
          Leave the floor
        </button>
      </div>
    </div>
  );
}

// regular floors: no art, just who you're fighting and how much fight it has left
function Hud({ floor, battle, fx }: { floor: Floor; battle: BattleState; fx: Fx }) {
  const hpPct = battle.enemyHp / battle.maxEnemyHp;
  return (
    <div className="mx-auto w-full max-w-[620px] space-y-2 rounded-[var(--radius-card)] bg-surface p-3 shadow-[0_6px_0_var(--border)] sm:p-5">
      <div className="flex items-baseline gap-2">
        <span className="relative min-w-0">
          <span key={fx.n} className={cn("block truncate font-display text-xl", fx.kind === "hit" && "animate-name-hit")}>
            {floor.enemy.name}
          </span>
          {fx.kind === "hit" && (
            <span key={`d${fx.n}`} aria-hidden className="animate-dmg pointer-events-none absolute left-full top-0 ml-8 font-display text-2xl text-sun [-webkit-text-stroke:2px_#1a1d3a] [paint-order:stroke_fill]">
              -1
            </span>
          )}
          <span className="block truncate text-xs font-bold text-muted">{`${floorLabel(floor)}: ${floor.name}`}</span>
        </span>
        <span className="ml-auto shrink-0 text-xs font-extrabold tabular-nums text-muted">
          HP {battle.enemyHp}/{battle.maxEnemyHp}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Enemy health"
        aria-valuemin={0}
        aria-valuemax={battle.maxEnemyHp}
        aria-valuenow={battle.enemyHp}
        className="h-4 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${hpPct * 100}%` }} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Hearts n={battle.hearts} max={battle.maxHearts} breaking={fx.kind === "miss" ? battle.hearts : -1} fxKey={fx.n} />
        {battle.combo >= 2 && (
          <span key={battle.combo} className="animate-pop rounded-full bg-sun px-2.5 py-1 text-xs font-extrabold text-sun-ink">
            Combo ×{battle.combo}
          </span>
        )}
      </div>
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
          {final ? "Final boss" : boss ? "Boss room" : floorLabel(floor)}
        </span>
        {boss ? (
          <>
            <Sprite enemy={floor.enemy} className="size-36 sm:size-44" />
            <div>
              <h1 className="font-display text-3xl sm:text-4xl">{boss.name}</h1>
              <p lang="ja" className="font-display mt-1 text-lg opacity-80">
                {boss.kana}
              </p>
            </div>
            <p className="max-w-sm font-medium opacity-90">{boss.blurb}</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl">{floor.name}</h1>
            <p className="flex items-center gap-2 text-sm font-bold text-muted">
              <Swords className="size-4" aria-hidden /> Guarded by {/^[AEIOU]/.test(floor.enemy.name) ? "an" : "a"} {floor.enemy.name}
            </p>
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
            <Ruler className="size-4" aria-hidden /> {floor.mode === "sentences" ? "Whole sentences" : `${floor.lengthRange.replace("-", "–")} kana words`}
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
  promoted,
  onRetry,
  onNext,
  onExit,
}: {
  floor: Floor;
  battle: BattleState;
  outcome: TowerOutcome;
  badges: Achievement[];
  misses: Question[];
  promoted?: number;
  onRetry: () => void;
  onNext: () => void;
  onExit: () => void;
}) {
  const won = outcome.won;
  const boss = floor.boss;
  const nextRef = useRef<HTMLButtonElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    (won && nextFloor(floor) ? nextRef : retryRef).current?.focus({ preventScroll: true });
  }, [won, floor]);

  const headline = won ? (boss ? `${boss.name} defeated!` : "Floor cleared!") : boss ? `${boss.name} wins this time` : "Out of hearts";
  const title = badges.find((b) => b.title)?.title;

  return (
    <div className="mx-auto max-w-[620px] space-y-5">
      {won && boss && <Petals count={40} />}
      <section aria-label="Battle result" className="animate-pop flex flex-col items-center gap-4 rounded-[var(--radius-card)] bg-surface p-7 text-center shadow-[0_8px_0_var(--border)] sm:p-9">
        {boss && (
          <div className="relative size-28" aria-hidden>
            {won ? <YokaiArt id={floor.enemy.id} className="yokai-down size-full" /> : <Sprite enemy={floor.enemy} className="size-full" />}
          </div>
        )}
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

        {promoted !== undefined && (
          <div className="w-full text-left">
            <BeltPromotion belt={BELTS[promoted]} />
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
          {won && nextFloor(floor) && (
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
