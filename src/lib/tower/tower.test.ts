import { describe, expect, it } from "vitest";
import { BASIC_KANA_LIST, isBasicHiragana } from "@/lib/kana/hiragana";
import { generateRound } from "@/lib/quiz/generate";
import { mulberry32 } from "@/lib/quiz/random";
import { EMPTY_GEN_STATE } from "@/lib/quiz/types";
import { DEFAULT_SETTINGS } from "@/lib/settings/types";
import { emptyProgress } from "@/lib/progress/types";
import { sanitizeProgress } from "@/lib/progress/sanitize";
import { mergeDiverged, mergeGuestInto } from "@/lib/sync/merge";
import { applyAnswer, battleStars, startBattle } from "./battle";
import { FLOORS, TOP_FLOOR, getFloor } from "./floors";
import { applyBattle, currentFloor, isUnlocked, mergeTower, sanitizeTower, totalStars } from "./progress";
import { ACHIEVEMENTS, currentTitle, newlyEarned } from "./achievements";

function win(floorId: number, misses = 0) {
  const f = getFloor(floorId)!;
  let b = startBattle(f);
  for (let i = 0; i < misses; i++) b = applyAnswer(b, false);
  while (b.status === "fighting") b = applyAnswer(b, true);
  return b;
}

describe("tower floors", () => {
  it("has 5 zones of 4 floors plus the dragon", () => {
    expect(FLOORS).toHaveLength(21);
    expect(TOP_FLOOR).toBe(21);
    expect(FLOORS.filter((f) => f.kind === "boss")).toHaveLength(5);
    expect(FLOORS[20].kind).toBe("final");
    FLOORS.forEach((f, i) => expect(f.id).toBe(i + 1));
  });

  it("teaches every one of the 46 kana, each exactly once", () => {
    const taught = FLOORS.flatMap((f) => f.newChars);
    expect(taught.sort()).toEqual([...BASIC_KANA_LIST].sort());
  });

  it("bosses test everything learned so far, the dragon tests all 46", () => {
    const boss2 = FLOORS.find((f) => f.boss?.id === "tanuki")!;
    expect(boss2.chars).toEqual(expect.arrayContaining(["あ", "か", "さ", "た"]));
    expect(boss2.chars).not.toContain("な");
    expect(new Set(FLOORS[20].chars).size).toBe(46);
  });

  it("gets harder the higher you climb", () => {
    const maxLen = (f: (typeof FLOORS)[number]) => Number(f.lengthRange.split("-")[1]);
    const PACE = { relaxed: 0, normal: 1, fast: 2 };
    // same slot in each zone (1st drill, 2nd drill, mix, boss) never gets easier
    for (let slot = 0; slot < 4; slot++) {
      const fs = [1, 2, 3, 4, 5].map((z) => FLOORS.filter((f) => f.zone === z)[slot]);
      for (let i = 1; i < fs.length; i++) {
        expect(maxLen(fs[i])).toBeGreaterThanOrEqual(maxLen(fs[i - 1]));
        expect(PACE[fs[i].pace]).toBeGreaterThanOrEqual(PACE[fs[i - 1].pace]);
        expect(fs[i].enemyHp).toBeGreaterThan(fs[i - 1].enemyHp);
        expect(fs[i].hearts).toBeLessThanOrEqual(fs[i - 1].hearts);
      }
    }
    const bosses = FLOORS.filter((f) => f.kind === "boss");
    bosses.slice(1).forEach((b, i) => expect(b.enemyHp).toBeGreaterThan(bosses[i].enemyHp));
    expect(FLOORS[20].enemyHp).toBeGreaterThan(bosses[4].enemyHp);
    expect(maxLen(FLOORS[20])).toBe(7);
  });

  it("every floor can actually generate questions using only its kana", () => {
    for (const f of FLOORS) {
      const r = generateRound({
        settings: { ...DEFAULT_SETTINGS, mode: f.mode, enabledChars: f.chars, lengthRange: f.lengthRange, timerPace: f.pace, questionsPerRound: 10 },
        chars: {},
        words: {},
        gen: EMPTY_GEN_STATE,
        rng: mulberry32(f.id),
      });
      expect(r.ok, `floor ${f.id}`).toBe(true);
      if (!r.ok) continue;
      for (const q of r.round.questions) {
        expect(q.chars.every((k) => f.chars.includes(k) && isBasicHiragana(k))).toBe(true);
        expect(q.timeLimitSec).toBeGreaterThan(0);
      }
    }
  });
});

describe("battle rules", () => {
  it("hits the enemy on correct answers and wins at 0 hp", () => {
    const b = win(1);
    expect(b.status).toBe("won");
    expect(b.correct).toBe(getFloor(1)!.enemyHp);
    expect(battleStars(b)).toBe(3);
  });

  it("loses hearts on misses and ends when they run out", () => {
    const f = getFloor(4)!; // boss, 3 hearts
    let b = startBattle(f);
    b = applyAnswer(b, false);
    b = applyAnswer(b, true);
    b = applyAnswer(b, false);
    expect(b.status).toBe("fighting");
    b = applyAnswer(b, false);
    expect(b.status).toBe("lost");
    expect(battleStars(b)).toBe(0);
    expect(applyAnswer(b, true)).toBe(b); // nothing happens after the end
  });

  it("gives fewer stars the more hearts you lose", () => {
    expect(battleStars(win(1, 1))).toBe(2);
    expect(battleStars(win(1, 3))).toBe(1);
    expect(battleStars(win(4, 1))).toBe(2);
    expect(battleStars(win(4, 2))).toBe(1);
  });

  it("tracks combos", () => {
    let b = startBattle(getFloor(1)!);
    b = applyAnswer(applyAnswer(applyAnswer(b, true), true), false);
    b = applyAnswer(b, true);
    expect(b.bestCombo).toBe(2);
    expect(b.combo).toBe(1);
  });
});

describe("tower progress", () => {
  it("unlocks floors one at a time and pays bonus xp only once", () => {
    let p = emptyProgress();
    expect(isUnlocked(p.tower, 1)).toBe(true);
    expect(isUnlocked(p.tower, 2)).toBe(false);
    const r1 = applyBattle(p, win(1, 2));
    p = r1.progress;
    expect(r1.outcome).toMatchObject({ won: true, firstClear: true, stars: 2, bonusXp: 40 });
    expect(p.xp).toBe(40);
    expect(isUnlocked(p.tower, 2)).toBe(true);
    expect(currentFloor(p.tower)).toBe(2);

    const r2 = applyBattle(p, win(1));
    expect(r2.outcome).toMatchObject({ firstClear: false, newBest: true, stars: 3, bonusXp: 0 });
    expect(r2.progress.tower.floors[1].stars).toBe(3);
    expect(r2.progress.tower.floors[1].attempts).toBe(2);
  });

  it("a loss never lowers your best stars", () => {
    let p = applyBattle(emptyProgress(), win(1)).progress;
    let lost = startBattle(getFloor(1)!);
    while (lost.status === "fighting") lost = applyAnswer(lost, false);
    p = applyBattle(p, lost).progress;
    expect(p.tower.floors[1].stars).toBe(3);
  });

  it("merges two devices by keeping the best of each floor", () => {
    const a = applyBattle(emptyProgress(), win(1, 3)).progress.tower;
    const b = applyBattle(applyBattle(emptyProgress(), win(1)).progress, win(2)).progress.tower;
    const m = mergeTower(a, b);
    expect(m.floors[1].stars).toBe(3);
    expect(m.floors[2].stars).toBe(3);
    expect(totalStars(m)).toBe(6);
  });

  it("tower survives sync merges and junk data", () => {
    const p = applyBattle(emptyProgress(), win(1)).progress;
    expect(mergeDiverged(emptyProgress(), p).tower.floors[1].stars).toBe(3);
    expect(mergeGuestInto(emptyProgress(), p).tower.floors[1].stars).toBe(3);
    expect(mergeDiverged(emptyProgress(), p).xp).toBe(p.xp); // bonus xp kept via day log
    expect(sanitizeTower({ floors: { 1: { stars: 9 }, 99: { stars: 3 }, x: 1 } })).toEqual({
      floors: { 1: { stars: 0, clearedAt: 0, attempts: 0, flawlessBoss: false } },
    });
    expect(sanitizeProgress({ tower: "nope" }).tower).toEqual({ floors: {} });
    expect(sanitizeProgress(JSON.parse(JSON.stringify(p))).tower).toEqual(p.tower);
  });
});

describe("achievements", () => {
  it("unlocks boss badges, titles and the flawless badge", () => {
    let p = emptyProgress();
    for (let id = 1; id <= 3; id++) p = applyBattle(p, win(id)).progress;
    const before = p;
    p = applyBattle(p, win(4)).progress; // kappa, no hearts lost
    const got = newlyEarned(before, p).map((a) => a.id);
    expect(got).toContain("boss-kappa");
    expect(got).toContain("untouchable");
    expect(currentTitle(p)).toBe("Ugyappa Tamer");
  });

  it("hanamaru needs 3 stars everywhere", () => {
    let p = emptyProgress();
    for (const f of FLOORS) p = applyBattle(p, win(f.id)).progress;
    const ids = new Set(ACHIEVEMENTS.filter((a) => a.earned(p)).map((a) => a.id));
    expect(ids.has("hanamaru")).toBe(true);
    expect(ids.has("boss-ryu")).toBe(true);
    expect(currentTitle(p)).toBe("Dragon Slayer");
    p = { ...p, tower: { floors: { ...p.tower.floors, 5: { ...p.tower.floors[5], stars: 2 } } } };
    expect(ACHIEVEMENTS.find((a) => a.id === "hanamaru")!.earned(p)).toBe(false);
  });

  it("has unique ids", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});
