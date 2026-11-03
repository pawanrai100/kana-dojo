import { describe, expect, it } from "vitest";
import { ALL_FLOORS } from "./floors";
import { DIALOGUE, bossIntro, bossLine, bossSlowLine } from "./dialogue";

const bosses = ALL_FLOORS.filter((f) => f.boss).map((f) => f.boss!.id);

describe("boss dialogue", () => {
  it("every boss has its own lines", () => {
    for (const id of bosses) {
      const d = DIALOGUE[id];
      expect(d, id).toBeDefined();
      expect(d.lose.length, id).toBeGreaterThanOrEqual(2);
      expect(d.win.length, id).toBeGreaterThanOrEqual(2);
      expect(bossIntro(id)).toBeTruthy();
      expect(bossSlowLine(id)).toBeTruthy();
    }
    const all = Object.values(DIALOGUE).flatMap((d) => [d.intro, d.slow, ...d.lose, ...d.win]);
    expect(new Set(all).size).toBe(all.length); // nothing shared between bosses
  });

  it("fills in the missed kana, or skips lines that need one", () => {
    for (let seed = 0; seed < 6; seed++) {
      expect(bossLine("tako", "lose", seed)).not.toContain("{k}");
      expect(bossLine("tako", "lose", seed, "ぬ")).not.toContain("{k}");
    }
    expect([0, 1, 2].map((s) => bossLine("tako", "lose", s, "ぬ")).some((l) => l?.includes("ぬ"))).toBe(true);
  });

  it("rotates lines between fights", () => {
    expect(bossLine("saru", "win", 0)).not.toBe(bossLine("saru", "win", 1));
    expect(bossLine("nobody", "win", 0)).toBeUndefined();
  });
});
