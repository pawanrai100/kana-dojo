// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Notebook } from "./study-services";
import { emptyStudy, reviewItem } from "@/lib/learning/study-progress";
const mock = vi.hoisted(() => ({ lessons: { progress: {}, save: vi.fn().mockReturnValue(true) }, from: vi.fn(), user: { id: "a" } }));
vi.mock("@/features/auth/auth-provider", () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock("./use-learning", () => ({ useLearning: () => mock.lessons }));
vi.mock("@/lib/supabase/client", () => ({ getSupabase: () => ({ from: mock.from }) }));
const state = reviewItem({ ...emptyStudy(), notes: "local", saved: ["water"] }, "word:water", false, 1);
const remote = reviewItem({ ...emptyStudy(), notes: "remote", saved: ["tea"] }, "word:tea", true, 2);
function setup() { const save = vi.fn().mockReturnValue(true); render(<Notebook study={{ state, save, owner: "test", loading: false }} save={save} />); return save; }
function file(raw: unknown) { return new File([JSON.stringify(raw)], "study.json", { type: "application/json" }); }
beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_STUDY_CLOUD_ENABLED", "true"); vi.clearAllMocks(); mock.lessons.save.mockReturnValue(true); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
describe("portable and cloud study backup", () => {
  it("requires explicit merge after validating an imported file", async () => {
    const save = setup(); fireEvent.change(screen.getByLabelText("Import study backup"), { target: { files: [file({ format: "kana-dojo-study-v1", study: remote, lessons: {} })] } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Merge this backup" })).toBeTruthy()); expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Merge this backup" })); expect(save.mock.calls[0][0].saved).toEqual(["water", "tea"]); expect(Object.keys(save.mock.calls[0][0].reviews)).toHaveLength(2);
  });
  it("rejects unrelated files without saving or presenting a merge", async () => {
    const save = setup(); fireEvent.change(screen.getByLabelText("Import study backup"), { target: { files: [file({ unrelated: true })] } });
    await waitFor(() => expect(screen.getByText(/Choose a Kana Dojo study backup/)).toBeTruthy()); expect(save).not.toHaveBeenCalled(); expect(screen.queryByRole("button", { name: "Merge this backup" })).toBeNull();
  });
  it("merges remote data with a revision check before updating local state", async () => {
    const eq = vi.fn(); const update = vi.fn(); const chain = { select: vi.fn(), eq, maybeSingle: vi.fn() }; chain.select.mockReturnValue(chain); eq.mockReturnValue(chain);
    chain.maybeSingle.mockResolvedValueOnce({ data: { revision: 2, payload: { format: "kana-dojo-study-v1", study: remote, lessons: {} } }, error: null }).mockResolvedValueOnce({ data: { revision: 3 }, error: null });
    update.mockReturnValue(chain); mock.from.mockReturnValue({ ...chain, update }); const save = setup(); fireEvent.click(screen.getByRole("button", { name: "Merge with cloud backup" }));
    await waitFor(() => expect(save).toHaveBeenCalled()); expect(eq).toHaveBeenCalledWith("revision", 2); expect(update.mock.calls[0][0].revision).toBe(3); expect(save.mock.calls[0][0].notes).toBe("remote");
  });
  it("preserves local data on cloud revision conflicts", async () => {
    const chain = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), update: vi.fn() }; chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.update.mockReturnValue(chain);
    chain.maybeSingle.mockResolvedValueOnce({ data: { revision: 2, payload: { format: "kana-dojo-study-v1", study: remote } }, error: null }).mockResolvedValueOnce({ data: null, error: null }); mock.from.mockReturnValue(chain);
    const save = setup(); fireEvent.click(screen.getByRole("button", { name: "Merge with cloud backup" })); await waitFor(() => expect(screen.getByText(/cloud copy changed/)).toBeTruthy()); expect(save).not.toHaveBeenCalled();
  });
  it("keeps a missing-table error recoverable", async () => {
    const chain = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: {} }) }; chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain); mock.from.mockReturnValue(chain);
    const save = setup(); fireEvent.click(screen.getByRole("button", { name: "Merge with cloud backup" })); await waitFor(() => expect(screen.getByText(/Cloud study storage is not available/)).toBeTruthy()); expect(save).not.toHaveBeenCalled();
  });
});
