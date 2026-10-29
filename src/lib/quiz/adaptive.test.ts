import { describe, expect, it } from "vitest";
import { BASIC_KANA_LIST } from "@/lib/kana/hiragana";
import type { CharStat, WordStat } from "@/lib/progress/types";
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from "@/lib/settings/types";
import { HIRAGANA_VOCAB } from "@/lib/vocab/hiragana-words";
import { charWeight, focusChars, needsFocus, restMs } from "./adaptive";
import { generateRound, withFocus } from "./generate";
import { mulberry32 } from "./random";
import { EMPTY_GEN_STATE } from "./types";

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// a char stat from a list of results, oldest first
function stat(results: boolean[], lastSeenAgo = HOUR, extra: Partial<CharStat> = {}): CharStat {
  let streak = 0;
  for (const ok of results) streak = ok ? streak + 1 : 0;
  const correct = results.filter(Boolean).length;
  return {
    seen: results.length,
    correct,
    streak,
    roundsCorrect: correct,
    recent: results.slice(-10),
    lastSeen: NOW - lastSeenAgo,
    ...extra,
  };
}

const allGood = (n: number) => Array<boolean>(n).fill(true);

describe("char weighting", () => {
  it("a char you just missed outranks one you know and one you've never seen", () => {
    const missed = charWeight(stat([true, true, false]), "ね", NOW);
    expect(missed).toBeGreaterThan(charWeight(stat(allGood(8)), "ね", NOW));
    expect(missed).toBeGreaterThan(charWeight(undefined, "ね", NOW));
  });

  it("chars you keep missing over time stay boosted even after a couple of right answers", () => {
    const shaky = stat([false, true, false, false, true, false, true, true]);
    const solid = stat(allGood(8));
    expect(charWeight(shaky, "ぬ", NOW)).toBeGreaterThan(charWeight(solid, "ぬ", NOW) * 2);
    expect(needsFocus(shaky)).toBe(true);
    expect(needsFocus(solid)).toBe(false);
  });

  it("known chars rest longer the more you get them right, then come back when due", () => {
    expect(restMs(1)).toBeLessThan(restMs(4));
    const known = (ago: number) => charWeight(stat(allGood(6), ago), "か", NOW);
    expect(known(40 * DAY)).toBeGreaterThan(known(HOUR)); // overdue beats just-seen
  });

  it("focus list puts the worst chars first and only includes chars that need it", () => {
    const stats: Record<string, CharStat> = {
      あ: stat(allGood(6)),
      ね: stat([true, false]),
      ぬ: stat([false, false, false]),
    };
    expect(focusChars(["あ", "ね", "ぬ"], stats, 8, NOW)).toEqual(["ぬ", "ね"]);
  });
});

describe("missed things come back", () => {
  const settings = (s: Partial<Settings>) => ({ ...DEFAULT_SETTINGS, questionsPerRound: 10 as const, ...s });

  it("a missed char shows up at least twice in the next random round", () => {
    const chars: Record<string, CharStat> = {};
    for (const k of BASIC_KANA_LIST) chars[k] = stat(allGood(5), 2 * HOUR);
    chars["ぬ"] = stat([true, true, false], HOUR);
    for (let seed = 1; seed <= 20; seed++) {
      const r = generateRound({ settings: settings({ mode: "random" }), chars, words: {}, gen: EMPTY_GEN_STATE, rng: mulberry32(seed), now: NOW });
      if (!r.ok) throw new Error(r.message);
      const count = r.round.questions.flatMap((q) => q.chars).filter((k) => k === "ぬ").length;
      expect(count, `seed ${seed}`).toBeGreaterThanOrEqual(2);
      expect(r.round.focus).toContain("ぬ");
    }
  });

  it("a word you got wrong comes back next round even though it was just used", () => {
    const target = HIRAGANA_VOCAB.find((w) => w.kana === "ねこ")!;
    const words: Record<string, WordStat> = {
      [target.id]: { seen: 1, correct: 0, roundsCorrect: 0, lastCorrect: false, lastSeen: NOW - HOUR },
    };
    let hits = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const r = generateRound({
        settings: settings({ mode: "words", lengthRange: "2-3" }),
        chars: {},
        words,
        gen: { ...EMPTY_GEN_STATE, usedWords: [target.id] },
        rng: mulberry32(seed),
        now: NOW,
      });
      if (r.ok && r.round.questions.some((q) => q.wordId === target.id)) hits++;
    }
    expect(hits).toBeGreaterThanOrEqual(16);
  });

  it("withFocus places each focus char twice and keeps the rest of the deck", () => {
    const deck = ["あ", "い", "う", "え", "お", "か", "き", "く", "け", "こ"];
    const out = withFocus(deck, ["ぬ", "か"], mulberry32(3));
    expect(out.filter((k) => k === "ぬ")).toHaveLength(2);
    expect(out.filter((k) => k === "か")).toHaveLength(2);
    expect(out.slice(0, 4)).toEqual(expect.arrayContaining(["ぬ", "か"]));
    for (const k of deck.filter((k) => k !== "か")) expect(out).toContain(k);
  });
});

describe("kana font", () => {
  it("drops the old font setting from saved settings", () => {
    expect("kanaFont" in sanitizeSettings({ kanaFont: "textbook" })).toBe(false);
  });
});

describe("second chances and finishing early", () => {
  it("builds a retry question that has the kana you missed", async () => {
    const { makeRetryQuestion } = await import("./generate");
    for (const mode of ["mixed", "random", "words"] as const) {
      for (let seed = 1; seed <= 15; seed++) {
        const q = makeRetryQuestion({
          missed: ["ね"],
          settings: { ...DEFAULT_SETTINGS, mode },
          chars: {},
          avoid: new Set(["ねこ"]),
          rng: mulberry32(seed),
        });
        expect(q, `${mode} ${seed}`).not.toBeNull();
        expect(q!.chars).toContain("ね");
        expect(q!.retry).toBe(true);
        expect(q!.kana).not.toBe("ねこ");
      }
    }
  });

  it("cards you never reached don't count as misses", async () => {
    const { gradeRound, emptyAnswer } = await import("./grade");
    const { applyGradedRound } = await import("@/lib/progress/update");
    const { emptyProgress } = await import("@/lib/progress/types");
    const r = generateRound({ settings: { ...DEFAULT_SETTINGS, mode: "random", questionsPerRound: 5 }, chars: {}, words: {}, gen: EMPTY_GEN_STATE, rng: mulberry32(9), now: NOW });
    if (!r.ok) throw new Error(r.message);
    const qs = r.round.questions;
    // answer the first two (one right, one wrong), finish before the rest
    const answers = qs.map(emptyAnswer);
    answers[0] = { value: qs[0].romaji, locked: true, timedOut: false, timeUsedMs: 1000 };
    answers[1] = { value: "zz", locked: true, timedOut: false, timeUsedMs: 1000 };
    const g = gradeRound(r.round, answers, { durationMs: 5000 });
    expect(g.results.filter((x) => x.unanswered)).toHaveLength(3);
    const p = applyGradedRound(emptyProgress(), g, r.gen, NOW);
    expect(p.totalAnswered).toBe(2);
    const seen = new Set([...qs[0].chars, ...qs[1].chars]);
    for (const k of qs.slice(2).flatMap((q) => q.chars)) {
      if (!seen.has(k)) expect(p.chars[k], k).toBeUndefined();
    }
  });
});
