import { ALL_KANA_LIST, BASIC_KANA_LIST, KATAKANA_BASIC_LIST, LONG_MARK, isKnownKana, scriptOf } from "@/lib/kana/hiragana";

// kept here instead of importing the kanji data so settings stay light
export const KANJI_LESSON_COUNT = 25;

export type PracticeMode = "mixed" | "words" | "random" | "sentences";
// 2-4 is only used by tower floors, settings still offer the three below
export type LengthRange = "2-3" | "2-4" | "2-5" | "3-7";
export type TimerPace = "off" | "relaxed" | "normal" | "fast";
export type ThemePref = "light" | "dark" | "system";
// which script practice uses. enabledChars keeps a selection for both
export type ScriptPref = "hiragana" | "katakana" | "both";
export type KanjiMode = "mixed" | "meaning" | "reading" | "pick";

export interface Settings {
  questionsPerRound: 5 | 10 | 15 | 20;
  lengthRange: LengthRange;
  mode: PracticeMode;
  timerPace: TimerPace;
  showNumbers: boolean;
  theme: ThemePref;
  script: ScriptPref;
  sound: boolean;
  voiceName: string; // "" = pick the most natural one automatically
  voiceRate: "normal" | "slow";
  speakAnswers: boolean; // say the word out loud after you answer in practice
  autoFocus: boolean;
  shortcuts: boolean;
  enabledChars: string[];
  kanjiLessons: number[]; // which kanji lessons practice pulls from
  kanjiMode: KanjiMode;
}

export const DEFAULT_SETTINGS: Settings = {
  questionsPerRound: 10,
  lengthRange: "2-5",
  mode: "mixed",
  timerPace: "normal",
  showNumbers: true,
  theme: "system",
  script: "hiragana",
  sound: true,
  voiceName: "",
  voiceRate: "normal",
  speakAnswers: false,
  autoFocus: true,
  shortcuts: true,
  enabledChars: [...BASIC_KANA_LIST, ...KATAKANA_BASIC_LIST, LONG_MARK],
  kanjiLessons: [1],
  kanjiMode: "mixed",
};

// katakana everyone starts with: the basic 46 plus ー, since so many words use it
export const KATAKANA_STARTER = [...KATAKANA_BASIC_LIST, LONG_MARK];

export const LENGTH_BOUNDS: Record<LengthRange, [number, number]> = {
  "2-3": [2, 3],
  "2-4": [2, 4],
  "2-5": [2, 5],
  "3-7": [3, 7],
};

const pick = <T,>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

function lessons(v: unknown): number[] {
  const ids = Array.isArray(v) ? [...new Set(v.filter((x): x is number => Number.isInteger(x) && x >= 1 && x <= KANJI_LESSON_COUNT))].sort((a, b) => a - b) : [];
  return ids.length ? ids : [...DEFAULT_SETTINGS.kanjiLessons];
}

// never trust localStorage. anything odd falls back to defaults
export function sanitizeSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  if (!raw || typeof raw !== "object") return { ...d, enabledChars: [...d.enabledChars], kanjiLessons: [...d.kanjiLessons] };
  const r = raw as Record<string, unknown>;
  let enabled = Array.isArray(r.enabledChars)
    ? r.enabledChars.filter((k): k is string => typeof k === "string" && isKnownKana(k))
    : [...d.enabledChars];
  // each script needs something on. saves from before katakana get the katakana basics
  if (!enabled.some((k) => scriptOf(k) === "hiragana")) enabled.push(...BASIC_KANA_LIST);
  if (!enabled.some((k) => scriptOf(k) === "katakana")) enabled.push(...KATAKANA_STARTER);
  enabled = ALL_KANA_LIST.filter((k) => enabled.includes(k)); // dedupe + keep chart order
  return {
    questionsPerRound: pick(r.questionsPerRound, [5, 10, 15, 20] as const, d.questionsPerRound),
    lengthRange: pick(r.lengthRange, ["2-3", "2-5", "3-7"] as const, d.lengthRange),
    mode: pick(r.mode, ["mixed", "words", "random", "sentences"] as const, d.mode),
    timerPace: pick(r.timerPace, ["off", "relaxed", "normal", "fast"] as const, d.timerPace),
    showNumbers: bool(r.showNumbers, d.showNumbers),
    theme: pick(r.theme, ["light", "dark", "system"] as const, d.theme),
    script: pick(r.script, ["hiragana", "katakana", "both"] as const, d.script),
    sound: bool(r.sound, d.sound),
    voiceName: typeof r.voiceName === "string" ? r.voiceName.slice(0, 120) : d.voiceName,
    voiceRate: pick(r.voiceRate, ["normal", "slow"] as const, d.voiceRate),
    speakAnswers: bool(r.speakAnswers, d.speakAnswers),
    autoFocus: bool(r.autoFocus, d.autoFocus),
    shortcuts: bool(r.shortcuts, d.shortcuts),
    enabledChars: enabled,
    kanjiLessons: lessons(r.kanjiLessons),
    kanjiMode: pick(r.kanjiMode, ["mixed", "meaning", "reading", "pick"] as const, d.kanjiMode),
  };
}

// the kana practice should use right now: your selection, narrowed to the script you picked
export function activeChars(s: Pick<Settings, "enabledChars"> & { script?: ScriptPref }): string[] {
  if (!s.script || s.script === "both") return s.enabledChars;
  const own = s.enabledChars.filter((k) => scriptOf(k) === s.script);
  return own.length ? own : s.script === "katakana" ? KATAKANA_STARTER : BASIC_KANA_LIST;
}
