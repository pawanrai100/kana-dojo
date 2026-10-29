import { describe, expect, it } from "vitest";
import { isKnownKana } from "@/lib/kana/hiragana";
import { generateRound } from "@/lib/quiz/generate";
import { mulberry32 } from "@/lib/quiz/random";
import { EMPTY_GEN_STATE } from "@/lib/quiz/types";
import { DEFAULT_SETTINGS } from "@/lib/settings/types";
import { emptyProgress, type CharStat } from "@/lib/progress/types";
import { withBelt } from "@/lib/progress/belts";
import { BASIC_KANA_LIST } from "@/lib/kana/hiragana";
import { applyBattle, isUnlocked, sanitizeTower, currentFloor, clearedCount } from "./progress";
import { startBattle, applyAnswer } from "./battle";
import { EXTRA_KANA, FLOORS, SKY_FIRST, SKY_FLOORS, SKY_TOP, TOP_FLOOR, floorLabel, getFloor, nextFloor } from "./floors";
import { skyOpen } from "./gate";
import { ACHIEVEMENTS, earnedIds } from "./achievements";

const win = (id: number) => {
  let b = startBattle(getFloor(id)!);
  while (b.status === "fighting") b = applyAnswer(b, true);
  return b;
};

describe("sky shrine", () => {
  it("is a separate tower of 6 zones plus a sentence-reading yokai lord", () => {
    expect(FLOORS).toHaveLength(21); // the first tower didn't change
    expect(SKY_FIRST).toBe(101);
    expect(SKY_FLOORS.filter((f) => f.kind === "boss")).toHaveLength(6);
    expect(getFloor(SKY_TOP)!.kind).toBe("final");
    expect(getFloor(SKY_TOP)!.mode).toBe("sentences");
    expect(floorLabel(getFloor(102)!)).toBe("Sky floor 2");
    expect(nextFloor(getFloor(TOP_FLOOR)!)).toBeUndefined(); // the dragon doesn't lead into the sky
  });

  it("only bosses have names, regular floors fight plain monsters", async () => {
    const { ALL_FLOORS } = await import("./floors");
    const friendy = /saru|orochi|kitsune|tako|kozo|ryu|shikappa|alekoni|stellatsune|minjimata|ayutengu|pramirei|basarihyon/;
    for (const f of ALL_FLOORS) {
      if (f.kind === "floor") expect(friendy.test(f.enemy.id), `${f.id} ${f.enemy.name}`).toBe(false);
      else expect(f.enemy.name).toBe(f.boss!.name);
    }
  });

  it("teaches every dakuten, combo and small っ exactly once", () => {
    const taught = SKY_FLOORS.flatMap((f) => f.newChars);
    expect(taught.sort()).toEqual([...EXTRA_KANA].sort());
  });

  it("every sky floor can make questions from its own kana", () => {
    for (const f of SKY_FLOORS) {
      const r = generateRound({
        settings: { ...DEFAULT_SETTINGS, mode: f.mode, enabledChars: f.chars, lengthRange: f.lengthRange, timerPace: f.pace, questionsPerRound: 10 },
        chars: {},
        words: {},
        gen: EMPTY_GEN_STATE,
        rng: mulberry32(f.id),
      });
      expect(r.ok, `floor ${f.id}`).toBe(true);
      if (r.ok) for (const q of r.round.questions) expect(q.chars.every((k) => f.chars.includes(k) && isKnownKana(k)), `${f.id} ${q.kana}`).toBe(true);
    }
  });

  it("opens with the dragon or a blue belt, then climbs like the first tower", () => {
    let p = emptyProgress();
    expect(skyOpen(p)).toBe(false);
    expect(isUnlocked(p.tower, SKY_FIRST, skyOpen(p))).toBe(false);
    p = applyBattle(p, win(TOP_FLOOR)).progress;
    expect(skyOpen(p)).toBe(true);
    expect(isUnlocked(p.tower, SKY_FIRST, true)).toBe(true);
    expect(isUnlocked(p.tower, SKY_FIRST + 1, true)).toBe(false);
    p = applyBattle(p, win(SKY_FIRST)).progress;
    expect(isUnlocked(p.tower, SKY_FIRST + 1, true)).toBe(true);
    expect(currentFloor(p.tower, "sky")).toBe(102);
    expect(clearedCount(p.tower, "sky")).toBe(1);
    expect(sanitizeTower(JSON.parse(JSON.stringify(p.tower))).floors[SKY_FIRST].stars).toBe(3);

    const known: CharStat = { seen: 5, correct: 5, streak: 5, roundsCorrect: 3, recent: [true, true, true, true, true], lastSeen: 1 };
    const blue = withBelt({ ...emptyProgress(), chars: Object.fromEntries(BASIC_KANA_LIST.map((k) => [k, known])) });
    expect(skyOpen(blue)).toBe(true);
  });

  it("has badges for the new bosses, kana and quests", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    for (const id of ["sky-open", "boss-shikappa", "boss-basarihyon", "marks", "combos", "small-tsu", "particle-pro", "quest-day", "black-belt"]) expect(ids).toContain(id);
    expect(ACHIEVEMENTS.find((a) => a.id === "boss-shikappa")!.how).toMatch(/sky floor/);
    const p = applyBattle(applyBattle(emptyProgress(), win(TOP_FLOOR)).progress, win(SKY_FIRST + 3)).progress;
    expect(earnedIds(p).has("sky-open")).toBe(true);
    expect(earnedIds(p).has("boss-shikappa")).toBe(true);
  });
});
