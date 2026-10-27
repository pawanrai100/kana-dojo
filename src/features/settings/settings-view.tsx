"use client";

import Link from "next/link";
import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, PageSkeleton } from "@/components/layout/page-header";
import { HIRAGANA_ROWS } from "@/lib/kana/hiragana";
import type { Settings } from "@/lib/settings/types";
import { cn } from "@/lib/utils";
import { actions, useAppState } from "@/store/app-store";

export function SettingsView() {
  const state = useAppState();
  if (!state) return <PageSkeleton />;
  return <SettingsBody s={state.settings} />;
}

function SettingsBody({ s }: { s: Settings }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const set = (patch: Partial<Settings>) => {
    actions.updateSettings(patch);
    // new settings apply from the next round
    if (patch.mode || patch.questionsPerRound || patch.lengthRange || patch.timerPace) actions.clearActive();
  };
  const enabled = new Set(s.enabledChars);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Changes save automatically and apply from your next round." />

      <Card>
        <CardHeader>
          <CardTitle>Rounds</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <Row label="Practice mode" hint="Mixed blends real words with random kana.">
            <Segmented
              label="Practice mode"
              value={s.mode}
              onChange={(mode) => set({ mode })}
              options={[
                { value: "mixed", label: "Mixed" },
                { value: "words", label: "Real words" },
                { value: "random", label: "Random combos" },
              ]}
            />
          </Row>
          <Row label="Questions per round">
            <Segmented
              label="Questions per round"
              value={s.questionsPerRound}
              onChange={(questionsPerRound) => set({ questionsPerRound })}
              options={[5, 10, 15, 20].map((n) => ({ value: n as Settings["questionsPerRound"], label: String(n) }))}
            />
          </Row>
          <Row label="Word length" hint="Number of kana per question.">
            <Segmented
              label="Word length"
              value={s.lengthRange}
              onChange={(lengthRange) => set({ lengthRange })}
              options={[
                { value: "2-3", label: "2–3" },
                { value: "2-5", label: "2–5" },
                { value: "3-7", label: "3–7" },
              ]}
            />
          </Row>
          <Row label="Timer pace" hint="Each word gets time based on its length, tricky lookalikes and your weak spots. Zen turns the clock off.">
            <Segmented
              label="Timer pace"
              value={s.timerPace}
              onChange={(timerPace) => set({ timerPace })}
              options={[
                { value: "off", label: "Zen" },
                { value: "relaxed", label: "Relaxed" },
                { value: "normal", label: "Normal" },
                { value: "fast", label: "Fast" },
              ]}
            />
          </Row>
          <ToggleRow label="Show question numbers" checked={s.showNumbers} onChange={(showNumbers) => set({ showNumbers })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Character groups</CardTitle>
          <CardDescription>
            Pick rows here, or individual characters on the{" "}
            <Link href="/chart" className="text-primary underline-offset-4 hover:underline">
              chart
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {HIRAGANA_ROWS.map((row) => {
              const on = row.chars.every((k) => enabled.has(k));
              const some = !on && row.chars.some((k) => enabled.has(k));
              return (
                <button
                  key={row.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = on ? s.enabledChars.filter((k) => !row.chars.includes(k)) : [...s.enabledChars, ...row.chars];
                    if (next.length) set({ enabledChars: next });
                  }}
                  className={cn(
                    "press rounded-2xl border-2 px-3.5 py-2 text-sm font-bold transition-colors",
                    on ? "border-primary bg-primary-soft text-primary" : some ? "border-primary/50 border-dashed" : "border-border hover:bg-surface-2",
                  )}
                >
                  <span lang="ja" className="font-kana mr-1.5 text-base">{row.chars[0]}</span>
                  {row.label}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm text-muted">
            {s.enabledChars.length} of 46 enabled
            <Button size="sm" variant="ghost" onClick={() => set({ enabledChars: HIRAGANA_ROWS.flatMap((r) => r.chars) })}>
              Enable all
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Experience</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <Row label="Theme">
            <Segmented
              label="Theme"
              value={s.theme}
              onChange={(theme) => set({ theme })}
              options={[
                { value: "light", label: <span className="flex items-center gap-1.5"><Sun className="size-3.5" />Light</span> },
                { value: "dark", label: <span className="flex items-center gap-1.5"><Moon className="size-3.5" />Dark</span> },
                { value: "system", label: <span className="flex items-center gap-1.5"><Monitor className="size-3.5" />System</span> },
              ]}
            />
          </Row>
          <Row label="Kana style" hint="Pick whichever is easiest for you to read. Clear keeps the stroke gaps you'd write by hand.">
            <Segmented
              label="Kana style"
              value={s.kanaFont}
              onChange={(kanaFont) => set({ kanaFont })}
              options={[
                { value: "clear", label: <FontSample font="'Zen Maru Gothic'" weight={700} name="Clear" /> },
                { value: "textbook", label: <FontSample font="'Klee One'" weight={600} name="Textbook" /> },
                { value: "rounded", label: <FontSample font="'M PLUS Rounded 1c'" weight={800} name="Bold" /> },
              ]}
            />
          </Row>
          <ToggleRow label="Sound effects" checked={s.sound} onChange={(sound) => set({ sound })} />
          <ToggleRow label="Focus the answer box automatically" checked={s.autoFocus} onChange={(autoFocus) => set({ autoFocus })} />
          <ToggleRow
            label="Keyboard shortcuts"
            hint="Enter or N for the next round, Shift+Enter to skip. Enter always moves between answers."
            checked={s.shortcuts}
            onChange={(shortcuts) => set({ shortcuts })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>Progress lives in this browser only. Clearing site data also removes it.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => actions.resetSettings()}>
            Restore default settings
          </Button>
          <Button variant="outline" className="text-bad" onClick={() => setConfirmReset(true)}>
            Reset all progress
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogTitle>Reset all progress?</DialogTitle>
          <DialogDescription className="mt-2">
            This deletes your stats, streaks, XP and mastery from this browser. It can&apos;t be undone.
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Keep progress
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                actions.resetProgress();
                setConfirmReset(false);
              }}
            >
              Reset progress
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="mt-0.5 max-w-sm text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {hint && <p className="mt-0.5 max-w-sm text-xs text-muted">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// each option previews itself in its own font
function FontSample({ font, weight, name }: { font: string; weight: number; name: string }) {
  return (
    <span className="flex flex-col items-center leading-tight">
      <span lang="ja" aria-hidden style={{ fontFamily: font, fontWeight: weight }} className="text-xl">
        さぬね
      </span>
      <span className="text-xs">{name}</span>
    </span>
  );
}
