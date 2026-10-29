import { describe, expect, it } from "vitest";
import { KANA_GROUPS, getRow } from "@/lib/kana/hiragana";
import { mergeDiverged } from "@/lib/sync/merge";
import { BELTS, beltStatus, qualifiedBelt, withBelt } from "./belts";
import { sanitizeProgress } from "./sanitize";
import { emptyProgress, type CharStat, type Progress } from "./types";

const known: CharStat = { seen: 5, correct: 5, streak: 5, roundsCorrect: 3, recent: [true, true, true, true, true], lastSeen: 1 };
const slipped: CharStat = { ...known, recent: [true, true, false, false, false], streak: 0 };

function withMastered(kana: string[], p = emptyProgress()): Progress {
  return { ...p, chars: { ...p.chars, ...Object.fromEntries(kana.map((k) => [k, known])) } };
}

const basic = KANA_GROUPS[0].chars;

describe("belts", () => {
  it("starts everyone on white", () => {
    expect(beltStatus(emptyProgress()).belt.id).toBe("white");
    expect(beltStatus(emptyProgress()).nextStep).toMatchObject({ have: 0, need: 10 });
  });

  it("goes up by what you've mastered, in order", () => {
    const starter = [...getRow("vowel")!.chars, ...getRow("k")!.chars];
    expect(BELTS[qualifiedBelt(withMastered(starter))].id).toBe("yellow");
    expect(BELTS[qualifiedBelt(withMastered(basic.slice(10, 30)))].id).toBe("white"); // 20 kana but not the vowels+K, so no yellow yet
    expect(BELTS[qualifiedBelt(withMastered([...starter, ...basic.slice(10, 25)]))].id).toBe("orange");
    expect(BELTS[qualifiedBelt(withMastered(basic))].id).toBe("blue");
    expect(BELTS[qualifiedBelt(withMastered([...basic, ...KANA_GROUPS[1].chars]))].id).toBe("purple");
  });

  it("never takes a belt away, it shows a review stripe instead", () => {
    let p = withBelt(withMastered(basic));
    expect(p.belt).toBe(BELTS.findIndex((b) => b.id === "blue"));
    p = { ...p, chars: { ...p.chars, あ: slipped, い: slipped } };
    const s = beltStatus(p);
    expect(s.belt.id).toBe("blue");
    expect(s.needsReview).toBe(true);
  });

  it("is saved and synced as the higher of the two", () => {
    const p = withBelt(withMastered(basic));
    expect(sanitizeProgress(JSON.parse(JSON.stringify(p))).belt).toBe(p.belt);
    expect(sanitizeProgress({ belt: -4 }).belt).toBe(0);
    expect(mergeDiverged(emptyProgress(), p).belt).toBe(p.belt);
  });
});
