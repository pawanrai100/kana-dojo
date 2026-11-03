import { describe, expect, it } from "vitest";
import { ALL_KANA_LIST, splitKana, toRomaji } from "@/lib/kana/hiragana";
import type { Question } from "@/lib/quiz/types";
import { debrief } from "./debrief";
import { trickFor, twinDiff } from "./tricks";

const q = (kana: string, extra: Partial<Question> = {}): Question => ({
  id: kana,
  kind: "random",
  kana,
  romaji: toRomaji(kana),
  chars: splitKana(kana),
  difficulty: "medium",
  timeLimitSec: 10,
  ...extra,
});
const a = (kana: string, value: string, timedOut = false) => ({ q: q(kana), value, timedOut });

describe("memory tricks", () => {
  it("has a trick for every kana", () => {
    for (const k of ALL_KANA_LIST) expect(trickFor(k).length, k).toBeGreaterThan(10);
  });

  it("explains marks from the plain kana", () => {
    expect(trickFor("が")).toContain("か");
    expect(trickFor("ぱ")).toContain("は");
    expect(trickFor("きゃ")).toContain("kya");
  });

  it("knows how to split the twins", () => {
    expect(twinDiff("ぬ", "め")).toContain("loop");
    expect(twinDiff("ば", "ぱ")).toContain("circle");
    expect(twinDiff("か", "め")).toBeUndefined();
  });
});

describe("loss debrief", () => {
  it("spots lookalike mixups and pairs the twin", () => {
    const d = debrief([a("ぬの", "meno"), a("ねこ", "reko"), a("あい", "ai")]);
    expect(d.cause).toBe("twins");
    expect(d.tricks.map((t) => t.kana)).toEqual(expect.arrayContaining(["ぬ", "ね"]));
    const nu = d.tricks.find((t) => t.kana === "ぬ")!;
    expect(nu.readAs?.kana).toBe("め");
    expect(nu.twin?.kana).toBe("め");
    expect(d.drill).toEqual(expect.arrayContaining(["ぬ", "め", "ね", "れ"]));
  });

  it("blames the clock when most misses were timeouts", () => {
    const d = debrief([a("さかな", "", true), a("うみ", "", true), a("やま", "yame")], 10);
    expect(d.cause).toBe("clock");
    expect(d.timeouts).toBe(2);
    expect(d.tricks.filter((t) => t.readAs).map((t) => t.kana)).toEqual(["ま"]);
  });

  it("calls out marks and combos", () => {
    expect(debrief([a("がっこう", "kakkou"), a("ごご", "koko"), a("ぶた", "futa")]).cause).toBe("marks");
    expect(debrief([a("きゃく", "kiyaku"), a("しゅみ", "shiyumi"), a("ちょっと", "chiyotto")]).cause).toBe("combos");
  });

  it("caps tricks and handles a clean run", () => {
    const d = debrief([a("あいうえお", "xxxxx"), a("かきくけこ", "xxxxx")]);
    expect(d.tricks.length).toBe(4);
    expect(debrief([a("あい", "ai")]).cause).toBe("clean");
    expect(debrief([a("きって", "kite")]).drill).toEqual(expect.arrayContaining(["っ", "か"]));
  });
});
