import { describe, expect, it } from "vitest";
import { BASIC_KANA_LIST, isKnownKana, splitKana, usesOnly } from "@/lib/kana/hiragana";
import { DEFAULT_SETTINGS } from "@/lib/settings/types";
import { generateRound } from "@/lib/quiz/generate";
import { gradeRound } from "@/lib/quiz/grade";
import { mulberry32 } from "@/lib/quiz/random";
import { sanitizeActiveRound } from "@/lib/quiz/session";
import { checkQuestion } from "@/lib/quiz/validate";
import { EMPTY_GEN_STATE } from "@/lib/quiz/types";
import { applyGradedRound } from "@/lib/progress/update";
import { emptyProgress } from "@/lib/progress/types";
import { SENTENCES } from "./sentences";

const find = (kana: string) => SENTENCES.find((s) => s.kana === kana)!;

describe("sentences", () => {
  it("are all made of kana we teach, with a meaning", () => {
    expect(SENTENCES.length).toBeGreaterThan(80);
    for (const s of SENTENCES) {
      expect(splitKana(s.kana).every(isKnownKana), s.kana).toBe(true);
      expect(s.meaning.length).toBeGreaterThan(3);
    }
    expect(SENTENCES.filter((s) => usesOnly(s.kana, new Set(BASIC_KANA_LIST))).length).toBeGreaterThanOrEqual(15);
  });

  it("reads particles the way Japanese does", () => {
    const s = find("わたしはがくせいです");
    expect(s.romaji).toBe("watashi wa gakusei desu");
    expect(checkQuestion(s, "watashi wa gakusei desu").correct).toBe(true);
    expect(checkQuestion(s, "watashiwagakuseidesu").correct).toBe(true);
    const wrong = checkQuestion(s, "watashi ha gakusei desu");
    expect(wrong.correct).toBe(false);
    expect(wrong.missedIdx).toEqual([3]); // just the particle
    expect(checkQuestion(find("すしをたべる"), "sushi o taberu").correct).toBe(true);
    expect(checkQuestion(find("すしをたべる"), "sushi wo taberu").correct).toBe(true);
    expect(checkQuestion(find("うちへかえる"), "uchi e kaeru").correct).toBe(true);
  });

  it("makes sentence rounds from only the kana you have on", () => {
    const r = generateRound({
      settings: { ...DEFAULT_SETTINGS, mode: "sentences" },
      chars: {},
      words: {},
      gen: EMPTY_GEN_STATE,
      rng: mulberry32(4),
    });
    if (!r.ok) throw new Error(r.message);
    expect(r.round.questions.length).toBeGreaterThan(5);
    for (const q of r.round.questions) {
      expect(q.kind).toBe("sentence");
      expect(q.chars.every((k) => BASIC_KANA_LIST.includes(k))).toBe(true);
    }
    const none = generateRound({ settings: { ...DEFAULT_SETTINGS, mode: "sentences", enabledChars: ["あ"] }, chars: {}, words: {}, gen: EMPTY_GEN_STATE });
    expect(none.ok).toBe(false);
  });

  it("survives a refresh and treats a particle slip as grammar, not a kana miss", () => {
    const r = generateRound({ settings: { ...DEFAULT_SETTINGS, mode: "sentences", questionsPerRound: 5 }, chars: {}, words: {}, gen: EMPTY_GEN_STATE, rng: mulberry32(2) });
    if (!r.ok) throw new Error(r.message);
    const back = sanitizeActiveRound(JSON.parse(JSON.stringify({ round: r.round, answers: [], activeIndex: 0, startedAt: 1 })));
    expect(back!.round.questions[0].tokens).toEqual(r.round.questions[0].tokens);
    expect(back!.round.questions[0].romaji).toBe(r.round.questions[0].romaji);

    const s = find("わたしはがくせいです");
    const q = { id: "x", kind: "sentence" as const, kana: s.kana, romaji: s.romaji, chars: splitKana(s.kana), tokens: s.tokens, meaning: s.meaning, difficulty: "medium" as const, timeLimitSec: 20 };
    const g = gradeRound({ id: "r", createdAt: 1, mode: "sentences", questions: [q] }, [{ value: "watashi ha gakusei desu", locked: true, timedOut: false, timeUsedMs: 9000 }], { durationMs: 9000 });
    const p = applyGradedRound(emptyProgress(), g, EMPTY_GEN_STATE, 1);
    expect(p.chars["は"]).toBeUndefined(); // the particle は doesn't count against the kana は
    expect(p.skills.particles.missed).toBe(1);
    expect(p.chars["が"].correct).toBe(1);
  });
});
