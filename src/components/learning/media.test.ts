// @vitest-environment happy-dom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Pronunciation } from "./pronunciation";
import { VoiceRecorder } from "./voice-recorder";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Japanese model speech", () => {
  it("handles browsers without speech support", () => {
    render(createElement(Pronunciation, { text: "こんにちは" }));
    fireEvent.click(screen.getByRole("button", { name: "Listen" }));
    expect(screen.getByRole("status").textContent).toMatch(/not supported|No Japanese voice/);
  });
  it("does not use an English voice as a Japanese fallback", () => {
    const speak = vi.fn();
    vi.stubGlobal("speechSynthesis", { getVoices: () => [{ lang: "en-US" }], addEventListener: vi.fn(), removeEventListener: vi.fn(), cancel: vi.fn(), speak });
    render(createElement(Pronunciation, { text: "こんにちは" }));
    fireEvent.click(screen.getByRole("button", { name: "Listen" }));
    expect(speak).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toMatch(/No Japanese voice/);
  });
  it("uses Japanese voice, slower rate, and cancels speech on unmount", () => {
    const speak = vi.fn(); const cancel = vi.fn();
    vi.stubGlobal("speechSynthesis", { getVoices: () => [{ lang: "ja-JP" }], addEventListener: vi.fn(), removeEventListener: vi.fn(), cancel, speak });
    vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
    const view = render(createElement(Pronunciation, { text: "お茶をください", slow: true }));
    fireEvent.click(screen.getByRole("button", { name: "Listen slowly" }));
    expect(speak.mock.calls[0][0]).toMatchObject({ text: "お茶をください", lang: "ja-JP", rate: 0.7 });
    view.unmount(); expect(cancel).toHaveBeenCalledTimes(2);
  });
});

function microphone() {
  const stopTrack = vi.fn();
  const stream = { getTracks: () => [{ stop: stopTrack }] };
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  const instances: FakeRecorder[] = [];
  class FakeRecorder {
    state = "inactive"; mimeType = "audio/webm";
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() { instances.push(this); }
    start() { this.state = "recording"; }
    stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["test audio"]) }); this.onstop?.(); }
  }
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-recording");
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  return { stopTrack, stream, getUserMedia, instances, revoke };
}

describe("local microphone recording lifecycle", () => {
  it("records only after a click, stops tracks, provides playback and discards the blob", async () => {
    const m = microphone();
    render(createElement(VoiceRecorder));
    expect(m.getUserMedia).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Record my reply" })));
    expect(m.getUserMedia).toHaveBeenCalledWith({ audio: true });
    fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
    expect(m.stopTrack).toHaveBeenCalled();
    expect(screen.getByLabelText("Your recorded reply").getAttribute("src")).toBe("blob:test-recording");
    fireEvent.click(screen.getByRole("button", { name: "Discard recording" }));
    expect(m.revoke).toHaveBeenCalledWith("blob:test-recording");
    expect(screen.queryByLabelText("Your recorded reply")).toBeNull();
  });
  it("handles denied permission without blocking typed practice", async () => {
    const m = microphone(); m.getUserMedia.mockRejectedValue(new Error("denied"));
    render(createElement(VoiceRecorder));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Record my reply" })));
    expect(screen.getByRole("status").textContent).toMatch(/denied/);
    expect(screen.getByRole("button", { name: "Record my reply" }).hasAttribute("disabled")).toBe(false);
  });
  it("stops after 30 seconds", async () => {
    vi.useFakeTimers(); const m = microphone(); render(createElement(VoiceRecorder));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Record my reply" })));
    act(() => vi.advanceTimersByTime(30_000));
    expect(m.instances[0].state).toBe("inactive"); expect(m.stopTrack).toHaveBeenCalled();
  });
  it("stops microphone and revokes playback when leaving an activity", async () => {
    const m = microphone(); const view = render(createElement(VoiceRecorder));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Record my reply" })));
    fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
    view.unmount(); expect(m.stopTrack).toHaveBeenCalled(); expect(m.revoke).toHaveBeenCalledWith("blob:test-recording");
  });
  it("releases a microphone acquired after the activity has unmounted", async () => {
    const m = microphone(); let resolve!: (value: unknown) => void;
    m.getUserMedia.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const view = render(createElement(VoiceRecorder));
    fireEvent.click(screen.getByRole("button", { name: "Record my reply" }));
    view.unmount(); await act(async () => resolve(m.stream));
    expect(m.stopTrack).toHaveBeenCalled(); expect(m.instances).toHaveLength(0);
  });
});
