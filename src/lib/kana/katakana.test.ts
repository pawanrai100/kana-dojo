import { describe, expect, it } from "vitest";
import { generateRound } from "@/lib/quiz/generate";
import { mulberry32 } from "@/lib/quiz/random";
import { EMPTY_GEN_STATE } from "@/lib/quiz/types";
import { checkAnswer } from "@/lib/quiz/validate";
import { DEFAULT_SETTINGS } from "@/lib/settings/types";
import { KATAKANA_GROUPS, LONG_MARK, getKana, groupOf, scriptOf, splitKana, toHiragana, toKatakana, toRomaji } from "./hiragana";

const units = KATAKANA_GROUPS.flatMap((g) => g.chars);

describe("katakana", () => {
  it("mirrors hiragana readings", () => {
    expect(toKatakana("きゃっと")).toBe("キャット");
    expect(toHiragana("キャット")).toBe("きゃっと");
    for (const k of KATAKANA_GROUPS.find((g) => g.id === "k-basic")!.chars) expect(getKana(k)!.romaji).toEqual(getKana(toHiragana(k))!.romaji);
  });

  it("every unit reads back and checks", () => {
    for (const k of units) {
      if (k === "ッ" || k === LONG_MARK) continue;
      const word = `${k}カ`;
      expect(splitKana(word)).toEqual([k, "カ"]);
      expect(checkAnswer(word, toRomaji(word)).correct, word).toBe(true);
    }
  });

  it("handles real loanwords", () => {
    const words: [string, string][] = [
      ["コーヒー", "koohii"],
      ["パーティー", "paatii"],
      ["サッカー", "sakkaa"],
      ["ファン", "fan"],
      ["チェック", "chekku"],
      ["ウォッチ", "wotchi"],
      ["ヴァイオリン", "vaiorin"],
      ["ジャンプ", "janpu"],
    ];
    for (const [k, r] of words) {
      expect(toRomaji(k), k).toBe(r);
      expect(checkAnswer(k, r).correct, k).toBe(true);
    }
    expect(checkAnswer("コーヒー", "ko-hi-").correct).toBe(true);
    expect(checkAnswer("コーヒー", "kohi").correct).toBe(false);
  });

  it("katakana groups line up with hiragana kinds", () => {
    expect(groupOf("ガ")?.kind).toBe("dakuten");
    expect(groupOf("キャ")?.kind).toBe("combos");
    expect(groupOf("ファ")?.kind).toBe("extended");
    expect(scriptOf("ア")).toBe("katakana");
    expect(scriptOf("あ")).toBe("hiragana");
  });
});

describe("script switch", () => {
  const all = [...DEFAULT_SETTINGS.enabledChars, "ッ", "ガ", "ギ", "っ", "が"];
  const round = (script: "hiragana" | "katakana" | "both", seed: number, mode: "random" | "mixed" = "random") =>
    generateRound({ settings: { ...DEFAULT_SETTINGS, enabledChars: all, script, mode }, chars: {}, words: {}, gen: EMPTY_GEN_STATE, rng: mulberry32(seed), now: 1 });

  it("katakana mode only shows katakana", () => {
    for (let s = 0; s < 20; s++) {
      const r = round("katakana", s, "mixed");
      if (!r.ok) throw new Error(r.message);
      for (const q of r.round.questions) expect(q.chars.every((k) => scriptOf(k) === "katakana"), q.kana).toBe(true);
    }
  });

  it("both mode mixes cards but never scripts inside one card", () => {
    const seen = new Set<string>();
    for (let s = 0; s < 30; s++) {
      const r = round("both", s);
      if (!r.ok) throw new Error(r.message);
      for (const q of r.round.questions) {
        const sc = new Set(q.chars.map(scriptOf));
        expect(sc.size, q.kana).toBe(1);
        seen.add([...sc][0]!);
        expect(q.chars[0] !== LONG_MARK && q.chars[0] !== "ッ", q.kana).toBe(true);
        expect(checkAnswer(q.kana, q.romaji).correct, q.kana).toBe(true);
      }
    }
    expect(seen).toEqual(new Set(["hiragana", "katakana"]));
  });
});

describe("both mode balance", () => {
  it("splits cards roughly evenly even when one script has way more kana on", () => {
    const chars = ["あ", "い", "う", "か", "き", ...KATAKANA_GROUPS[0].chars];
    let kata = 0;
    let total = 0;
    for (let s = 0; s < 40; s++) {
      const r = generateRound({ settings: { ...DEFAULT_SETTINGS, enabledChars: chars, script: "both", mode: "random" }, chars: {}, words: {}, gen: EMPTY_GEN_STATE, rng: mulberry32(s), now: 1 });
      if (!r.ok) throw new Error(r.message);
      for (const q of r.round.questions) {
        total++;
        if (scriptOf(q.chars[0]) === "katakana") kata++;
      }
    }
    expect(kata / total).toBeGreaterThan(0.35);
    expect(kata / total).toBeLessThan(0.65);
  });
});
