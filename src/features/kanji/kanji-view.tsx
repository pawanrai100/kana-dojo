"use client";

import { useRef, useState } from "react";
import { ArrowRight, BookOpen, Check, Lightbulb, Play, RotateCcw, Square, X } from "lucide-react";
import { PageHeader, PageSkeleton } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, ProgressBar, Segmented } from "@/components/ui/misc";
import { BeltProgress, BeltPromotion } from "@/features/belts/belt";
import { Medal } from "@/features/tower/medal";
import { SpeakerButton } from "@/features/voice/speaker-button";
import { KANJI, LESSONS, getKanji, kanjiOfLessons, kanjiTwins, wordsWith } from "@/lib/kanji/data";
import { kanjiLevel, knownKanji, lessonProgress } from "@/lib/kanji/progress";
import { answerOf, buildKanjiRound, checkMeaning, checkReading, promptOf, type KanjiQuestion, type KanjiResult } from "@/lib/kanji/quiz";
import { beltStatus, promotedBelt, type Belt } from "@/lib/progress/belts";
import { todaysQuests } from "@/lib/progress/quests";
import type { Progress } from "@/lib/progress/types";
import { mulberry32 } from "@/lib/quiz/random";
import type { KanjiMode, Settings } from "@/lib/settings/types";
import { playSound, type SoundName } from "@/lib/sound";
import type { Achievement } from "@/lib/tower/achievements";
import { speak } from "@/lib/voice/speech";
import { cn } from "@/lib/utils";
import { actions, useAppState } from "@/store/app-store";
import { KanjiDetail, LEVEL_LABEL, LEVEL_TILE } from "./kanji-detail";

const since = (t: number) => Date.now() - t;
const newSeed = () => (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;

interface Played {
  id: string;
  results: KanjiResult[];
  badges: Achievement[];
  promoted?: Belt;
  quests: string[];
}

export function KanjiView() {
  const state = useAppState();
  const [round, setRound] = useState<{ id: string; qs: KanjiQuestion[] } | null>(null);
  const [played, setPlayed] = useState<Played | null>(null);
  if (!state) return <PageSkeleton />;

  const start = () => {
    const s = actions.getState();
    const seed = newSeed();
    const qs = buildKanjiRound({
      pool: kanjiOfLessons(s.settings.kanjiLessons),
      stats: s.progress,
      mode: s.settings.kanjiMode,
      size: s.settings.questionsPerRound,
      rng: mulberry32(seed),
    });
    setPlayed(null);
    setRound({ id: `kj-${seed.toString(36)}`, qs });
    window.scrollTo({ top: 0 });
  };

  const finish = (results: KanjiResult[]) => {
    if (!round) return;
    const before = actions.getState().progress;
    const paid = new Set(todaysQuests(before).filter((q) => q.done).map((q) => q.quest.id));
    const badges = actions.recordKanji(round.id, results);
    const after = actions.getState().progress;
    const quests = todaysQuests(after).filter((q) => q.done && !paid.has(q.quest.id)).map((q) => q.quest.label);
    setPlayed({ id: round.id, results, badges, promoted: promotedBelt(before, after), quests });
    setRound(null);
    window.scrollTo({ top: 0 });
  };

  if (round) return <KanjiRound key={round.id} qs={round.qs} settings={state.settings} onDone={finish} onQuit={() => setRound(null)} />;

  return (
    <div className="space-y-5">
      <PageHeader title="Kanji" description="The N5 kanji, one lesson at a time. Learn what each one means and how to read it in real words." />
      {played && <Summary played={played} progress={state.progress} onAgain={start} onClose={() => setPlayed(null)} />}
      <Lessons progress={state.progress} settings={state.settings} onStart={start} />
    </div>
  );
}

const MODES: { value: KanjiMode; label: string; help: string }[] = [
  { value: "mixed", label: "Mixed", help: "A bit of everything. New kanji start with an easy pick." },
  { value: "pick", label: "Pick", help: "See the meaning, tap the right kanji." },
  { value: "meaning", label: "Meaning", help: "See the kanji, type what it means in English." },
  { value: "reading", label: "Reading", help: "See a kanji word, type how it's read." },
];

function Lessons({ progress, settings, onStart }: { progress: Progress; settings: Settings; onStart: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const lessons = lessonProgress(progress);
  const chosen = new Set(settings.kanjiLessons);
  const pool = kanjiOfLessons(settings.kanjiLessons);
  const known = knownKanji(progress).length;
  const toggle = (id: number) => {
    const next = chosen.has(id) ? settings.kanjiLessons.filter((x) => x !== id) : [...settings.kanjiLessons, id];
    if (next.length) actions.updateSettings({ kanjiLessons: next });
  };
  const mode = MODES.find((m) => m.value === settings.kanjiMode) ?? MODES[0];

  return (
    <>
      <Card className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-bold text-muted">N5 kanji known</p>
            <p className="font-display text-4xl">
              {known}
              <span className="text-xl text-muted"> / {KANJI.length}</span>
            </p>
          </div>
          <BeltProgress status={beltStatus(progress, "kanji")} className="w-full min-w-0 sm:w-auto sm:max-w-sm sm:flex-1" />
        </div>
        <ProgressBar value={known / KANJI.length} label="N5 kanji known" barClassName="bg-sun-deep" />
        <div className="space-y-2">
          <Segmented label="Kanji practice mode" value={settings.kanjiMode} onChange={(v) => actions.updateSettings({ kanjiMode: v })} options={MODES.map((m) => ({ value: m.value, label: m.label }))} />
          <p className="text-sm text-muted">{mode.help}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={onStart}>
            <Play className="size-5" aria-hidden /> Practise {pool.length} kanji
          </Button>
          <p className="text-sm text-muted">
            {settings.questionsPerRound} cards a round. Tap a lesson to add or remove it.
          </p>
        </div>
      </Card>

      <ul className="grid gap-4 md:grid-cols-2">
        {LESSONS.map((l) => {
          const lp = lessons.find((x) => x.id === l.id)!;
          const on = chosen.has(l.id);
          const ks = KANJI.filter((x) => x.lesson === l.id);
          return (
            <li key={l.id}>
              <Card className={cn("h-full space-y-3 p-4 transition-shadow sm:p-5", on && "ring-[3px] ring-primary")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg">
                      {l.id}. {l.name}
                    </h2>
                    <p className="text-sm text-muted">{l.blurb}</p>
                  </div>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    aria-label={`Practise lesson ${l.id}, ${l.name}`}
                    onClick={() => toggle(l.id)}
                    className={cn(
                      "flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-extrabold transition-colors",
                      on ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted hover:text-foreground",
                    )}
                  >
                    {on ? <Check className="size-4" aria-hidden /> : null}
                    {on ? "In practice" : "Add"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ks.map((x) => {
                    const lv = kanjiLevel(progress, x.k);
                    return (
                      <button
                        key={x.k}
                        type="button"
                        lang="ja"
                        onClick={() => setOpen(x.k)}
                        aria-label={`${x.k}, ${x.meanings[0]}, ${LEVEL_LABEL[lv]}`}
                        className={cn("font-kana grid size-11 place-items-center rounded-xl text-2xl shadow-[0_3px_0_var(--border)] transition-transform hover:-translate-y-0.5", LEVEL_TILE[lv])}
                      >
                        {x.k}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs font-bold text-muted">
                  {lp.known} of {lp.total} known{lp.started > lp.known ? `, ${lp.started - lp.known} learning` : ""}
                </p>
              </Card>
            </li>
          );
        })}
      </ul>
      <Legend />
      <KanjiDetail k={open} progress={progress} onClose={() => setOpen(null)} onPick={setOpen} />
    </>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-3 text-xs font-bold text-muted" aria-label="Colour key">
      {(["new", "learning", "meaning", "known"] as const).map((lv) => (
        <li key={lv} className="flex items-center gap-1.5">
          <span className={cn("size-3.5 rounded", LEVEL_TILE[lv])} />
          {LEVEL_LABEL[lv]}
        </li>
      ))}
    </ul>
  );
}

// ---- a round, one card at a time ----

interface Feedback {
  correct: boolean;
  typed: string;
  mixedWith?: string;
}

function KanjiRound({ qs, settings, onDone, onQuit }: { qs: KanjiQuestion[]; settings: Settings; onDone: (r: KanjiResult[]) => void; onQuit: () => void }) {
  const [queue, setQueue] = useState(qs);
  const [i, setI] = useState(0);
  const [value, setValue] = useState("");
  const [fb, setFb] = useState<Feedback | null>(null);
  const [results, setResults] = useState<KanjiResult[]>([]);
  const [startedAt] = useState(() => Date.now());
  const shownAt = useRef<number | null>(null);
  const retried = useRef(new Set<string>());
  const input = useRef<HTMLInputElement>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const q = queue[i];

  if (!q) {
    return (
      <Card className="space-y-3 p-6 text-center">
        <p>No kanji picked yet. Choose a lesson first.</p>
        <Button onClick={onQuit}>Back to lessons</Button>
      </Card>
    );
  }

  const sfx = (n: SoundName) => {
    if (settings.sound) playSound(n);
  };
  const say = (text: string) => void speak(text, { voice: settings.voiceName || undefined, rate: settings.voiceRate });
  const reading = q.word?.reading ?? wordsWith(q.kanji).find((w) => w.kanji.length === 1)?.reading ?? wordsWith(q.kanji)[0]?.reading;

  const answer = (typed: string) => {
    if (fb) return;
    let check: Feedback;
    if (q.kind === "pick") check = { correct: typed === q.kanji, typed, mixedWith: typed !== q.kanji ? typed : undefined };
    else if (q.kind === "reading" && q.word) check = { correct: checkReading(q.word, typed), typed };
    else {
      const c = checkMeaning(q.kanji, typed);
      check = { correct: c.correct, typed, mixedWith: c.mixedWith };
    }
    setFb(check);
    const res: KanjiResult = { q, correct: check.correct, typed, ms: since(shownAt.current ?? startedAt) };
    setResults((r) => [...r, res]);
    sfx(check.correct ? "correct" : "wrong");
    if (settings.speakAnswers && reading) say(reading);
    // a miss comes back once at the end of the round
    if (!check.correct && !retried.current.has(q.kanji + q.kind)) {
      retried.current.add(q.kanji + q.kind);
      setQueue((qq) => [...qq, { ...q, id: q.id + "-again" }]);
    }
    setTimeout(() => nextBtn.current?.focus(), 0);
  };

  const next = () => {
    if (i + 1 >= queue.length) {
      onDone(results);
      return;
    }
    setI(i + 1);
    setValue("");
    setFb(null);
    shownAt.current = Date.now();
    setTimeout(() => input.current?.focus(), 0);
  };

  const kj = getKanji(q.kanji)!;
  const again = q.id.endsWith("-again");
  const total = queue.length;

  return (
    <div className="mx-auto max-w-[620px] space-y-4">
      <div className="flex items-center gap-3">
        <ProgressBar value={i / total} label={`Card ${i + 1} of ${total}`} className="flex-1" />
        <span className="text-sm font-bold tabular-nums text-muted">
          {i + 1}/{total}
        </span>
        <Button variant="outline" size="sm" onClick={onQuit} aria-label="Stop this round">
          <Square className="size-4" aria-hidden /> Stop
        </Button>
      </div>

      <article className="animate-deal flex flex-col items-center gap-5 rounded-[1.75rem] bg-surface px-5 pb-7 pt-5 shadow-[0_10px_0_var(--border)] sm:px-8" key={q.id}>
        <div className="flex w-full items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Badge tone="primary">{q.kind === "pick" ? "Pick" : q.kind === "meaning" ? "Meaning" : "Reading"}</Badge>
            {again && <Badge tone="warn">Again</Badge>}
          </span>
          <span className="text-sm font-bold text-muted">Lesson {kj.lesson}</span>
        </div>
        <p className="text-center font-bold text-muted">{promptOf(q)}</p>

        {q.kind === "pick" ? (
          <div className="grid w-full grid-cols-2 gap-3" role="group" aria-label="Choose a kanji">
            {q.options!.map((o) => {
              const state = !fb ? "" : o === q.kanji ? "bg-good-soft text-good ring-[3px] ring-good" : o === fb.typed ? "bg-bad-soft text-bad ring-[3px] ring-bad" : "opacity-60";
              return (
                <button
                  key={o}
                  type="button"
                  lang="ja"
                  disabled={!!fb}
                  onClick={() => answer(o)}
                  className={cn("font-kana grid h-24 place-items-center rounded-2xl bg-surface-2 text-6xl shadow-[0_4px_0_var(--border)] transition-transform enabled:hover:-translate-y-0.5 enabled:active:translate-y-0.5", state)}
                >
                  {o}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <p lang="ja" className={cn("font-kana text-center", q.kind === "reading" && (q.word?.word.length ?? 0) > 2 ? "text-6xl sm:text-7xl" : "text-8xl sm:text-[7.5rem]")} aria-label={`Kanji: ${q.word?.word ?? q.kanji}`}>
              {q.word?.word ?? q.kanji}
            </p>
            <form
              className="flex w-full gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (value.trim()) answer(value);
              }}
            >
              <label htmlFor={`kj-${q.id}`} className="sr-only">
                {q.kind === "reading" ? "Reading" : "Meaning in English"}
              </label>
              <input
                ref={input}
                id={`kj-${q.id}`}
                autoFocus={settings.autoFocus}
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                readOnly={!!fb}
                placeholder={q.kind === "reading" ? "Type the reading" : "Type the meaning"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                maxLength={40}
                className="h-14 min-w-0 flex-1 rounded-2xl border-[3px] border-primary bg-background px-4 text-center text-xl font-extrabold outline-none placeholder:text-base placeholder:font-bold placeholder:text-muted/60 focus:shadow-[0_0_0_5px_var(--primary-soft)]"
              />
              {!fb && (
                <Button type="submit" size="lg" className="h-14" disabled={!value.trim()}>
                  Check
                </Button>
              )}
            </form>
            {!fb && (
              <button type="button" className="text-sm font-bold text-muted underline-offset-4 hover:underline" onClick={() => answer("")}>
                I don&apos;t know
              </button>
            )}
          </>
        )}
      </article>

      {fb && (
        <section aria-live="polite" className={cn("animate-pop space-y-3 rounded-[var(--radius-card)] p-5", fb.correct ? "bg-good-soft" : "bg-bad-soft")}>
          <p className={cn("flex items-center gap-2 text-lg font-extrabold", fb.correct ? "text-good" : "text-bad")}>
            {fb.correct ? <Check className="size-5" aria-hidden /> : <X className="size-5" aria-hidden />}
            {fb.correct ? "Correct!" : fb.typed ? "Not quite" : "Here it is"}
          </p>
          <div className="flex items-center gap-4">
            <span lang="ja" className="font-kana grid size-16 shrink-0 place-items-center rounded-2xl bg-surface text-4xl">
              {q.kanji}
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="font-extrabold">{kj.meanings.join(", ")}</p>
              {q.word ? (
                <p>
                  <span lang="ja" className="font-kana text-lg">{q.word.word}</span> = <span lang="ja" className="font-kana">{q.word.reading}</span>{" "}
                  <span className="text-muted">({q.word.romaji})</span>, {q.word.meaning}
                </p>
              ) : (
                <p className="text-sm">
                  <span lang="ja" className="font-kana">{[...kj.on, ...kj.kun.map((r) => r.replace(".", ""))].slice(0, 4).join("・")}</span>
                </p>
              )}
              {!fb.correct && fb.typed && q.kind !== "pick" && (
                <p className="text-sm text-muted">
                  You typed <span className="font-bold text-bad line-through">{fb.typed}</span>. Answer: <strong>{answerOf(q)}</strong>
                </p>
              )}
            </div>
            {reading && <SpeakerButton text={reading} label="Hear it" />}
          </div>
          {!fb.correct && fb.mixedWith && <MixedTip k={q.kanji} other={fb.mixedWith} />}
          {!fb.correct && (
            <p className="flex gap-2 rounded-2xl bg-surface px-4 py-3 text-sm">
              <Lightbulb className="size-4 shrink-0 text-sun-deep" aria-hidden />
              <span>{kj.trick}</span>
            </p>
          )}
          <Button ref={nextBtn} size="lg" className="w-full" onClick={next}>
            {i + 1 >= queue.length ? "See results" : "Next"} <ArrowRight className="size-5" aria-hidden />
          </Button>
        </section>
      )}
    </div>
  );
}

function MixedTip({ k, other }: { k: string; other: string }) {
  const o = getKanji(other);
  if (!o) return null;
  const tip = kanjiTwins(k).find((t) => t.other === other)?.tip;
  return (
    <p className="rounded-2xl bg-sun-soft px-4 py-3 text-sm">
      That&apos;s <span lang="ja" className="font-kana text-lg">{other}</span>, which means <strong>{o.meanings[0]}</strong>. {tip ?? `This one is ${getKanji(k)?.meanings[0]}.`}
    </p>
  );
}

function Summary({ played, progress, onAgain, onClose }: { played: Played; progress: Progress; onAgain: () => void; onClose: () => void }) {
  const { results } = played;
  // only first tries count for the headline, retries are a bonus
  const first = results.filter((r) => !r.q.id.endsWith("-again"));
  const right = first.filter((r) => r.correct).length;
  const missed = [...new Set(results.filter((r) => !r.correct).map((r) => r.q.kanji))];
  const pct = first.length ? Math.round((right / first.length) * 100) : 0;
  return (
    <section aria-label="Round results" className="animate-pop space-y-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[0_8px_0_var(--border)] sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl">{right === first.length ? "Perfect round!" : pct >= 70 ? "Nice work!" : "Keep at it!"}</h2>
          <p className="text-sm text-muted">
            You got <strong className="text-foreground">{right}</strong> of {first.length} right the first time ({pct}%).
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onAgain}>
            <RotateCcw className="size-4" aria-hidden /> Again
          </Button>
          <Button variant="outline" onClick={onClose}>
            <BookOpen className="size-4" aria-hidden /> Lessons
          </Button>
        </div>
      </div>
      {played.promoted && <BeltPromotion belt={played.promoted} />}
      {missed.length > 0 && (
        <div className="space-y-2 rounded-2xl bg-sun-soft px-4 py-3">
          <p className="text-sm font-bold text-warn">Look at these again:</p>
          <ul className="flex flex-wrap gap-2">
            {missed.map((k) => (
              <li key={k} className="flex items-center gap-2 rounded-xl bg-surface px-2.5 py-1 shadow-[0_2px_0_var(--border)]">
                <span lang="ja" className="font-kana text-xl">{k}</span>
                <span className="text-sm font-bold">{getKanji(k)?.meanings[0]}</span>
                <span className="sr-only">, {LEVEL_LABEL[kanjiLevel(progress, k)]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {played.quests.length > 0 && <p className="text-sm font-bold text-good">Quest done: {played.quests.join(", ")}</p>}
      {played.badges.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {played.badges.map((b) => (
            <li key={b.id} className="flex items-center gap-2 rounded-2xl bg-surface-2 p-2 pr-4">
              <Medal a={b} size={44} />
              <span>
                <span className="block text-xs font-bold text-muted">New badge</span>
                <span className="font-extrabold">{b.name}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
