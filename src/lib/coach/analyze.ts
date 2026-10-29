import { ALL_KANA_LIST, LOOKALIKES, SMALL_TSU, getKana, groupOf, readingOf } from "@/lib/kana/hiragana";

// the kinds of mistakes worth tracking beyond single kana. each is a habit
// you can fix once you know about it, so the coach names them and drills them

export type SkillId = "marks" | "combos" | "small-tsu" | "long-vowels" | "n-sound" | "lookalikes" | "particles";

export interface SkillInfo {
  id: SkillId;
  label: string;
  tip: string;
}

export const SKILLS: Record<SkillId, SkillInfo> = {
  marks: {
    id: "marks",
    label: "Dakuten marks",
    tip: "Check the corner for ゛ or ゜ before you answer. か is ka, が is ga, ぱ (circle) is pa.",
  },
  combos: {
    id: "combos",
    label: "Combos",
    tip: "A small ゃ ゅ ょ joins the kana before it into one sound: きゃ is kya, not kiya.",
  },
  "small-tsu": {
    id: "small-tsu",
    label: "Small っ",
    tip: "Small っ means pause and double the next consonant: きって is kitte.",
  },
  "long-vowels": {
    id: "long-vowels",
    label: "Long vowels",
    tip: "おう, えい and doubled vowels stretch the sound. Type every vowel you see: おおきい is ookii.",
  },
  "n-sound": {
    id: "n-sound",
    label: "The ん sound",
    tip: "ん is its own beat. Before a vowel, type n' or nn so it doesn't blend: きんえん is kin'en.",
  },
  lookalikes: {
    id: "lookalikes",
    label: "Lookalikes",
    tip: "Some kana are near twins (ね れ わ, ぬ め, る ろ). Look for the loop or the tail at the end of the last stroke.",
  },
  particles: {
    id: "particles",
    label: "Particles",
    tip: "As particles, は reads wa, へ reads e and を reads o.",
  },
};

// every way to type a kana, pointing back at the kana. "ji" maps to じ and ぢ
const BY_READING = new Map<string, string[]>();
for (const k of ALL_KANA_LIST) {
  const c = getKana(k);
  if (!c || k === SMALL_TSU) continue;
  for (const r of c.romaji) BY_READING.set(r, [...(BY_READING.get(r) ?? []), k]);
}
BY_READING.set("nn", ["ん"]);
BY_READING.set("n'", ["ん"]);

export function kanaForReading(typed: string): string[] {
  return BY_READING.get(typed) ?? [];
}

const LOOK_GROUP = new Map(LOOKALIKES.flatMap((g) => g.map((k) => [k, g] as const)));

const VOWEL_OF = (reading: string) => reading.at(-1) ?? "";

// is unit i the second half of a long vowel? (おう, えい, ああ, いい, うう, おお)
function isLongVowel(units: string[], i: number): boolean {
  if (i === 0) return false;
  const prev = VOWEL_OF(readingOf(units[i - 1]));
  const k = units[i];
  return (
    (k === "う" && (prev === "o" || prev === "u")) ||
    (k === "い" && (prev === "e" || prev === "i")) ||
    (k === "あ" && prev === "a") ||
    (k === "お" && prev === "o")
  );
}

// which habits a unit exercises
export function skillsOf(units: string[], i: number, particle = false): SkillId[] {
  const k = units[i];
  const out: SkillId[] = [];
  if (particle) out.push("particles");
  const g = groupOf(k)?.id;
  if (g === "dakuten") out.push("marks");
  if (g === "combos") {
    out.push("combos");
    if (getKana(k)?.row && /[gjbp]/.test(getKana(k)!.romaji[0][0])) out.push("marks");
  }
  if (k === SMALL_TSU) out.push("small-tsu");
  if (k === "ん") out.push("n-sound");
  if (LOOK_GROUP.has(k)) out.push("lookalikes");
  if (isLongVowel(units, i)) out.push("long-vowels");
  return out;
}

export interface AnswerAnalysis {
  // [kana shown, kana you read it as]
  confusions: [string, string][];
  // per habit: how many units tested it, how many of those you missed
  skills: Partial<Record<SkillId, { seen: number; missed: number }>>;
}

// look at one checked answer and work out what kind of slip it was
export function analyzeAnswer(units: string[], typed: string[], missedIdx: number[], particles: Set<number> = new Set()): AnswerAnalysis {
  const missed = new Set(missedIdx);
  const confusions: [string, string][] = [];
  const skills: AnswerAnalysis["skills"] = {};
  units.forEach((k, i) => {
    const wrong = missed.has(i);
    for (const sk of skillsOf(units, i, particles.has(i))) {
      // a lookalike only counts as a lookalike slip if you read it as its twin
      let slip = wrong;
      if (sk === "lookalikes") slip = wrong && kanaForReading(typed[i]).some((t) => t !== k && LOOK_GROUP.get(k)!.includes(t));
      // dropping either half of おお looks the same, so a dropped vowel just before counts too
      if (sk === "long-vowels") slip = wrong || (missed.has(i - 1) && !typed[i - 1]);
      const cur = skills[sk] ?? { seen: 0, missed: 0 };
      skills[sk] = { seen: cur.seen + 1, missed: cur.missed + (slip ? 1 : 0) };
    }
    if (!wrong || particles.has(i)) return;
    const as = kanaForReading(typed[i]).filter((t) => t !== k);
    if (as.length) confusions.push([k, as[0]]);
  });
  return { confusions, skills };
}
