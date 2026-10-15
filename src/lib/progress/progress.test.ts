import { describe, expect, it } from "vitest";
import { gradeRound } from "@/lib/quiz/grade";
import type { AnswerState, Question, Round } from "@/lib/quiz/types";
import { toRomaji } from "@/lib/kana/hiragana";
import { sanitizeProgress } from "./sanitize";
import { currentStreak, dayKey, encounteredChars, isMastered, levelInfo, masteredChars, weakChars, wordsLearned } from "./stats";
import { emptyProgress } from "./types";
import { applyGradedRound } from "./update";
import { sanitizeSettings, DEFAULT_SETTINGS } from "@/lib/settings/types";
import { sanitizeActiveRound } from "@/lib/quiz/session";

const DAY = 86_400_000;
let rid = 0;

function q(kana: string, kind: "word" | "random" = "word"): Question {
  return {
    id: kana,
    kind,
    kana,
    romaji: toRomaji(kana),
    chars: Array.from(kana),
    wordId: kind === "word" ? kana : undefined,
    meaning: kind === "word" ? "x" : undefined,
    difficulty: "easy",
    timeLimitSec: 10,
  };
}
const ans = (value: string): AnswerState => ({ value, locked: true, timedOut: false, timeUsedMs: 2000 });

function play(p: ReturnType<typeof emptyProgress>, pairs: [string, string][], now: number) {
  const round: Round = { id: `r${rid++}`, createdAt: now, mode: "words", questions: pairs.map(([k]) => q(k)) };
  const g = gradeRound(round, pairs.map(([, a]) => ans(a)), { durationMs: 20000 });
  return { g, p: applyGradedRound(p, g, p.gen, now) };
}

describe("grading", () => {
  it("scores, combos and stars", () => {
    const round: Round = { id: "r", createdAt: 0, mode: "words", questions: [q("ねこ"), q("いぬ"), q("やま")] };
    const g = gradeRound(round, [ans("neko"), ans("inu"), ans("yamma")], { durationMs: 1 });
    expect(g.correctCount).toBe(2);
    expect(g.maxCombo).toBe(2);
    expect(g.results[2].points).toBe(0);
    expect(g.results[1].points).toBeGreaterThan(g.results[0].points); // combo bonus
    expect(g.stars).toBe(0 + 1);
  });
});

describe("progress tracking", () => {
  it("counts totals, chars and words", () => {
    const now = new Date(2026, 9, 15, 12).getTime();
    const { p } = play(emptyProgress(), [["ねこ", "neko"], ["いぬ", "inu"], ["さかな", "sakama"]], now);
    expect(p.totalAnswered).toBe(3);
    expect(p.totalCorrect).toBe(2);
    expect(p.roundsCompleted).toBe(1);
    expect(p.chars["ね"].correct).toBe(1);
    expect(p.chars["な"].correct).toBe(0); // misread
    expect(p.chars["さ"].correct).toBe(1); // read right inside a wrong word
    expect(p.words["さかな"].correct).toBe(0);
    expect(encounteredChars(p).length).toBe(7);
    expect(p.sessions).toHaveLength(1);
  });

  it("needs several separate rounds before mastery, and a miss drops it", () => {
    const t = new Date(2026, 9, 15, 12).getTime();
    let p = emptyProgress();
    p = play(p, [["ねこ", "neko"], ["ねこ", "neko"]], t).p;
    expect(isMastered(p.chars["ね"])).toBe(false); // one round only
    p = play(p, [["ねこ", "neko"]], t + 1000).p;
    expect(isMastered(p.chars["ね"])).toBe(false);
    p = play(p, [["ねこ", "neko"]], t + 2000).p;
    expect(isMastered(p.chars["ね"])).toBe(true);
    expect(masteredChars(p)).toContain("ね");
    p = play(p, [["ねこ", "nako"]], t + 3000).p;
    expect(isMastered(p.chars["ね"])).toBe(false);
  });

  it("never masters from wrong answers", () => {
    const t = Date.now();
    let p = emptyProgress();
    for (let i = 0; i < 6; i++) p = play(p, [["ねこ", "xx"]], t + i).p;
    expect(isMastered(p.chars["ね"])).toBe(false);
    expect(weakChars(p).map((w) => w.kana)).toContain("ね");
    expect(wordsLearned(p)).toBe(0);
  });

  it("tracks day streaks and sessions", () => {
    const d0 = new Date(2026, 9, 10, 12).getTime();
    let p = emptyProgress();
    for (let i = 0; i < 4; i++) p = play(p, [["ねこ", "neko"]], d0 + i * DAY).p;
    expect(currentStreak(p, d0 + 3 * DAY)).toBe(4);
    expect(currentStreak(p, d0 + 4 * DAY)).toBe(4); // yesterday still counts
    expect(currentStreak(p, d0 + 5 * DAY)).toBe(0);
    expect(p.bestStreak).toBe(4);
    expect(p.sessions).toHaveLength(4);
    p = play(p, [["いぬ", "inu"]], d0 + 3 * DAY + 60_000).p;
    expect(p.sessions).toHaveLength(4); // within 30 min, same session
    expect(p.days[dayKey(d0)].answered).toBe(1);
  });

  it("skipped rounds don't touch stats", () => {
    const round: Round = { id: "s", createdAt: 0, mode: "mixed", questions: [q("ねこ")] };
    const g = gradeRound(round, [], { durationMs: 0, skipped: true });
    const p = applyGradedRound(emptyProgress(), g, emptyProgress().gen);
    expect(p.totalAnswered).toBe(0);
    expect(p.roundsSkipped).toBe(1);
  });

  it("levels up with xp", () => {
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(100).level).toBe(2);
    expect(levelInfo(5000).level).toBeGreaterThan(5);
  });
});

describe("storage safety", () => {
  it("recovers from junk progress", () => {
    for (const junk of [null, 5, "x", [], { totalAnswered: -3, chars: { "が": {}, "ね": { seen: "a" } }, days: { bad: 1 } }]) {
      const p = sanitizeProgress(junk);
      expect(p.totalAnswered).toBeGreaterThanOrEqual(0);
      expect(p.chars["が"]).toBeUndefined();
    }
    const p = sanitizeProgress({ totalAnswered: 5, totalCorrect: 9 });
    expect(p.totalCorrect).toBe(5);
  });

  it("recovers from junk settings", () => {
    expect(sanitizeSettings("nope")).toEqual(DEFAULT_SETTINGS);
    const s = sanitizeSettings({ questionsPerRound: 7, enabledChars: ["が", "か", 3], mode: "words" });
    expect(s.questionsPerRound).toBe(10);
    expect(s.enabledChars).toEqual(["か"]);
    expect(s.mode).toBe("words");
    expect(sanitizeSettings({ enabledChars: ["が"] }).enabledChars).toHaveLength(46);
  });

  it("drops stored rounds containing excluded kana", () => {
    expect(sanitizeActiveRound({ round: { id: "x", questions: [{ id: "a", kana: "がっこう" }] } })).toBeNull();
    const ok = sanitizeActiveRound({ round: { id: "x", questions: [{ id: "a", kana: "ねこ" }] }, answers: [] });
    expect(ok?.answers).toHaveLength(1);
    expect(ok?.round.questions[0].romaji).toBe("neko");
  });
});
