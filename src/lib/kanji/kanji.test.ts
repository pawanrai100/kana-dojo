import { describe, expect, it } from "vitest";
import { KANJI, KANJI_LIST, KANJI_WORDS, LESSONS, N5_KANJI, exampleWords, getKanji, kanjiOfLessons, kanjiTwins, wordsFor } from "./data";
import { buildKanjiRound, checkMeaning, checkReading, meaningMatches, pickOptions, type KanjiQuestion, type KanjiResult } from "./quiz";
import { applyKanjiRound, kanjiLevel, knownKanji } from "./progress";
import { emptyProgress, type CharStat } from "@/lib/progress/types";
import { sanitizeProgress } from "@/lib/progress/sanitize";
import { mergeDiverged, mergeGuestInto } from "@/lib/sync/merge";
import { beltStatus, withBelt } from "@/lib/progress/belts";
import { KANJI_LESSON_COUNT, sanitizeSettings } from "@/lib/settings/types";
import { mulberry32 } from "@/lib/quiz/random";
import { dayKey } from "@/lib/progress/stats";

const word = (id: string) => KANJI_WORDS.find((w) => w.id === id)!;
const solid: CharStat = { seen: 6, correct: 6, streak: 6, roundsCorrect: 3, recent: [true, true, true, true, true], lastSeen: 1 };

describe("kanji data", () => {
  it("has the n5 set split into lessons", () => {
    expect(KANJI.length).toBeGreaterThanOrEqual(100);
    expect(new Set(KANJI_LIST).size).toBe(KANJI_LIST.length);
    expect(LESSONS.length).toBe(KANJI_LESSON_COUNT);
    for (const l of LESSONS) expect(KANJI.some((k) => k.lesson === l.id)).toBe(true);
  });

  it("has the 500 most used, with n5 first", () => {
    expect(KANJI.length).toBe(500);
    expect(N5_KANJI.length).toBe(105);
    expect(kanjiOfLessons([10])).toContain("同");
    expect(sanitizeSettings({ kanjiLessons: [25, 26] }).kanjiLessons).toEqual([25]);
  });

  it("shows easy example words first", () => {
    expect(exampleWords("日").slice(0, 4).map((w) => w.word)).toEqual(["日", "毎日", "今日", "日曜日"]);
    expect(exampleWords("同")[0].word).toBe("同じ");
  });

  it("gives every kanji at least one word to read", () => {
    for (const k of KANJI) expect(KANJI_WORDS.some((w) => w.kanji.includes(k.k)), k.k).toBe(true);
  });

  it("every kanji has a meaning, a reading and a trick", () => {
    for (const k of KANJI) {
      expect(k.meanings.length, k.k).toBeGreaterThan(0);
      expect(k.on.length + k.kun.length, k.k).toBeGreaterThan(0);
      expect(k.trick.length, k.k).toBeGreaterThan(10);
    }
  });

  it("only offers words you have every kanji for", () => {
    const ws = wordsFor(kanjiOfLessons([1]));
    expect(ws.length).toBeGreaterThan(5);
    for (const w of ws) for (const k of w.kanji) expect(kanjiOfLessons([1])).toContain(k);
    expect(ws.map((w) => w.id)).not.toContain("日本");
  });

  it("knows the lookalikes both ways", () => {
    expect(kanjiTwins("日").map((t) => t.other)).toContain("目");
    expect(kanjiTwins("目").map((t) => t.other)).toContain("日");
  });
});

describe("checking answers", () => {
  it("is easy going on meanings", () => {
    expect(meaningMatches("日", "sun")).toBe(true);
    expect(meaningMatches("日", "The Sun")).toBe(true);
    expect(meaningMatches("日", "days")).toBe(true);
    expect(meaningMatches("食", "to eat")).toBe(true);
    expect(meaningMatches("食", "eat")).toBe(true);
    expect(meaningMatches("山", "moutain")).toBe(true);
    expect(meaningMatches("山", "sun, mountain")).toBe(true);
    expect(meaningMatches("日", "moon")).toBe(false);
    expect(meaningMatches("日", "")).toBe(false);
    expect(meaningMatches("二", "tow")).toBe(false); // short words need to be spelled right
    expect(meaningMatches("万", "10,000")).toBe(true);
    expect(meaningMatches("八", "8")).toBe(true);
    expect(meaningMatches("八", "9")).toBe(false);
    expect(meaningMatches("日", "moon, fire, water, sun")).toBe(false);
  });

  it("a real meaning of another kanji isn't a typo", () => {
    // "eight" is one letter off "right", but it's 八
    expect(checkMeaning("右", "eight")).toEqual({ correct: false, mixedWith: "八" });
    expect(checkMeaning("右", "rihgt").correct).toBe(false);
    expect(checkMeaning("右", "rigt").correct).toBe(false); // too short for typos
    expect(checkMeaning("政", "politcs").correct).toBe(true);
    // synonyms are fine: 場 and 所 both mean place
    expect(checkMeaning("所", "place").correct).toBe(true);
  });

  it("never offers a second right answer on pick cards", () => {
    for (const k of KANJI_LIST) {
      const main = getKanji(k)!.meanings[0];
      for (let s = 0; s < 3; s++) {
        const o = pickOptions(k, KANJI_LIST, mulberry32(s));
        for (const c of o) if (c !== k) expect(meaningMatches(c, main, false), `${k} ${main} vs ${c}`).toBe(false);
      }
    }
  });

  it("points out the kanji you mixed it up with", () => {
    expect(checkMeaning("日", "eye")).toEqual({ correct: false, mixedWith: "目" });
    expect(checkMeaning("右", "left")).toEqual({ correct: false, mixedWith: "左" });
    expect(checkMeaning("日", "banana").mixedWith).toBeUndefined();
  });

  it("takes readings in romaji or kana", () => {
    expect(checkReading(word("学校"), "gakkou")).toBe(true);
    expect(checkReading(word("学校"), "がっこう")).toBe(true);
    expect(checkReading(word("学校"), "ガッコウ")).toBe(true);
    expect(checkReading(word("学校"), "gakou")).toBe(false);
    expect(checkReading(word("十分"), "juppun")).toBe(true);
    expect(checkReading(word("日本"), "nihon")).toBe(true);
    expect(checkReading(word("日本"), "")).toBe(false);
  });
});

describe("building a round", () => {
  const stats = { kanji: {}, kanjiRead: {}, kanjiWords: {} };

  it("only uses the kanji you picked, and fills the round", () => {
    const pool = kanjiOfLessons([1, 2]);
    const qs = buildKanjiRound({ pool, stats, mode: "mixed", size: 10, rng: mulberry32(1) });
    expect(qs).toHaveLength(10);
    for (const q of qs) expect(pool).toContain(q.kanji);
    for (let i = 1; i < qs.length; i++) expect(qs[i].kanji).not.toBe(qs[i - 1].kanji);
  });

  it("meets brand new kanji with a pick card first", () => {
    const qs = buildKanjiRound({ pool: kanjiOfLessons([3]), stats, mode: "mixed", size: 10, rng: mulberry32(2) });
    expect(qs.every((q) => q.kind === "pick")).toBe(true);
  });

  it("reading cards only use words from your lessons", () => {
    const pool = kanjiOfLessons([1]);
    const qs = buildKanjiRound({ pool, stats, mode: "reading", size: 10, rng: mulberry32(3) });
    for (const q of qs) {
      expect(q.kind).toBe("reading");
      for (const k of q.word!.kanji) expect(pool).toContain(k);
    }
  });

  it("gives four different options, one of them right", () => {
    for (let s = 0; s < 20; s++) {
      const o = pickOptions("日", kanjiOfLessons([1]), mulberry32(s));
      expect(o).toHaveLength(4);
      expect(new Set(o).size).toBe(4);
      expect(o).toContain("日");
    }
  });

  it("works with a single kanji", () => {
    expect(buildKanjiRound({ pool: ["一"], stats, mode: "meaning", size: 5, rng: mulberry32(4) })).toHaveLength(5);
    expect(buildKanjiRound({ pool: [], stats, mode: "meaning", size: 5, rng: mulberry32(4) })).toHaveLength(0);
  });
});

describe("kanji progress", () => {
  const q = (kind: KanjiQuestion["kind"], k: string, w?: string): KanjiQuestion => ({ id: k + kind, kind, kanji: k, word: w ? word(w) : undefined });
  const res = (qq: KanjiQuestion, correct: boolean): KanjiResult => ({ q: qq, correct, typed: "", ms: 2000 });
  const now = new Date(2026, 10, 10, 12).getTime();

  it("counts toward totals, the day and the streak, without touching kana stats", () => {
    const p = applyKanjiRound(emptyProgress(), "r1", [res(q("meaning", "日"), true), res(q("pick", "月"), false), res(q("reading", "学", "学校"), true)], now);
    expect(p.totalAnswered).toBe(3);
    expect(p.totalCorrect).toBe(2);
    expect(p.roundsCompleted).toBe(1);
    const d = p.days[dayKey(now)];
    expect(d).toMatchObject({ answered: 3, correct: 2, rounds: 1, kanji: 2 });
    expect(p.kanji["日"].correct).toBe(1);
    expect(p.kanji["月"].correct).toBe(0);
    expect(p.kanjiRead["学"].correct).toBe(1);
    expect(p.kanjiRead["校"].correct).toBe(1);
    expect(p.kanjiWords["学校"].lastCorrect).toBe(true);
    expect(p.chars).toEqual({});
    expect(p.bestStreak).toBe(1);
  });

  it("needs both meaning and reading to call a kanji known", () => {
    const p = { ...emptyProgress(), kanji: { 一: solid, 二: solid }, kanjiRead: { 一: solid } };
    expect(kanjiLevel(p, "一")).toBe("known");
    expect(kanjiLevel(p, "二")).toBe("meaning");
    expect(kanjiLevel(p, "三")).toBe("new");
    expect(knownKanji(p)).toEqual(["一"]);
  });

  it("earns kanji belts", () => {
    const nums = kanjiOfLessons([1]);
    const all = Object.fromEntries(nums.map((k) => [k, solid]));
    const p = withBelt({ ...emptyProgress(), kanji: all, kanjiRead: all });
    expect(beltStatus(p, "kanji").belt.id).toBe("j-yellow");
    expect(p.kjBelt).toBe(1);
    expect(p.belt).toBe(0);
  });
});

describe("saving and syncing kanji", () => {
  it("keeps kanji through a save and drops junk", () => {
    const p = { ...emptyProgress(), kanji: { 日: solid }, kanjiRead: { 日: solid }, kanjiWords: { 日本: { seen: 1, correct: 1, roundsCorrect: 1, lastCorrect: true, lastSeen: 1 } }, kjBelt: 2 };
    const raw = JSON.parse(JSON.stringify({ ...p, kanji: { ...p.kanji, 猫: solid, あ: solid }, kanjiWords: { ...p.kanjiWords, 猫犬: p.kanjiWords["日本"] } }));
    const back = sanitizeProgress(raw);
    expect(back.kanji).toEqual({ 日: solid });
    expect(back.kanjiRead).toEqual({ 日: solid });
    expect(Object.keys(back.kanjiWords)).toEqual(["日本"]);
    expect(back.kjBelt).toBe(2);
  });

  it("old saves without kanji load fine", () => {
    const old = JSON.parse(JSON.stringify(emptyProgress()));
    delete old.kanji;
    delete old.kanjiRead;
    delete old.kanjiWords;
    delete old.kjBelt;
    old.chars = { あ: solid };
    const back = sanitizeProgress(old);
    expect(back.chars).toEqual({ あ: solid });
    expect(back.kanji).toEqual({});
    expect(back.kjBelt).toBe(0);
  });

  it("merges kanji between devices and from a guest", () => {
    const a = { ...emptyProgress(), kanji: { 日: solid }, kjBelt: 1 };
    const b = { ...emptyProgress(), kanji: { 日: { ...solid, seen: 2, correct: 1 }, 月: solid }, kanjiRead: { 月: solid } };
    const m = mergeDiverged(a, b);
    expect(m.kanji["日"].seen).toBe(6);
    expect(m.kanji["月"]).toEqual(solid);
    expect(m.kjBelt).toBe(1);
    const g = mergeGuestInto(a, b);
    expect(g.kanji["日"].seen).toBe(8);
    expect(g.kanjiRead["月"]).toEqual(solid);
  });

  it("guest days add up the kanji counter", () => {
    const k = "2026-11-10";
    const a = { ...emptyProgress(), days: { [k]: { answered: 5, correct: 4, rounds: 1, xp: 0, kanji: 4 } } };
    const b = { ...emptyProgress(), days: { [k]: { answered: 5, correct: 3, rounds: 1, xp: 0, kanji: 3 } } };
    expect(mergeGuestInto(a, b).days[k].kanji).toBe(7);
  });
});

describe("kanji settings", () => {
  it("defaults to the first lesson and cleans bad picks", () => {
    expect(sanitizeSettings({}).kanjiLessons).toEqual([1]);
    expect(sanitizeSettings({ kanjiLessons: [3, 1, 3, 99, "x", 0] }).kanjiLessons).toEqual([1, 3]);
    expect(sanitizeSettings({ kanjiLessons: [] }).kanjiLessons).toEqual([1]);
    expect(sanitizeSettings({ kanjiMode: "nope" }).kanjiMode).toBe("mixed");
    expect(sanitizeSettings({ kanjiMode: "reading" }).kanjiMode).toBe("reading");
  });
});
