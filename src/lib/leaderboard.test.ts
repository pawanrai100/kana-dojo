import { describe, expect, it } from "vitest";
import { daysLeft, weekScore, weekStart } from "./leaderboard";

const at = (k: string) => new Date(`${k}T12:00:00`).getTime();

describe("weekly leaderboard dates", () => {
  it("weeks start on monday", () => {
    expect(weekStart(at("2026-10-26"))).toBe("2026-10-26"); // monday
    expect(weekStart(at("2026-10-30"))).toBe("2026-10-26"); // friday
    expect(weekStart(at("2026-11-01"))).toBe("2026-10-26"); // sunday
    expect(weekStart(at("2026-11-02"))).toBe("2026-11-02");
    expect(weekStart(at("2027-01-01"))).toBe("2026-12-28"); // across new year
  });

  it("counts days left including today", () => {
    expect(daysLeft(at("2026-10-26"))).toBe(7);
    expect(daysLeft(at("2026-11-01"))).toBe(1);
  });

  it("scores only this week's correct answers", () => {
    const days = { "2026-10-25": { correct: 99 }, "2026-10-26": { correct: 10 }, "2026-11-01": { correct: 5 }, "2026-11-02": { correct: 7 } };
    expect(weekScore(days, at("2026-10-30"))).toBe(15);
  });
});
