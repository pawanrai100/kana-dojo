// @vitest-environment happy-dom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LearningView } from "./learning-view";
import { SPEAKING_LESSONS } from "@/lib/learning/lessons";
import { learningKey } from "@/lib/learning/progress";

const auth = vi.hoisted(() => ({ status: "guest", user: null as null | { id: string } }));
vi.mock("@/features/auth/auth-provider", () => ({ useAuth: () => auth }));

beforeEach(() => { auth.status = "guest"; auth.user = null; localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function listen(lesson: typeof SPEAKING_LESSONS[number], help = false) {
  fireEvent.click(screen.getByRole("button", { name: "Try listening" }));
  for (let i = 0; i < lesson.phrases.length; i++) {
    if (help && i === 0) {
      fireEvent.click(screen.getByRole("button", { name: "Show text / audio unavailable" }));
      expect(screen.getByText(lesson.phrases[0].japanese)).toBeTruthy();
    }
    fireEvent.click(screen.getByRole("button", { name: lesson.phrases[i].meaning }));
    fireEvent.click(screen.getByRole("button", { name: i + 1 < lesson.phrases.length ? "Next listening check" : "Try the conversation" }));
  }
}

describe("complete learning journeys", () => {
  for (const lesson of SPEAKING_LESSONS) {
    it(`completes and saves ${lesson.title}, including every listening and typed conversation check`, () => {
      render(createElement(LearningView));
      fireEvent.click(screen.getByRole("button", { name: `Start lesson: ${lesson.title}` }));
      expect(screen.getAllByRole("button", { name: "Listen" })).toHaveLength(3);
      listen(lesson);
      for (let i = 0; i < lesson.turns.length; i++) {
        fireEvent.change(screen.getByLabelText("Optional typed reply (Japanese or romaji)"), { target: { value: lesson.turns[i].reading } });
        fireEvent.click(screen.getByRole("button", { name: "Check typed reply" }));
        expect(screen.getByText("That matches a sample reply.")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: i + 1 < lesson.turns.length ? "Next exchange" : "Finish lesson" }));
      }
      expect(screen.getByRole("region", { name: "Lesson reflection" })).toBeTruthy();
      expect(JSON.parse(localStorage.getItem(learningKey(null))!)[lesson.id].independent).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: "Back to learning path" }));
      expect(screen.getByRole("button", { name: `Practise again: ${lesson.title}` })).toBeTruthy();
    });
  }
  it("allows audio-unavailable and model-assisted practice without a microphone", () => {
    render(createElement(LearningView));
    fireEvent.click(screen.getByRole("button", { name: "Start recommended lesson" }));
    listen(SPEAKING_LESSONS[0], true);
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole("button", { name: "I need a model reply" }));
      fireEvent.click(screen.getByRole("button", { name: "I practised with the model" }));
      fireEvent.click(screen.getByRole("button", { name: i ? "Finish lesson" : "Next exchange" }));
    }
    const stored = JSON.parse(localStorage.getItem(learningKey(null))!);
    expect(stored.introductions.independent).toBe(false);
    expect(stored.introductions.interval).toBe(1);
  });
  it("does not advance for wrong listening or typed answers and clears a stale successful check", () => {
    render(createElement(LearningView));
    fireEvent.click(screen.getByRole("button", { name: "Start recommended lesson" }));
    fireEvent.click(screen.getByRole("button", { name: "Try listening" }));
    fireEvent.click(screen.getByRole("button", { name: SPEAKING_LESSONS[0].phrases[1].meaning }));
    expect(screen.queryByRole("button", { name: "Next listening check" })).toBeNull();
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole("button", { name: SPEAKING_LESSONS[0].phrases[i].meaning }));
      fireEvent.click(screen.getByRole("button", { name: i < 2 ? "Next listening check" : "Try the conversation" }));
    }
    const input = screen.getByLabelText("Optional typed reply (Japanese or romaji)");
    fireEvent.change(input, { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Check typed reply" }));
    expect(screen.queryByRole("button", { name: "Next exchange" })).toBeNull();
    fireEvent.change(input, { target: { value: "konnichiwa" } });
    fireEvent.click(screen.getByRole("button", { name: "Check typed reply" }));
    expect(screen.getByRole("button", { name: "Next exchange" })).toBeTruthy();
    fireEvent.change(input, { target: { value: "wrong again" } });
    expect(screen.queryByRole("button", { name: "Next exchange" })).toBeNull();
  });
  it("does not credit a lesson when the learner exits early", () => {
    render(createElement(LearningView));
    fireEvent.click(screen.getByRole("button", { name: "Start recommended lesson" }));
    fireEvent.click(screen.getByRole("button", { name: "All lessons" }));
    expect(localStorage.getItem(learningKey(null))).toBeNull();
  });
  it("recovers corrupt stored data and keeps different accounts separate", () => {
    localStorage.setItem(learningKey(null), "bad JSON");
    localStorage.setItem(learningKey("account-a"), JSON.stringify({ introductions: { completedAt: 0, dueAt: 86400000, interval: 1, independent: true } }));
    const view = render(createElement(LearningView));
    expect(screen.getByRole("button", { name: "Start lesson: Meet someone" })).toBeTruthy();
    act(() => { auth.status = "signed-in"; auth.user = { id: "account-a" }; view.rerender(createElement(LearningView)); });
    expect(screen.getByRole("button", { name: "Practise again: Meet someone" })).toBeTruthy();
    act(() => { auth.user = { id: "account-b" }; view.rerender(createElement(LearningView)); });
    expect(screen.getByRole("button", { name: "Start lesson: Meet someone" })).toBeTruthy();
  });
});

