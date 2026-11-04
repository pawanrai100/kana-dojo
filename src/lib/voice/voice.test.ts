import { describe, expect, it } from "vitest";
import { heardWord, normJa } from "./match";
import { SCENES, fill, matchReply } from "./scenes";
import { voiceScore } from "./speech";

const turn = (scene: string, i: number) => SCENES.find((s) => s.id === scene)!.turns[i];

describe("voice: hearing words", () => {
  it("flattens katakana, spaces and punctuation", () => {
    expect(normJa("コーヒー、 ください！")).toBe("こーひーください");
  });
  it("accepts kana, kanji and katakana versions of a word", () => {
    expect(heardWord(["猫"], "ねこ")).toBe(true);
    expect(heardWord(["ねこ"], "ねこ")).toBe(true);
    expect(heardWord(["ネコ"], "ねこ")).toBe(true);
    expect(heardWord(["犬", "ねこです"], "ねこ")).toBe(true);
    expect(heardWord(["コーヒー"], "コーヒー")).toBe(true);
    expect(heardWord(["犬"], "ねこ")).toBe(false);
    expect(heardWord(["ねこじゃらしをかいました"], "ねこ")).toBe(false);
    expect(heardWord([], "ねこ")).toBe(false);
  });
});

describe("voice: picking a voice", () => {
  const v = (name: string, lang = "ja-JP") => ({ name, lang, localService: true });
  it("prefers natural female japanese voices", () => {
    const ranked = [v("Microsoft Keita Online (Natural)"), v("Kyoko"), v("Microsoft Nanami Online (Natural) - Japanese (Japan)"), v("Google 日本語"), v("Samantha", "en-US")]
      .filter((x) => voiceScore(x) >= 0)
      .sort((a, b) => voiceScore(b) - voiceScore(a))
      .map((x) => x.name);
    expect(ranked[0]).toContain("Nanami");
    expect(ranked.at(-1)).toContain("Keita");
    expect(ranked).not.toContain("Samantha");
  });
});

describe("voice: conversations", () => {
  it("catches your name in whatever script you said it", () => {
    const m = matchReply(turn("meet", 0), ["パワンです"])!;
    expect(m.x).toBe("パワン");
    expect(fill(m.reply.then, { x: m.x })).toBe("パワンさん！ よろしく ね！");
    expect(matchReply(turn("meet", 0), ["私は田中です"])!.x).toBe("田中");
  });
  it("tells yes from no", () => {
    expect(matchReply(turn("meet", 1), ["はい学生です"])!.reply.en).toContain("studies");
    expect(matchReply(turn("meet", 1), ["いいえ違います"])!.reply.en).toContain("work");
  });
  it("repeats back what you like and what you order", () => {
    expect(matchReply(turn("meet", 2), ["アニメが好きです"])!.x).toBe("アニメ");
    expect(matchReply(turn("cafe", 0), ["コーヒーをください"])!.x).toBe("コーヒー");
    expect(matchReply(turn("cafe", 0), ["お茶お願いします"])!.x).toBe("お茶");
    expect(matchReply(turn("weekend", 2), ["ごめんちょっと"])!.reply.en).toContain("Next time");
    expect(matchReply(turn("weekend", 2), ["いいね行こう"])!.reply.en).toContain("Saturday");
  });
  it("misses when the answer doesn't fit", () => {
    expect(matchReply(turn("cafe", 0), ["ねこ"])).toBeUndefined();
    expect(matchReply(turn("shop", 3), ["こんにちは"])).toBeUndefined();
  });
  it("every tap answer is understood by its own turn", () => {
    for (const s of SCENES)
      s.turns.forEach((t, i) => {
        for (const o of t.options) expect(matchReply(t, [o.replace("{me}", "パワン")]), `${s.id} ${i}: ${o}`).toBeTruthy();
        expect(matchReply(t, [t.hint.ja.replace("（なまえ）", "パワン")]), `${s.id} ${i} hint`).toBeTruthy();
      });
  });
});
