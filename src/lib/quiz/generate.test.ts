import { describe, expect, it } from "vitest";
import { BASIC_KANA_LIST, HIRAGANA_ROWS, isBasicHiragana, toRomaji } from "@/lib/kana/hiragana";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings/types";
import { generateRound, resolveEnabled, wordsForChars, type GenerateInput } from "./generate";
import { mulberry32 } from "./random";
import { EMPTY_GEN_STATE, type GeneratorState } from "./types";

const base = (s: Partial<Settings> = {}, seed = 1): GenerateInput => ({
  settings: { ...DEFAULT_SETTINGS, ...s },
  chars: {},
  words: {},
  gen: EMPTY_GEN_STATE,
  rng: mulberry32(seed),
  now: 1_700_000_000_000,
});

function run(input: GenerateInput) {
  const r = generateRound(input);
  if (!r.ok) throw new Error(r.message);
  return r;
}

describe("generateRound", () => {
  it("makes the requested number of questions per mode", () => {
    for (const mode of ["mixed", "words", "random"] as const) {
      for (const n of [5, 10, 15, 20] as const) {
        const r = run(base({ mode, questionsPerRound: n }));
        expect(r.round.questions).toHaveLength(n);
      }
    }
  });

  it("only uses basic hiragana and correct romaji", () => {
    for (let seed = 1; seed < 40; seed++) {
      const r = run(base({}, seed));
      for (const q of r.round.questions) {
        expect(q.chars.every(isBasicHiragana)).toBe(true);
        expect(q.romaji).toBe(toRomaji(q.kana));
      }
    }
  });

  it("strips disallowed chars from settings", () => {
    expect(resolveEnabled(["が", "ぱ", "ゃ", "か", "か"])).toEqual(["か"]);
  });

  it("words mode gives only real words with meanings", () => {
    const r = run(base({ mode: "words" }));
    for (const q of r.round.questions) {
      expect(q.kind).toBe("word");
      expect(q.meaning).toBeTruthy();
    }
  });

  it("random mode respects length range", () => {
    const r = run(base({ mode: "random", lengthRange: "3-7", questionsPerRound: 20 }));
    for (const q of r.round.questions) {
      expect(q.chars.length).toBeGreaterThanOrEqual(3);
      expect(q.chars.length).toBeLessThanOrEqual(7);
      expect(q.kind).toBe("random");
    }
  });

  it("mixed mode keeps a balance", () => {
    const r = run(base({ mode: "mixed", questionsPerRound: 10 }));
    const words = r.round.questions.filter((q) => q.kind === "word").length;
    expect(words).toBeGreaterThanOrEqual(4);
    expect(words).toBeLessThanOrEqual(6);
  });

  it("respects selected characters in every mode", () => {
    const enabledChars = HIRAGANA_ROWS.filter((r) => ["vowel", "k", "s", "t"].includes(r.id)).flatMap((r) => r.chars);
    const allowed = new Set(enabledChars);
    for (const mode of ["mixed", "words", "random"] as const) {
      for (let seed = 1; seed < 15; seed++) {
        const r = generateRound(base({ mode, enabledChars }, seed));
        if (!r.ok) continue;
        for (const q of r.round.questions) expect(q.chars.every((k) => allowed.has(k))).toBe(true);
      }
    }
  });

  it("explains instead of cheating when too few words fit", () => {
    const r = generateRound(base({ mode: "words", enabledChars: ["ぬ", "へ"] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no-words");

    const small = ["ね", "こ", "い", "ぬ"];
    const fit = wordsForChars(small);
    const r2 = run(base({ mode: "words", enabledChars: small }));
    expect(r2.round.questions.length).toBe(fit.length);
    expect(r2.round.notice).toMatch(/Random Combos/);
    for (const q of r2.round.questions) expect(q.chars.every((k) => small.includes(k))).toBe(true);
  });

  it("always produces fresh questions and avoids repeats", () => {
    let gen: GeneratorState = EMPTY_GEN_STATE;
    const rng = mulberry32(7);
    const seenWords: string[] = [];
    let prevKey = "";
    for (let i = 0; i < 20; i++) {
      const r = run({ ...base({ mode: "words" }), gen, rng });
      const key = r.round.questions.map((q) => q.kana).join(",");
      expect(key).not.toBe(prevKey);
      prevKey = key;
      gen = r.gen;
      seenWords.push(...r.round.questions.map((q) => q.kana));
    }
    // 200 words drawn, should all be distinct before the pool cycles
    expect(new Set(seenWords.slice(0, 200)).size).toBe(200);
  });

  it("reshuffles when the pool runs out without immediate repeats", () => {
    const enabled = ["あ", "い", "う", "え", "お", "か", "き", "く", "け", "こ"];
    const poolSize = wordsForChars(enabled).length;
    let gen: GeneratorState = EMPTY_GEN_STATE;
    const rng = mulberry32(3);
    let last: string[] = [];
    for (let i = 0; i < 15; i++) {
      const r = run({ ...base({ mode: "words", questionsPerRound: 5, enabledChars: enabled }), gen, rng });
      const kanas = r.round.questions.map((q) => q.kana);
      expect(kanas.length).toBe(Math.min(5, poolSize));
      if (poolSize > 10) for (const k of kanas) expect(last).not.toContain(k);
      last = kanas;
      gen = r.gen;
    }
  });

  it("covers all 46 characters quickly in random mode", () => {
    let gen: GeneratorState = EMPTY_GEN_STATE;
    const rng = mulberry32(11);
    const seen = new Set<string>();
    for (let i = 0; i < 4; i++) {
      const r = run({ ...base({ mode: "random" }), gen, rng });
      gen = r.gen;
      r.round.questions.forEach((q) => q.chars.forEach((k) => seen.add(k)));
    }
    expect(seen.size).toBe(46);
    expect([...seen].every((k) => BASIC_KANA_LIST.includes(k))).toBe(true);
  });

  it("puts weak characters in more often", () => {
    const weak = { seen: 10, correct: 1, streak: 0, roundsCorrect: 1, recent: [false, false], lastSeen: 1 };
    const strong = { seen: 10, correct: 10, streak: 10, roundsCorrect: 5, recent: [true, true, true, true, true], lastSeen: 1 };
    const chars = Object.fromEntries(BASIC_KANA_LIST.map((k) => [k, k === "ぬ" ? weak : strong]));
    let gen: GeneratorState = EMPTY_GEN_STATE;
    const rng = mulberry32(5);
    let nu = 0;
    let a = 0;
    for (let i = 0; i < 30; i++) {
      const r = run({ ...base({ mode: "random" }), chars, gen, rng });
      gen = r.gen;
      for (const q of r.round.questions) for (const k of q.chars) {
        if (k === "ぬ") nu++;
        if (k === "あ") a++;
      }
    }
    expect(nu).toBeGreaterThan(a);
  });

  it("gives harder questions more time and respects pace", () => {
    const slow = run(base({ mode: "random", timerPace: "relaxed", lengthRange: "2-3" }, 2));
    const fast = run(base({ mode: "random", timerPace: "fast", lengthRange: "2-3" }, 2));
    slow.round.questions.forEach((q, i) => expect(q.timeLimitSec!).toBeGreaterThan(fast.round.questions[i].timeLimitSec!));
    const off = run(base({ timerPace: "off" }));
    expect(off.round.questions.every((q) => q.timeLimitSec === null)).toBe(true);

    const long = run(base({ mode: "random", lengthRange: "3-7", questionsPerRound: 20 }, 4)).round.questions;
    const byLen = [...long].sort((x, y) => x.chars.length - y.chars.length);
    expect(byLen[byLen.length - 1].timeLimitSec!).toBeGreaterThan(byLen[0].timeLimitSec!);
  });
});
