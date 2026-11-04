import { SPEAKING_LESSONS } from "./lessons";
export function tutorInput(raw: unknown): { scenario: string; messages: { role: "user" | "assistant"; content: string }[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as { scenario?: unknown; messages?: unknown };
  if (typeof value.scenario !== "string" || !SPEAKING_LESSONS.some(l => l.id === value.scenario) || !Array.isArray(value.messages) || !value.messages.length || value.messages.length > 19 || value.messages.length % 2 !== 1) return null;
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (let i = 0; i < value.messages.length; i++) {
    const m = value.messages[i]; const role = i % 2 ? "assistant" : "user";
    if (!m || m.role !== role || typeof m.content !== "string" || !m.content.trim() || m.content.length > (role === "user" ? 500 : 4000)) return null;
    messages.push({ role, content: m.content.trim() });
  }
  return { scenario: value.scenario, messages };
}
export function responseText(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const data = raw as { status?: unknown; output?: { type?: string; content?: { type?: string; text?: string }[] }[] };
  if (data.status !== "completed" || !Array.isArray(data.output)) return "";
  return data.output.filter(o => o.type === "message" && Array.isArray(o.content)).flatMap(o => o.content!).filter(c => c.type === "output_text" && typeof c.text === "string").map(c => c.text).join("\n").slice(0, 4000);
}
