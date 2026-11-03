import { describe, expect, it } from "vitest";
import { SMALL_TSU, isLookalike, readingOf, splitKana } from "@/lib/kana/hiragana";
import { EMPTY_COACH } from "@/lib/quiz/adaptive";
import { mulberry32 } from "@/lib/quiz/random";
import { checkQuestion } from "@/lib/quiz/validate";
import { ALL_FLOORS } from "./floors";
import { availableMoves, bossBatch, bossMove, type MoveId } from "./boss-moves";

const bosses = ALL_FLOORS.filter((f) => f.boss);
const input = (f: (typeof bosses)[number], seed: number, rage = false) => ({ floor: f, rage, stats: {}, coach: EMPTY_COACH, rng: mulberry32(seed) });

describe("boss moves", () => {
  it("every boss builds readable cards from kana you've learned", () => {
    for (const f of bosses) {
      const allowed = new Set(f.chars);
      for (let s = 0; s < 60; s++) {
        const q = bossMove(input(f, s, s % 2 === 0))!;
        expect(q, f.boss!.name).toBeTruthy();
        const units = splitKana(q.kana);
        expect(units.every((k) => allowed.has(k)), `${f.boss!.name}: ${q.kana}`).toBe(true);
        expect(units[0] !== SMALL_TSU && units[0] !== "ん" && units.at(-1) !== SMALL_TSU, q.kana).toBe(true);
        expect(checkQuestion(q, q.romaji).correct, `${q.kana} = ${q.romaji}`).toBe(true);
        expect(units.length).toBeGreaterThanOrEqual(2);
        expect(q.timeLimitSec).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("each boss leans on its own moves", () => {
    const count = (id: string, m: MoveId) => {
      const f = bosses.find((b) => b.boss!.id === id)!;
      return Array.from({ length: 200 }, (_, s) => bossMove(input(f, s))!.challenge).filter((x) => x === m).length;
    };
    expect(count("pramirei", "tsu")).toBeGreaterThan(60);
    expect(count("alekoni", "marks")).toBeGreaterThan(60);
    expect(count("stellatsune", "combo")).toBeGreaterThan(40);
    expect(count("kitsune", "twin")).toBeGreaterThan(50);
  });

  it("twin traps never use same-sound pairs", () => {
    for (const f of bosses)
      for (let s = 0; s < 40; s++) {
        const q = bossMove(input(f, s), "twin");
        if (q?.challenge === "twin") expect(new Set(q.chars.filter(isLookalike).map(readingOf)).size, q.kana).toBeGreaterThanOrEqual(2);
      }
  });

  it("the first tower never throws sky moves at you", () => {
    const first = bosses.filter((f) => f.tower === "kana");
    for (const f of first) expect(availableMoves(f).some((m) => m === "marks" || m === "combo" || m === "tsu")).toBe(false);
  });

  it("rage makes cards longer and faster", () => {
    const f = bosses.find((b) => b.boss!.id === "orochi")!;
    const avg = (rage: boolean) => {
      const qs = Array.from({ length: 100 }, (_, s) => bossMove(input(f, s, rage), "twin")!);
      return [qs.reduce((n, q) => n + q.chars.length, 0) / qs.length, qs.reduce((n, q) => n + (q.timeLimitSec ?? 0) / q.chars.length, 0) / qs.length];
    };
    const [calmLen, calmPace] = avg(false);
    const [rageLen, ragePace] = avg(true);
    expect(rageLen).toBeGreaterThan(calmLen);
    expect(ragePace).toBeLessThan(calmPace);
  });

  it("keeps a few real words in the mix", () => {
    const f = bosses.find((b) => b.tower === "kana")!;
    const base = Array.from({ length: 8 }, (_, i) => ({ id: `w${i}`, kind: "word" as const, kana: "ねこ", romaji: "neko", chars: ["ね", "こ"], difficulty: "easy" as const, timeLimitSec: 8 }));
    const out = bossBatch(base, input(f, 1), "t");
    expect(out.filter((q) => q.challenge).length).toBe(6);
    expect(out.filter((q) => q.kind === "word").length).toBe(2);
  });
});
