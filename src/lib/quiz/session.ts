import { isKnownKana, splitKana, toRomaji } from "@/lib/kana/hiragana";
import { tokensRomaji } from "./tokens";
import type { AnswerState, Question, Round } from "./types";

// an unfinished round we can resume after a refresh
export interface ActiveRound {
  round: Round;
  answers: AnswerState[];
  activeIndex: number;
  startedAt: number;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

function question(v: unknown): Question | null {
  if (!isObj(v) || typeof v.kana !== "string" || typeof v.id !== "string") return null;
  const chars = splitKana(v.kana);
  // reject anything we don't teach, never trust stored data
  if (chars.length === 0 || !chars.every(isKnownKana)) return null;
  const difficulty = ["easy", "medium", "hard"].includes(v.difficulty as string)
    ? (v.difficulty as Question["difficulty"])
    : "medium";
  // sentences keep their words; they must spell out exactly the same kana
  const tokens = Array.isArray(v.tokens)
    ? v.tokens.filter((t): t is { kana: string; particle?: boolean } => isObj(t) && typeof t.kana === "string").map((t) => ({ kana: t.kana, particle: t.particle === true || undefined }))
    : undefined;
  const goodTokens = tokens && tokens.length && tokens.map((t) => t.kana).join("") === v.kana ? tokens : undefined;
  return {
    id: v.id,
    kind: v.kind === "word" ? "word" : v.kind === "sentence" && goodTokens ? "sentence" : "random",
    kana: v.kana,
    romaji: goodTokens ? tokensRomaji(goodTokens) : toRomaji(v.kana),
    tokens: goodTokens,
    chars,
    meaning: typeof v.meaning === "string" ? v.meaning : undefined,
    wordId: typeof v.wordId === "string" ? v.wordId : undefined,
    difficulty,
    timeLimitSec: typeof v.timeLimitSec === "number" && v.timeLimitSec > 0 ? v.timeLimitSec : null,
    retry: v.retry === true ? true : undefined,
  };
}

function answer(v: unknown): AnswerState {
  const o = isObj(v) ? v : {};
  return {
    value: typeof o.value === "string" ? o.value.slice(0, 40) : "",
    locked: o.locked === true,
    timedOut: o.timedOut === true,
    timeUsedMs: typeof o.timeUsedMs === "number" && o.timeUsedMs >= 0 ? o.timeUsedMs : 0,
  };
}

export function sanitizeActiveRound(raw: unknown): ActiveRound | null {
  if (!isObj(raw) || !isObj(raw.round)) return null;
  const r = raw.round;
  if (typeof r.id !== "string" || !Array.isArray(r.questions)) return null;
  const questions = r.questions.map(question);
  if (questions.length === 0 || questions.some((q) => !q)) return null;
  const answers = Array.isArray(raw.answers) ? raw.answers.map(answer) : [];
  while (answers.length < questions.length) answers.push(answer(null));
  const mode = ["mixed", "words", "random", "sentences"].includes(r.mode as string) ? (r.mode as Round["mode"]) : "mixed";
  const activeIndex =
    typeof raw.activeIndex === "number" ? Math.min(Math.max(0, Math.floor(raw.activeIndex)), questions.length - 1) : 0;
  return {
    round: {
      id: r.id,
      createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
      mode,
      questions: questions as Question[],
      notice: typeof r.notice === "string" ? r.notice : undefined,
      drill: r.drill === true ? true : undefined,
      focus: Array.isArray(r.focus) ? r.focus.filter((k): k is string => typeof k === "string" && isKnownKana(k)).slice(0, 8) : undefined,
    },
    answers: answers.slice(0, questions.length),
    activeIndex,
    startedAt: typeof raw.startedAt === "number" ? raw.startedAt : Date.now(),
  };
}
