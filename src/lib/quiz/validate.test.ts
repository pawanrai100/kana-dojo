import { describe, expect, it } from "vitest";
import { checkAnswer, normalizeAnswer } from "./validate";

describe("normalizeAnswer", () => {
  it("handles case, whitespace and dashes", () => {
    expect(normalizeAnswer("  NeKo ")).toBe("neko");
    expect(normalizeAnswer("ku ru-ma")).toBe("kuruma");
    expect(normalizeAnswer("kin’en")).toBe("kin'en");
  });
});

describe("checkAnswer", () => {
  it("accepts canonical answers", () => {
    expect(checkAnswer("ねこ", "neko").correct).toBe(true);
    expect(checkAnswer("くるま", " KURUMA ").correct).toBe(true);
  });

  it("accepts standard variants", () => {
    expect(checkAnswer("すし", "susi").correct).toBe(true);
    expect(checkAnswer("ちち", "titi").correct).toBe(true);
    expect(checkAnswer("つき", "tuki").correct).toBe(true);
    expect(checkAnswer("ふね", "hune").correct).toBe(true);
    expect(checkAnswer("をか", "oka").correct).toBe(true);
    expect(checkAnswer("をか", "woka").correct).toBe(true);
  });

  it("handles ん spellings", () => {
    expect(checkAnswer("ほんや", "honya").correct).toBe(true);
    expect(checkAnswer("ほんや", "hon'ya").correct).toBe(true);
    expect(checkAnswer("ほんや", "honnya").correct).toBe(true);
    expect(checkAnswer("みかん", "mikan").correct).toBe(true);
    expect(checkAnswer("みかん", "mikann").correct).toBe(true);
  });

  it("rejects wrong or empty answers", () => {
    expect(checkAnswer("ねこ", "neka").correct).toBe(false);
    expect(checkAnswer("ねこ", "").correct).toBe(false);
    expect(checkAnswer("ねこ", "nekoo").correct).toBe(false);
    expect(checkAnswer("しま", "sma").correct).toBe(false);
  });

  it("pins down which kana were misread", () => {
    expect(checkAnswer("ぬれま", "numema").missedIdx).toEqual([1]);
    expect(checkAnswer("ねこ", "neka").missedIdx).toEqual([1]);
    expect(checkAnswer("さかな", "chikana").missedIdx).toEqual([0]);
    expect(checkAnswer("ねこ", "").missedIdx).toEqual([0, 1]);
    expect(checkAnswer("ねこ", "neko").missedIdx).toEqual([]);
  });
});

describe("dakuten, combos and small っ", () => {
  it("accepts both common spellings", () => {
    for (const [kana, typed] of [
      ["じてんしゃ", "jitensha"],
      ["じてんしゃ", "zitensya"],
      ["ちゃいろ", "chairo"],
      ["ちゃいろ", "tyairo"],
      ["まっちゃ", "matcha"],
      ["まっちゃ", "maccha"],
      ["ちょっと", "chotto"],
      ["がっこう", "gakkou"],
      ["はっぴゃく", "happyaku"],
      ["ざっし", "zasshi"],
      ["ざっし", "zassi"],
      ["つづく", "tsuzuku"],
      ["つづく", "tsuduku"],
    ]) {
      expect(checkAnswer(kana, typed).correct, `${kana} ${typed}`).toBe(true);
    }
  });

  it("points at the small っ when you skip the double", () => {
    expect(checkAnswer("きって", "kite")).toMatchObject({ correct: false, missedIdx: [1] });
  });

  it("points at the combo when you read it as two kana", () => {
    const r = checkAnswer("きゃく", "kiyaku");
    expect(r.correct).toBe(false);
    expect(r.missedIdx).toContain(0);
  });
});
