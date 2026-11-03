import { describe, expect, it } from "vitest";
import { ALL_KANA_LIST } from "@/lib/kana/hiragana";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings/types";
import { generateRound } from "./generate";
import { checkQuestion } from "./validate";
import { EMPTY_GEN_STATE } from "./types";
import { mulberry32 } from "./random";

describe("existing practice configuration regression matrix", () => {
  for (const script of ["hiragana", "katakana", "both"] as const)
    for (const mode of ["mixed", "words", "random", "sentences"] as const)
      for (const timerPace of ["off", "relaxed", "normal", "fast"] as const)
        for (const questionsPerRound of [5, 10, 15, 20] as const) {
          it(`${script} / ${mode} / ${timerPace} / ${questionsPerRound}`, () => {
            const settings: Settings = { ...DEFAULT_SETTINGS, enabledChars: ALL_KANA_LIST, script, mode, timerPace, questionsPerRound };
            const generated = generateRound({ settings, chars: {}, words: {}, gen: EMPTY_GEN_STATE, rng: mulberry32(42) });
            expect(generated.ok).toBe(true);
            if (!generated.ok) return;
            expect(generated.round.questions.length).toBeGreaterThan(0);
            expect(generated.round.questions.length).toBeLessThanOrEqual(questionsPerRound);
            for (const question of generated.round.questions) {
              expect(checkQuestion(question, question.romaji).correct, question.kana).toBe(true);
              if (timerPace === "off") expect(question.timeLimitSec).toBeNull();
              else expect(question.timeLimitSec).toBeGreaterThan(0);
            }
          });
        }
});
