import { describe, expect, it } from "vitest";
import { gradeRound } from "@/lib/quiz/grade";
import { splitKana, toRomaji } from "@/lib/kana/hiragana";
import type { Question } from "@/lib/quiz/types";
import { applyGradedRound } from "./update";
import { QUEST_XP, claimQuests, questsFor, todaysQuests } from "./quests";
import { dayKey } from "./stats";
import { emptyProgress } from "./types";

const NOW = new Date(2026, 9, 29, 12).getTime();
const q = (kana: string): Question => ({ id: kana, kind: "random", kana, romaji: toRomaji(kana), chars: splitKana(kana), difficulty: "easy", timeLimitSec: null });

describe("daily quests", () => {
  it("picks the same three different quests for the same day", () => {
    const a = questsFor("2026-10-29");
    expect(a.map((x) => x.id)).toEqual(questsFor("2026-10-29").map((x) => x.id));
    expect(new Set(a.map((x) => x.id)).size).toBe(3);
    const days = ["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"].map((d) => questsFor(d).map((x) => x.id).join());
    expect(new Set(days).size).toBeGreaterThan(1); // it does change day to day
  });

  it("counts what you do today and pays each quest exactly once", () => {
    let p = emptyProgress();
    const cards = ["あい", "うえ", "かき", "くけ", "さし"].map(q);
    for (let r = 0; r < 3; r++) {
      const g = gradeRound({ id: `r${r}`, createdAt: NOW, mode: "random", questions: cards }, cards.map((c) => ({ value: c.romaji, locked: true, timedOut: false, timeUsedMs: 1000 })), { durationMs: 5000 });
      p = applyGradedRound(p, g, p.gen, NOW + r);
    }
    const day = p.days[dayKey(NOW)];
    expect(day.rounds).toBe(3);
    expect(day.perfect).toBe(3);
    expect(day.bestCombo).toBe(5);
    const doneBefore = todaysQuests(p, NOW).filter((s) => s.done).length;
    const xp = p.xp;
    const first = claimQuests(p, NOW);
    expect(first.claimed.length).toBe(doneBefore);
    expect(first.progress.xp).toBe(xp + doneBefore * QUEST_XP);
    expect(claimQuests(first.progress, NOW).claimed).toEqual([]); // no double pay
  });
});
