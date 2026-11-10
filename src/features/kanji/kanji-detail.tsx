"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/misc";
import { toHiragana, toRomaji } from "@/lib/kana/hiragana";
import { getKanji, kanjiTwins, wordsWith } from "@/lib/kanji/data";
import { kanjiLevel, type KanjiLevel } from "@/lib/kanji/progress";
import { isWordLearned } from "@/lib/progress/stats";
import type { Progress } from "@/lib/progress/types";
import { cn } from "@/lib/utils";
import { SpeakerButton } from "@/features/voice/speaker-button";

export const LEVEL_LABEL: Record<KanjiLevel, string> = {
  new: "New",
  learning: "Learning",
  meaning: "Know the meaning",
  known: "Known",
};

export const LEVEL_TILE: Record<KanjiLevel, string> = {
  new: "bg-surface-2 text-foreground",
  learning: "bg-primary-soft text-primary ring-2 ring-inset ring-primary/60",
  meaning: "bg-sakura-soft text-sakura",
  known: "bg-sun text-sun-ink",
};

// た.べる -> た(べる), so you can see which part is the kanji
function Kun({ r }: { r: string }) {
  const [stem, tail] = r.split(".");
  return (
    <span lang="ja" className="font-kana">
      {stem}
      {tail && <span className="text-muted">({tail})</span>}
    </span>
  );
}

export function KanjiDetail({ k, progress, onClose, onPick }: { k: string | null; progress: Progress; onClose: () => void; onPick: (k: string) => void }) {
  const kj = k ? getKanji(k) : undefined;
  const level = k ? kanjiLevel(progress, k) : "new";
  const words = k ? wordsWith(k).slice(0, 6) : [];
  const twins = k ? kanjiTwins(k) : [];
  return (
    <Dialog open={!!kj} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {kj && (
          <div className="space-y-4">
            <div className="flex items-center gap-5">
              <span lang="ja" className={cn("font-kana grid size-24 shrink-0 place-items-center rounded-2xl text-6xl", LEVEL_TILE[level])}>
                {kj.k}
              </span>
              <div className="min-w-0 space-y-1">
                <DialogTitle className="text-2xl capitalize">{kj.meanings[0]}</DialogTitle>
                <DialogDescription>{kj.meanings.length > 1 ? `Also: ${kj.meanings.slice(1).join(", ")}` : "N5 kanji"}</DialogDescription>
                <Badge tone={level === "known" ? "sun" : level === "new" ? "default" : "primary"}>{LEVEL_LABEL[level]}</Badge>
              </div>
            </div>

            <p className="rounded-2xl bg-sun-soft px-4 py-3 text-sm">
              <strong>Trick:</strong> {kj.trick}
            </p>

            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-surface-2 p-3">
                <dt className="text-xs font-bold text-muted">On reading (in compounds)</dt>
                <dd className="mt-1 space-y-0.5">
                  {kj.on.length ? kj.on.map((r) => (
                    <p key={r}>
                      <span lang="ja" className="font-kana text-base">{r}</span> <span className="text-muted">{toRomaji(toHiragana(r))}</span>
                    </p>
                  )) : <p className="text-muted">None</p>}
                </dd>
              </div>
              <div className="rounded-xl bg-surface-2 p-3">
                <dt className="text-xs font-bold text-muted">Kun reading (on its own)</dt>
                <dd className="mt-1 space-y-0.5">
                  {kj.kun.length ? kj.kun.map((r) => (
                    <p key={r}>
                      <Kun r={r} /> <span className="text-muted">{toRomaji(r.replace(".", ""))}</span>
                    </p>
                  )) : <p className="text-muted">None</p>}
                </dd>
              </div>
            </dl>

            {words.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-extrabold">Words with {kj.k}</h3>
                <ul className="space-y-1.5">
                  {words.map((w) => (
                    <li key={w.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
                      <span lang="ja" className="font-kana text-xl">{w.word}</span>
                      <span className="min-w-0 flex-1 text-sm">
                        <span lang="ja" className="font-kana">{w.reading}</span> <span className="text-muted">{w.romaji}</span>
                        <span className="block truncate font-bold">{w.meaning}</span>
                      </span>
                      {isWordLearned(progress.kanjiWords?.[w.id]) && <Badge tone="good">Learned</Badge>}
                      <SpeakerButton text={w.reading} label={`Hear ${w.word}`} className="size-8" />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {twins.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-extrabold">Don&apos;t mix it up with</h3>
                <div className="flex flex-wrap gap-2">
                  {twins.map((t) => (
                    <button
                      key={t.other}
                      type="button"
                      onClick={() => onPick(t.other)}
                      className="font-kana grid size-12 place-items-center rounded-xl bg-surface-2 text-2xl hover:bg-primary-soft"
                      aria-label={`${t.other}, ${getKanji(t.other)?.meanings[0]}`}
                      lang="ja"
                    >
                      {t.other}
                    </button>
                  ))}
                </div>
                {[...new Set(twins.map((t) => t.tip))].map((tip) => (
                  <p key={tip} className="mt-2 text-sm text-muted">
                    {tip}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
