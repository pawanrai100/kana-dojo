import { SMALL_TSU, readingOf } from "@/lib/kana/hiragana";
import { checkQuestion } from "@/lib/quiz/validate";
import { particleInfo } from "@/lib/quiz/tokens";
import type { Question } from "@/lib/quiz/types";
import { SKILLS, analyzeAnswer, type SkillId } from "./analyze";
import { trickFor, twinDiff } from "./tricks";

// after a lost tower floor: what went wrong, a memory trick for each kana you
// missed, how to tell apart the twins you mixed up, and what to drill

export interface Trick {
  kana: string;
  reading: string;
  readAs?: { kana: string; reading: string }; // the kana your answer matched instead
  trick: string;
  twin?: { kana: string; reading: string; diff: string };
  misses: number;
}

export type Cause = "clock" | "twins" | "marks" | "combos" | "small-tsu" | "particles" | "mixed" | "clean";

export interface Debrief {
  cause: Cause;
  headline: string;
  advice: string;
  tricks: Trick[];
  habits: { label: string; tip: string }[];
  timeouts: number;
  drill: string[]; // kana to practise next
}

export interface Answered {
  q: Question;
  value: string;
  timedOut: boolean;
}

const HEADLINES: Record<Cause, [string, string]> = {
  clock: [
    "The clock beat you, not the kana.",
    "You knew more than the timer let you show. Start typing the first sound the moment you see it, and don't stop to double-check the whole word first.",
  ],
  twins: [
    "The lookalikes got you.",
    "You read a few kana as their twins. Look at the end of the last stroke: that's where a loop, a tail or an extra line gives it away.",
  ],
  marks: [
    "Those tiny marks matter.",
    "Before you type, glance at the top right corner. Two dashes ゛ or a circle ゜ change the whole sound.",
  ],
  combos: [
    "Combos tripped you up.",
    "A small ゃ ゅ ょ isn't its own sound. It melts into the kana before it, so きゃ is one quick beat: kya.",
  ],
  "small-tsu": [
    "The small っ snuck past you.",
    "A small っ is a pause. Don't read it as tsu: double the next consonant instead, like きって = kitte.",
  ],
  particles: [
    "Particles play by their own rules.",
    "When は, へ and を are particles, they read wa, e and o. Spot the little word between the bigger ones.",
  ],
  mixed: ["A few kana slipped. Let's lock them in.", "Here's a trick for each one you missed. Read them once, then drill them while they're fresh."],
  clean: ["So close.", "You only slipped once or twice. Run it back while your hands remember."],
};

export function debrief(items: Answered[], maxTricks = 4): Debrief {
  const byKana = new Map<string, Trick>();
  const confusions: [string, string][] = [];
  const skills: Partial<Record<SkillId, { seen: number; missed: number }>> = {};
  let timeouts = 0;
  let misses = 0;

  for (const { q, value, timedOut } of items) {
    const check = checkQuestion(q, value);
    if (check.correct) continue;
    misses++;
    if (timedOut) timeouts++;
    const particles = particleInfo(q).units;
    const a = analyzeAnswer(q.chars, check.typed, check.missedIdx, particles);
    confusions.push(...a.confusions);
    for (const [sk, s] of Object.entries(a.skills)) {
      const cur = skills[sk as SkillId] ?? { seen: 0, missed: 0 };
      skills[sk as SkillId] = { seen: cur.seen + s.seen, missed: cur.missed + s.missed };
    }
    for (const i of check.missedIdx) {
      const k = q.chars[i];
      if (particles.has(i)) continue;
      const prev = byKana.get(k);
      if (prev) prev.misses++;
      else byKana.set(k, { kana: k, reading: readingOf(k), trick: trickFor(k), misses: 1 });
    }
  }

  // what you read it as, and the twin tip when that was its lookalike
  for (const [k, as] of confusions) {
    const t = byKana.get(k);
    if (!t) continue;
    t.readAs ??= { kana: as, reading: readingOf(as) };
    const diff = twinDiff(k, as);
    if (diff && !t.twin) t.twin = { kana: as, reading: readingOf(as), diff };
  }

  const tricks = [...byKana.values()].sort((a, b) => Number(!!b.twin) - Number(!!a.twin) || b.misses - a.misses).slice(0, maxTricks);

  const slipped = (Object.entries(skills) as [SkillId, { missed: number }][]).filter(([, s]) => s.missed > 0).sort((a, b) => b[1].missed - a[1].missed);
  const twins = confusions.filter(([k, as]) => twinDiff(k, as)).length;
  const top = slipped[0]?.[0];

  let cause: Cause;
  if (misses === 0) cause = "clean";
  else if (timeouts * 2 >= misses) cause = "clock";
  else if (twins >= 2 || (twins >= 1 && misses <= 2)) cause = "twins";
  else if (top === "marks" || top === "combos" || top === "small-tsu" || top === "particles") cause = top;
  else cause = misses <= 2 ? "clean" : "mixed";

  const [headline, advice] = HEADLINES[cause];
  // the cause already explains its own habit, so only list the others
  const habits = slipped
    .map(([id]) => id)
    .filter((id) => id !== cause && !(cause === "twins" && id === "lookalikes"))
    .slice(0, 2)
    .map((id) => ({ label: SKILLS[id].label, tip: SKILLS[id].tip }));

  const drill = [...new Set([...byKana.keys(), ...tricks.flatMap((t) => (t.twin ? [t.twin.kana] : []))])];
  // small っ needs something to double, or the drill has nothing to build
  if (drill.includes(SMALL_TSU)) for (const k of ["か", "た", "さ", "ぱ"]) if (!drill.includes(k)) drill.push(k);
  return { cause, headline, advice, tricks, habits, timeouts, drill };
}
