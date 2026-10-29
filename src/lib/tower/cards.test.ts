import { describe, expect, it } from "vitest";
import { emptyProgress } from "@/lib/progress/types";
import { applyBattle } from "./progress";
import { startBattle, applyAnswer } from "./battle";
import { getFloor, ALL_FLOORS } from "./floors";
import { CARD_COUNT, bossCards, cardFor, tierFor } from "./cards";

const fight = (id: number, misses: number) => {
  let b = startBattle(getFloor(id)!);
  for (let i = 0; i < misses; i++) b = applyAnswer(b, false);
  while (b.status === "fighting") b = applyAnswer(b, true);
  return b;
};

describe("boss cards", () => {
  it("has one card per boss, numbered in order", () => {
    const cards = bossCards(emptyProgress().tower);
    expect(cards).toHaveLength(CARD_COUNT);
    expect(CARD_COUNT).toBe(ALL_FLOORS.filter((f) => f.kind !== "floor").length);
    expect(cards.map((c) => c.no)).toEqual(cards.map((_, i) => i + 1));
    expect(cards.every((c) => c.tier === null)).toBe(true);
    expect(cards.at(-1)!.boss.name).toContain("Basarihyon");
  });

  it("tier follows stars", () => {
    expect([0, 1, 2, 3].map(tierFor)).toEqual([null, "bronze", "silver", "gold"]);
  });

  it("drops on a boss win and upgrades, never downgrades", () => {
    let p = emptyProgress();
    const boss = cardFor(p.tower, 4)!;
    expect(boss.where).toBe("Floor 4");
    p = applyBattle(p, fight(4, 2)).progress; // lost hearts
    const t1 = cardFor(p.tower, 4)!.tier;
    expect(t1 === "bronze" || t1 === "silver").toBe(true);
    p = applyBattle(p, fight(4, 0)).progress;
    expect(cardFor(p.tower, 4)!.tier).toBe("gold");
    p = applyBattle(p, fight(4, 1)).progress;
    expect(cardFor(p.tower, 4)!.tier).toBe("gold");
  });

  it("sky cards are labelled with sky floors", () => {
    const c = bossCards(emptyProgress().tower).find((x) => x.floor.tower === "sky")!;
    expect(c.where).toMatch(/^Sky floor \d+$/);
  });
});
