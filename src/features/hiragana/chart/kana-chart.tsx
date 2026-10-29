"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, CircleDot, Play, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, PageSkeleton } from "@/components/layout/page-header";
import { ALL_KANA_LIST, BASIC_KANA_LIST, KANA_GROUPS, LOOKALIKES, SMALL_TSU, getKana, getRow, readingOf, type KanaGroup } from "@/lib/kana/hiragana";
import { wordsForChars } from "@/lib/quiz/generate";
import { charAccuracy, isMastered } from "@/lib/progress/stats";
import type { Progress } from "@/lib/progress/types";
import type { Settings } from "@/lib/settings/types";
import { HIRAGANA_VOCAB } from "@/lib/vocab/hiragana-words";
import { cn, pct } from "@/lib/utils";
import { actions, useAppState } from "@/store/app-store";

// gojuon grid positions, null = empty slot (や and わ rows have gaps)
const LAYOUT: Record<string, (string | null)[]> = {
  vowel: ["あ", "い", "う", "え", "お"],
  k: ["か", "き", "く", "け", "こ"],
  s: ["さ", "し", "す", "せ", "そ"],
  t: ["た", "ち", "つ", "て", "と"],
  n: ["な", "に", "ぬ", "ね", "の"],
  h: ["は", "ひ", "ふ", "へ", "ほ"],
  m: ["ま", "み", "む", "め", "も"],
  y: ["や", null, "ゆ", null, "よ"],
  r: ["ら", "り", "る", "れ", "ろ"],
  w: ["わ", null, null, null, "を"],
  nn: ["ん", null, null, null, null],
};

const reading = readingOf;

export function KanaChart() {
  const state = useAppState();
  if (!state) return <PageSkeleton />;
  return <ChartBody settings={state.settings} progress={state.progress} />;
}

function ChartBody({ settings, progress }: { settings: Settings; progress: Progress }) {
  const router = useRouter();
  const [draft, setDraft] = useState<string[]>(settings.enabledChars);
  const [open, setOpen] = useState<string | null>(null);
  const selected = new Set(draft);

  const commit = (next: string[]) => {
    const ordered = ALL_KANA_LIST.filter((k) => next.includes(k));
    setDraft(ordered);
    // an empty selection isn't saved, the quiz always needs at least one char
    if (ordered.length) actions.updateSettings({ enabledChars: ordered });
  };

  const toggle = (k: string) => commit(selected.has(k) ? draft.filter((x) => x !== k) : [...draft, k]);
  const toggleRow = (chars: string[]) => {
    const all = chars.every((k) => selected.has(k));
    commit(all ? draft.filter((k) => !chars.includes(k)) : [...new Set([...draft, ...chars])]);
  };

  const practice = (chars?: string[]) => {
    // small っ on its own can't make a word, so bring the basics along
    if (chars?.every((k) => k === SMALL_TSU)) chars = [...BASIC_KANA_LIST, ...chars];
    if (chars) commit(chars);
    actions.clearActive();
    router.push("/practice");
  };

  const wordCount = wordsForChars(draft).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hiragana chart"
        description="The basic 46, then dakuten, combos and small っ. Tick the ones you want in your rounds, or open one to see how you're doing with it."
      />

      <div className="sticky top-[4.5rem] z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-surface/95 shadow-[0_4px_0_var(--border)] p-3 shadow-card backdrop-blur lg:top-4">
        <Button variant="secondary" size="sm" onClick={() => commit([...BASIC_KANA_LIST])}>
          Basic 46
        </Button>
        <Button variant="secondary" size="sm" onClick={() => commit([...ALL_KANA_LIST])}>
          Everything
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDraft([])}>
          Clear
        </Button>
        <span className="text-sm text-muted">
          <strong className="text-foreground">{draft.length}</strong> selected, {wordCount} real words available
        </span>
        <Button className="ml-auto" disabled={draft.length === 0} onClick={() => practice()}>
          <Play /> Practice selected
        </Button>
      </div>

      {draft.length === 0 && (
        <p role="status" className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
          Select at least one character. Your last saved selection is still used until you pick something.
        </p>
      )}
      {draft.length > 0 && wordCount < 10 && (
        <p role="status" className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary">
          Only {wordCount} real word{wordCount === 1 ? "" : "s"} can be spelled with this selection. Real Words mode will give short rounds, so Random Combos is the better fit here.
        </p>
      )}

      {KANA_GROUPS.map((g) => (
        <GroupTable
          key={g.id}
          group={g}
          selected={selected}
          progress={progress}
          onToggle={toggle}
          onToggleRow={toggleRow}
          onOpen={setOpen}
          onPractice={() => practice(g.chars)}
        />
      ))}
      <div className="flex flex-wrap gap-4 px-2 text-xs text-muted">
        <span className="flex items-center gap-1.5"><CircleDot className="size-3.5 text-primary" /> practiced</span>
        <span className="flex items-center gap-1.5"><Sparkles className="size-3.5 text-sun-deep" /> mastered</span>
      </div>

      <CharDetail kana={open} progress={progress} onClose={() => setOpen(null)} onPracticeRow={(chars) => practice(chars)} />
    </div>
  );
}

function GroupTable({
  group,
  selected,
  progress,
  onToggle,
  onToggleRow,
  onOpen,
  onPractice,
}: {
  group: KanaGroup;
  selected: Set<string>;
  progress: Progress;
  onToggle: (k: string) => void;
  onToggleRow: (chars: string[]) => void;
  onOpen: (k: string) => void;
  onPractice: () => void;
}) {
  const all = group.chars.every((k) => selected.has(k));
  const cols = Math.max(...group.rows.map((r) => (LAYOUT[r.id] ?? r.chars).length));
  return (
    <section aria-labelledby={`group-${group.id}`} className="rounded-[var(--radius-card)] bg-surface p-3 shadow-card sm:p-5">
      <div className="mb-3 flex flex-wrap items-start gap-3 px-2">
        <div className="min-w-0 flex-1 basis-64">
          <h2 id={`group-${group.id}`} className="font-display text-xl">
            <span lang="ja">{group.label}</span>
          </h2>
          <p className="text-sm text-muted">{group.blurb}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={all ? "outline" : "secondary"} onClick={() => onToggleRow(group.chars)} aria-pressed={all}>
            {all ? <Check /> : <Plus />} {all ? "In practice" : "Add to practice"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onPractice}>
            <Play /> Just these
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className={cn("border-separate border-spacing-1.5", cols >= 5 ? "w-full min-w-[520px]" : cols >= 3 ? "w-full min-w-[300px]" : "w-auto")}>
          <caption className="sr-only">{group.label}</caption>
          <tbody>
            {group.rows.map((row) => {
              const rowAll = row.chars.every((k) => selected.has(k));
              const rowSome = row.chars.some((k) => selected.has(k));
              const cells = LAYOUT[row.id] ?? row.chars;
              return (
                <tr key={row.id}>
                  <th scope="row" className="w-24 pr-2 text-left align-middle">
                    <button
                      type="button"
                      onClick={() => onToggleRow(row.chars)}
                      aria-pressed={rowAll}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-surface-2"
                    >
                      <span
                        className={cn(
                          "grid size-4 shrink-0 place-items-center rounded border",
                          rowAll ? "border-primary bg-primary text-primary-foreground" : rowSome ? "border-primary" : "border-border",
                        )}
                      >
                        {rowAll ? <Check className="size-3" /> : rowSome ? <span className="size-1.5 rounded-sm bg-primary" /> : null}
                      </span>
                      {row.label}
                    </button>
                  </th>
                  {cells.map((k, i) =>
                    k ? (
                      <td key={k} className={cn("p-0", cols < 3 && "w-28")}>
                        <KanaCell kana={k} selected={selected.has(k)} progress={progress} onToggle={() => onToggle(k)} onOpen={() => onOpen(k)} />
                      </td>
                    ) : (
                      <td key={`gap-${i}`} aria-hidden />
                    ),
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function KanaCell({
  kana,
  selected,
  progress,
  onToggle,
  onOpen,
}: {
  kana: string;
  selected: boolean;
  progress: Progress;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const s = progress.chars[kana];
  const mastered = isMastered(s);
  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 transition-colors",
        selected ? "border-primary/40 bg-primary-soft/50" : "border-border bg-background opacity-60",
      )}
    >
      <button type="button" onClick={onOpen} className="flex w-full flex-col items-center rounded-xl px-1 pb-2 pt-3" aria-label={`${kana}, ${reading(kana)}. Open details`}>
        <span lang="ja" className={cn("font-kana whitespace-nowrap text-3xl sm:text-4xl", kana.length > 1 && "kana-combo")}>{kana}</span>
        <span className="mt-1 text-xs text-muted">{reading(kana)}</span>
      </button>
      <span className="absolute left-1.5 top-1.5 flex gap-0.5">
        {mastered ? (
          <Sparkles className="size-3.5 text-sun-deep" aria-label="Mastered" />
        ) : s?.seen ? (
          <CircleDot className="size-3.5 text-primary" aria-label="Practiced" />
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        aria-label={`Include ${kana} in practice`}
        className="absolute right-1.5 top-1.5 size-4 cursor-pointer accent-[var(--primary)]"
      />
    </div>
  );
}

function CharDetail({
  kana,
  progress,
  onClose,
  onPracticeRow,
}: {
  kana: string | null;
  progress: Progress;
  onClose: () => void;
  onPracticeRow: (chars: string[]) => void;
}) {
  const c = kana ? getKana(kana) : undefined;
  const s = kana ? progress.chars[kana] : undefined;
  const row = c ? getRow(c.row) : undefined;
  const examples = kana ? HIRAGANA_VOCAB.filter((w) => w.kana.includes(kana)).slice(0, 5) : [];
  const confused = kana ? LOOKALIKES.find((g) => g.includes(kana))?.filter((k) => k !== kana) ?? [] : [];

  return (
    <Dialog open={!!kana} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {c && row && (
          <div className="space-y-4">
            <div className="flex items-center gap-5">
              <span lang="ja" className={cn("font-kana grid h-24 min-w-24 place-items-center rounded-2xl bg-primary-soft px-2 text-primary", c.kana.length > 1 ? "text-5xl" : "text-6xl")}>
                {c.kana}
              </span>
              <div className="space-y-1">
                <DialogTitle className="text-2xl">{c.kana === SMALL_TSU ? "small tsu" : c.romaji[0]}</DialogTitle>
                <DialogDescription>
                  {c.kana === SMALL_TSU ? (
                    "No sound of its own. It doubles the next consonant: きって = kitte, まっちゃ = matcha."
                  ) : (
                    <>
                      {row.label}
                      {c.romaji.length > 1 && `, also typed as ${c.romaji.slice(1).join(", ")}`}
                      {c.kana === "ん" && ", type n, nn or n'"}
                    </>
                  )}
                </DialogDescription>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {isMastered(s) ? <Badge tone="sun">Mastered</Badge> : s?.seen ? <Badge tone="primary">Practiced</Badge> : <Badge>Not seen yet</Badge>}
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-surface-2 p-2">
                <dt className="text-xs text-muted">Accuracy</dt>
                <dd className="font-extrabold">{s?.seen ? pct(charAccuracy(s)) : "None"}</dd>
              </div>
              <div className="rounded-xl bg-surface-2 p-2">
                <dt className="text-xs text-muted">Reads</dt>
                <dd className="font-extrabold">{s?.seen ?? 0}</dd>
              </div>
              <div className="rounded-xl bg-surface-2 p-2">
                <dt className="text-xs text-muted">Good rounds</dt>
                <dd className="font-extrabold">{Math.min(s?.roundsCorrect ?? 0, 99)}/3</dd>
              </div>
            </dl>

            {confused.length > 0 && (
              <p className="text-sm text-muted">
                Easy to mix up with{" "}
                {confused.map((k, i) => (
                  <span key={k}>
                    <span lang="ja" className="font-kana text-lg text-foreground">{k}</span> ({reading(k)}){i < confused.length - 1 ? ", " : ""}
                  </span>
                ))}
              </p>
            )}

            {examples.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Words with {c.kana}</p>
                <ul className="space-y-1 text-sm">
                  {examples.map((w) => (
                    <li key={w.id} className="flex gap-3">
                      <span lang="ja" className="font-kana w-20 text-base">{w.kana}</span>
                      <span className="w-20 text-muted">{w.romaji}</span>
                      <span className="truncate">{w.meaning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button className="w-full" onClick={() => onPracticeRow(row.chars)}>
              <Play /> Practice {c.kana === SMALL_TSU ? "small っ" : `the ${row.label}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
