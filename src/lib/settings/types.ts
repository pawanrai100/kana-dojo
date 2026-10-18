import { BASIC_KANA_LIST, isBasicHiragana } from "@/lib/kana/hiragana";

export type PracticeMode = "mixed" | "words" | "random";
// 2-4 is only used by tower floors, settings still offer the three below
export type LengthRange = "2-3" | "2-4" | "2-5" | "3-7";
export type TimerPace = "off" | "relaxed" | "normal" | "fast";
export type ThemePref = "light" | "dark" | "system";

export interface Settings {
  questionsPerRound: 5 | 10 | 15 | 20;
  lengthRange: LengthRange;
  mode: PracticeMode;
  timerPace: TimerPace;
  showNumbers: boolean;
  theme: ThemePref;
  sound: boolean;
  autoFocus: boolean;
  shortcuts: boolean;
  enabledChars: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  questionsPerRound: 10,
  lengthRange: "2-5",
  mode: "mixed",
  timerPace: "normal",
  showNumbers: true,
  theme: "system",
  sound: true,
  autoFocus: true,
  shortcuts: true,
  enabledChars: [...BASIC_KANA_LIST],
};

export const LENGTH_BOUNDS: Record<LengthRange, [number, number]> = {
  "2-3": [2, 3],
  "2-4": [2, 4],
  "2-5": [2, 5],
  "3-7": [3, 7],
};

const pick = <T,>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

// never trust localStorage. anything odd falls back to defaults
export function sanitizeSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  if (!raw || typeof raw !== "object") return { ...d, enabledChars: [...d.enabledChars] };
  const r = raw as Record<string, unknown>;
  let enabled = Array.isArray(r.enabledChars)
    ? r.enabledChars.filter((k): k is string => typeof k === "string" && isBasicHiragana(k))
    : [...d.enabledChars];
  enabled = BASIC_KANA_LIST.filter((k) => enabled.includes(k)); // dedupe + keep chart order
  if (enabled.length === 0) enabled = [...d.enabledChars];
  return {
    questionsPerRound: pick(r.questionsPerRound, [5, 10, 15, 20] as const, d.questionsPerRound),
    lengthRange: pick(r.lengthRange, ["2-3", "2-5", "3-7"] as const, d.lengthRange),
    mode: pick(r.mode, ["mixed", "words", "random"] as const, d.mode),
    timerPace: pick(r.timerPace, ["off", "relaxed", "normal", "fast"] as const, d.timerPace),
    showNumbers: bool(r.showNumbers, d.showNumbers),
    theme: pick(r.theme, ["light", "dark", "system"] as const, d.theme),
    sound: bool(r.sound, d.sound),
    autoFocus: bool(r.autoFocus, d.autoFocus),
    shortcuts: bool(r.shortcuts, d.shortcuts),
    enabledChars: enabled,
  };
}
