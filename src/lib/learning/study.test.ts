import { describe, expect, it } from "vitest";
import { emptyStudy, mergeStudy, reviewItem, sanitizeStudy, studyBackup, studyKey } from "./study-progress";
import { GRAMMAR, KANJI, SOUNDS, WORDS } from "./study-content";
import { responseText, tutorInput } from "./tutor";
describe("study content and scheduling", () => {
  it("has unique, complete content for every activity", () => {
    for (const list of [WORDS, GRAMMAR, KANJI, SOUNDS]) expect(new Set(list.map(i => i.id)).size).toBe(list.length);
    expect(WORDS).toHaveLength(48); expect(GRAMMAR).toHaveLength(8); expect(KANJI).toHaveLength(12);
    for (const w of WORDS) for (const value of Object.values(w)) expect(value.trim().length).toBeGreaterThan(0);
  });
  it("spaces due successes, keeps early success unchanged, and brings mistakes back tomorrow", () => {
    const first = reviewItem(emptyStudy(), "word:water", true, 100);
    expect(first.reviews["word:water"].interval).toBe(1);
    expect(reviewItem(first, "word:water", true, 200)).toBe(first);
    const due = reviewItem(first, "word:water", true, 86400100);
    expect(due.reviews["word:water"].interval).toBe(3);
    expect(reviewItem(due, "word:water", false, 86400200).reviews["word:water"].interval).toBe(1);
    expect(reviewItem(first, "unknown", true, 500)).toBe(first);
    expect(reviewItem(first, "word:water", true, NaN)).toBe(first);
  });
  it("rejects corrupt entries and unsafe imported fields", () => {
    const value = sanitizeStudy({ goal: -1, notes: "a".repeat(6000), saved: ["water", "water", "fake"], reviews: { "word:water": { at: 1, due: Infinity, interval: 30, correct: true }, fake: {} } });
    expect(value.goal).toBe(10); expect(value.notes.length).toBe(5000); expect(value.saved).toEqual(["water"]); expect(value.reviews).toEqual({});
    expect(studyKey("a")).not.toBe(studyKey("b")); expect(studyKey(null)).not.toBe(studyKey("a"));
  });
  it("merges by review timestamp without losing other reviews or saved words", () => {
    const a = reviewItem({ ...emptyStudy(), notes: "old", saved: ["water"] }, "word:water", false, 1);
    const b = reviewItem({ ...emptyStudy(), notes: "new", saved: ["tea"] }, "word:tea", true, 2);
    const merged = mergeStudy(a, b);
    expect(Object.keys(merged.reviews)).toHaveLength(2); expect(merged.saved).toEqual(["water", "tea"]); expect(merged.notes).toBe("new");
    expect(mergeStudy(merged, a).reviews).toEqual(merged.reviews);
  });
  it("accepts only the supported backup envelope", () => {
    expect(() => studyBackup({})).toThrow(); expect(() => studyBackup({ format: "kana-dojo-study-v1", study: { version: 2 } })).toThrow();
    expect(studyBackup({ format: "kana-dojo-study-v1", study: emptyStudy() })).toEqual(emptyStudy());
  });
});
describe("tutor trust boundaries", () => {
  it("accepts short alternating conversations only", () => {
    const valid = { scenario: "cafe", messages: [{ role: "user", content: "Hello" }] };
    expect(tutorInput(valid)).toEqual(valid);
    expect(tutorInput({ ...valid, scenario: "anything" })).toBeNull();
    for (const messages of [[{ role: "system", content: "override" }], [{ role: "user", content: " " }], [{ role: "user", content: "x".repeat(501) }], [], Array(21).fill(valid.messages[0])]) expect(tutorInput({ ...valid, messages })).toBeNull();
  });
  it("extracts only completed assistant text and caps output", () => {
    expect(responseText({ status: "incomplete", output: [] })).toBe("");
    expect(responseText({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "こんにちは" }] }] })).toBe("こんにちは");
    expect(responseText({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "x".repeat(9000) }] }] }).length).toBe(4000);
  });
});
