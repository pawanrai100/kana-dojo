import { describe, expect, it } from "vitest";
import { checkAnswer } from "@/lib/quiz/validate";
import { coachContext, focusChars } from "@/lib/quiz/adaptive";
import { gradeRound } from "@/lib/quiz/grade";
import { applyGradedRound } from "@/lib/progress/update";
import { emptyProgress } from "@/lib/progress/types";
import { sanitizeProgress } from "@/lib/progress/sanitize";
import { mergeDiverged, mergeGuestInto } from "@/lib/sync/merge";
import { splitKana, toRomaji } from "@/lib/kana/hiragana";
import type { Question, Round } from "@/lib/quiz/types";
import { analyzeAnswer } from "./analyze";

const NOW = 1_700_000_000_000;

function analyze(kana: string, typed: string) {
  const c = checkAnswer(kana, typed);
  return analyzeAnswer(splitKana(kana), c.typed, c.missedIdx);
}

function q(kana: string, extra: Partial<Question> = {}): Question {
  return { id: kana, kind: "random", kana, romaji: toRomaji(kana), chars: splitKana(kana), difficulty: "medium", timeLimitSec: 10, ...extra };
}

function play(p: ReturnType<typeof emptyProgress>, items: [Question, string, number?][], at = NOW) {
  const round: Round = { id: `r${at}`, createdAt: at, mode: "random", questions: items.map(([x]) => x) };
  const g = gradeRound(
    round,
    items.map(([, v, ms]) => ({ value: v, locked: true, timedOut: false, timeUsedMs: ms ?? 2000 })),
    { durationMs: 1000 },
  );
  return applyGradedRound(p, g, p.gen, at);
}

describe("what kind of mistake was it", () => {
  it("spots which kana you read it as", () => {
    expect(analyze("ねこ", "reko").confusions).toEqual([["ね", "れ"]]);
    expect(analyze("ぬま", "mema").confusions).toEqual([["ぬ", "め"]]);
  });

  it("names the habit behind the slip", () => {
    expect(analyze("がっこう", "kakkou").skills.marks).toEqual({ seen: 1, missed: 1 });
    expect(analyze("きって", "kite").skills["small-tsu"]).toEqual({ seen: 1, missed: 1 });
    expect(analyze("きゃく", "kiyaku").skills.combos).toEqual({ seen: 1, missed: 1 });
    expect(analyze("おおきい", "okii").skills["long-vowels"]?.missed).toBeGreaterThan(0);
    expect(analyze("ねこ", "reko").skills.lookalikes).toEqual({ seen: 2, missed: 1 }); // こ is a lookalike too
    // a lookalike read as something unrelated isn't a lookalike slip
    expect(analyze("ねこ", "zzko").skills.lookalikes).toEqual({ seen: 2, missed: 0 });
  });
});

describe("the coach learns from rounds", () => {
  it("remembers confusions and fades them as you get the kana right", () => {
    let p = play(emptyProgress(), [[q("ねこ"), "reko"], [q("ねる"), "reru"]]);
    expect(p.confusions["ね"]["れ"]).toBe(2);
    expect(p.skills.lookalikes.missed).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < 6; i++) p = play(p, [[q("ねこ"), "neko"]], NOW + i + 1);
    expect(p.confusions["ね"]).toBeUndefined(); // faded out once you kept getting it right
  });

  it("brings the twin along when you're mixing two kana up", () => {
    let p = emptyProgress();
    for (let i = 0; i < 3; i++) p = play(p, [[q("ねこ"), "reko"], [q("れい"), "rei"]], NOW + i);
    const ctx = coachContext(p);
    const focus = focusChars(["ね", "れ", "こ", "い"], p.chars, 8, NOW, ctx);
    expect(focus.slice(0, 2)).toEqual(["ね", "れ"]);
  });

  it("flags kana you get right but slowly", () => {
    let p = emptyProgress();
    const fast = ["あい", "うえ", "かき", "くけ", "さし", "すせ"];
    for (let i = 0; i < 5; i++) {
      p = play(p, [...fast.map((k): [Question, string, number] => [q(k), toRomaji(k), 1200]), [q("ぬぬ"), "nunu", 6000]], NOW + i);
    }
    expect(coachContext(p).slow.has("ぬ")).toBe(true);
    expect(coachContext(p).slow.has("あ")).toBe(false);
  });

  it("marks a habit weak after repeated slips", () => {
    let p = emptyProgress();
    for (let i = 0; i < 4; i++) p = play(p, [[q("きって"), "kite"], [q("ざっし"), "zashi"]], NOW + i);
    expect(coachContext(p).weakSkills.has("small-tsu")).toBe(true);
  });

  it("keeps the coach data safe through storage and syncing", () => {
    const p = play(emptyProgress(), [[q("ねこ"), "reko"], [q("きって"), "kite"]]);
    const back = sanitizeProgress(JSON.parse(JSON.stringify(p)));
    expect(back.confusions).toEqual(p.confusions);
    expect(back.skills).toEqual(p.skills);
    expect(sanitizeProgress({ confusions: { ね: { れ: "x", カ: 2 } }, skills: { bogus: {} } }).confusions).toEqual({});
    expect(mergeDiverged(p, emptyProgress()).confusions["ね"]["れ"]).toBe(1);
    expect(mergeGuestInto(p, p).confusions["ね"]["れ"]).toBe(2);
  });
});

describe("trouble spots report", () => {
  it("ranks a mixed-up pair and a weak habit, and drills those kana", async () => {
    const { coachReport } = await import("./report");
    let p = emptyProgress();
    for (let i = 0; i < 4; i++) p = play(p, [[q("ねこ"), "reko"], [q("きって"), "kite"], [q("ざっし"), "zashi"], [q("あい"), "ai"]], NOW + i);
    const r = coachReport(p, NOW + 10);
    const ids = r.spots.map((s) => s.id);
    expect(ids).toContain("pair-ねれ");
    expect(ids).toContain("habit-small-tsu");
    expect(r.drill).toEqual(expect.arrayContaining(["ね", "れ"]));
    expect(r.habits.find((h) => h.id === "small-tsu")!.accuracy).toBe(0);
  });

  it("stays quiet for a brand new player", async () => {
    const { coachReport } = await import("./report");
    expect(coachReport(emptyProgress()).spots).toEqual([]);
  });
});
