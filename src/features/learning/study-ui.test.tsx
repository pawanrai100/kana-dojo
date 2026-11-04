// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudyView } from "./study-view";
import { GRAMMAR, KANJI, SOUNDS, WORDS } from "@/lib/learning/study-content";
import { SPEAKING_LESSONS } from "@/lib/learning/lessons";
import { studyKey } from "@/lib/learning/study-progress";
const auth = vi.hoisted(() => ({ status: "guest", user: null as null | { id: string } }));
vi.mock("@/features/auth/auth-provider", () => ({ useAuth: () => auth }));
vi.mock("@/lib/supabase/client", () => ({ getSupabase: () => null }));
beforeEach(() => { auth.status = "guest"; auth.user = null; localStorage.clear(); location.hash = ""; vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ available: false }) })); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function open(name: string) { fireEvent.click(screen.getByRole("link", { name })); }
function stored() { return JSON.parse(localStorage.getItem(studyKey(null))!); }
describe("study studio journeys", () => {
  it("saves goals and separates users", () => {
    const view = render(<StudyView />); fireEvent.click(screen.getByRole("button", { name: "20 minutes" })); expect(stored().goal).toBe(20);
    act(() => { auth.user = { id: "different" }; view.rerender(<StudyView />); }); expect(screen.getByText("Your next 10 minutes")).toBeTruthy();
  });
  it("filters and saves words, reveals cards before rating and completes a session", () => {
    render(<StudyView />); open("Vocabulary"); fireEvent.change(screen.getByLabelText("Topic"), { target: { value: "Food" } });
    fireEvent.click(screen.getByRole("button", { name: "Save word: water" })); expect(stored().saved).toContain("water");
    fireEvent.click(screen.getByRole("button", { name: "Practise up to 10 words" })); expect(screen.queryByRole("button", { name: "Remembered" })).toBeNull();
    for (const w of WORDS.filter(w => w.topic === "Food")) { expect(screen.getByRole("heading", { name: w.japanese })).toBeTruthy(); fireEvent.click(screen.getByRole("button", { name: "Reveal answer" })); fireEvent.click(screen.getByRole("button", { name: "Remembered" })); }
    expect(screen.getByText("Review session complete")).toBeTruthy(); expect(Object.keys(stored().reviews)).toHaveLength(8);
  });
  for (const g of GRAMMAR) it(`builds grammar: ${g.id}`, () => {
    render(<StudyView />); open("Grammar"); fireEvent.click(screen.getByRole("button", { name: g.title }));
    for (const token of g.tokens) fireEvent.click(screen.getByRole("button", { name: token }));
    fireEvent.click(screen.getByRole("button", { name: "Check sentence" })); expect(screen.getByText("That builds the sentence correctly.")).toBeTruthy(); expect(stored().reviews[`grammar:${g.id}`].correct).toBe(true);
  });
  it("wrong grammar does not complete a pattern; help produces assisted review", () => {
    render(<StudyView />); open("Grammar"); fireEvent.click(screen.getByRole("button", { name: "を" })); fireEvent.click(screen.getByRole("button", { name: "Check sentence" })); expect(localStorage.getItem(studyKey(null))).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Clear sentence" })); for (const t of GRAMMAR[0].tokens) fireEvent.click(screen.getByRole("button", { name: t })); fireEvent.click(screen.getByRole("button", { name: "Check sentence" })); expect(stored().reviews["grammar:desu"].correct).toBe(false);
  });
  it("practises every kanji with gated self-assessment", () => {
    render(<StudyView />); open("First kanji");
    for (const k of KANJI) { expect(screen.getByText(k.id, { exact: true })).toBeTruthy(); fireEvent.click(screen.getByRole("button", { name: "Reveal kanji card" })); fireEvent.click(screen.getByRole("button", { name: "Need practice" })); }
    expect(Object.keys(stored().reviews)).toHaveLength(12); expect(screen.getByRole("button", { name: "Practise again" })).toBeTruthy();
  });
  for (const s of SOUNDS) it(`uses text fallback honestly: ${s.id}`, () => {
    vi.spyOn(Math, "random").mockReturnValue(0); render(<StudyView />); open("Sounds"); fireEvent.click(screen.getByRole("button", { name: s.title }));
    fireEvent.click(screen.getByRole("button", { name: "Show text if audio unavailable" })); fireEvent.click(screen.getByRole("button", { name: s.a })); expect(stored().reviews[`sound:${s.id}`].correct).toBe(false);
  });
  it("hides shadowing script and records confidence once", () => {
    render(<StudyView />); open("Shadowing"); fireEvent.click(screen.getByRole("button", { name: "Hide script" })); expect(screen.queryByText("konnichiwa")).toBeNull(); fireEvent.click(screen.getByRole("button", { name: "Comfortable without the script" })); expect(Object.keys(stored().reviews)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Next phrase" })); expect(screen.getByRole("button", { name: "Comfortable without the script" }).hasAttribute("disabled")).toBe(false);
  });
  for (const lesson of SPEAKING_LESSONS) it(`roleplays ${lesson.id}`, () => {
    render(<StudyView />); open("Roleplay"); fireEvent.change(screen.getByLabelText("Conversation scenario"), { target: { value: lesson.id } });
    for (let i = 0; i < lesson.turns.length; i++) { fireEvent.change(screen.getByLabelText("Your reply"), { target: { value: lesson.turns[i].reading } }); fireEvent.click(screen.getByRole("button", { name: "Check my reply" })); fireEvent.click(screen.getByRole("button", { name: i + 1 === lesson.turns.length ? "Finish roleplay" : "Continue conversation" })); }
    expect(screen.getByText("Conversation complete")).toBeTruthy(); expect(stored().reviews[`roleplay:${lesson.id}`].correct).toBe(true);
  });
  it("saves notes and exposes unconfigured services without pretending to connect", async () => {
    render(<StudyView />); open("Notebook"); fireEvent.change(screen.getByLabelText("Useful phrases and questions"), { target: { value: "Ask about particles" } }); fireEvent.click(screen.getByRole("button", { name: "Save notes" })); expect(stored().notes).toBe("Ask about particles");
    expect(screen.getByRole("button", { name: "Merge with cloud backup" }).hasAttribute("disabled")).toBe(true); open("AI tutor"); await waitFor(() => expect(screen.getByText(/AI tutor is not connected/)).toBeTruthy()); expect(screen.getByRole("button", { name: "Send to AI tutor" }).hasAttribute("disabled")).toBe(true);
  });
});
