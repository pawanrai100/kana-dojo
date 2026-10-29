import { describe, expect, it } from "vitest";
import { ALL_KANA_LIST, BASIC_KANA_LIST, HIRAGANA_ROWS, KANA_GROUPS, isBasicHiragana, isKnownKana, splitKana, toRomaji } from "./hiragana";
import { HIRAGANA_VOCAB } from "@/lib/vocab/hiragana-words";

const EXCLUDED = "がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽゃゅょっぁぃぅぇぉゎゔー".split("");

describe("hiragana data", () => {
  it("has exactly the 46 basic characters", () => {
    expect(BASIC_KANA_LIST).toHaveLength(46);
    expect(new Set(BASIC_KANA_LIST).size).toBe(46);
    expect(HIRAGANA_ROWS.flatMap((r) => r.chars)).toHaveLength(46);
  });

  it("excludes dakuten, handakuten and small kana", () => {
    for (const k of EXCLUDED) expect(isBasicHiragana(k)).toBe(false);
  });

  it("has every extra in exactly one group: 25 dakuten, 33 combos, small っ", () => {
    const by = Object.fromEntries(KANA_GROUPS.map((g) => [g.id, g.chars.length]));
    expect(by).toEqual({ basic: 46, dakuten: 25, combos: 33, sokuon: 1 });
    expect(new Set(ALL_KANA_LIST).size).toBe(105);
  });

  it("reads combos as one sound and doubles after small っ", () => {
    expect(splitKana("きゃく")).toEqual(["きゃ", "く"]);
    expect(splitKana("きって")).toEqual(["き", "っ", "て"]);
    expect(toRomaji("でんしゃ")).toBe("densha");
    expect(toRomaji("きって")).toBe("kitte");
    expect(toRomaji("まっちゃ")).toBe("matcha");
    expect(toRomaji("しゅっぱつ")).toBe("shuppatsu");
    expect(toRomaji("ぎゅうにゅう")).toBe("gyuunyuu");
    expect(toRomaji("きんよう")).toBe("kin'you");
  });

  it("derives romaji from the table", () => {
    expect(toRomaji("ねこ")).toBe("neko");
    expect(toRomaji("くるま")).toBe("kuruma");
    expect(toRomaji("ぬれま")).toBe("nurema");
    expect(toRomaji("しちつふ")).toBe("shichitsufu");
    expect(toRomaji("きんえん")).toBe("kin'en");
    expect(toRomaji("ほんや")).toBe("hon'ya");
    expect(toRomaji("みかん")).toBe("mikan");
  });
});

describe("vocab", () => {
  it("is substantial and only uses kana we teach", () => {
    expect(HIRAGANA_VOCAB.length).toBeGreaterThan(250);
    for (const w of HIRAGANA_VOCAB) {
      for (const k of splitKana(w.kana)) expect(isKnownKana(k), `${w.kana}`).toBe(true);
      expect(splitKana(w.kana).length).toBeGreaterThanOrEqual(2);
      expect(w.meaning.length).toBeGreaterThan(0);
    }
  });

  it("has unique ids and merges homographs", () => {
    expect(new Set(HIRAGANA_VOCAB.map((w) => w.id)).size).toBe(HIRAGANA_VOCAB.length);
    expect(HIRAGANA_VOCAB.find((w) => w.kana === "はし")!.meaning).toMatch(/bridge/);
    expect(HIRAGANA_VOCAB.find((w) => w.kana === "はし")!.meaning).toMatch(/chopsticks/);
  });
});
