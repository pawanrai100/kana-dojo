import { splitKana, toRomaji } from "@/lib/kana/hiragana";
import type { Question } from "./types";

// sentences are split into words. particles get their own reading:
// は is wa, へ is e, を is o (wo still accepted)
export interface Token {
  kana: string;
  particle?: boolean;
}

const PARTICLE_READING: Record<string, string[]> = { は: ["wa"], へ: ["e"], を: ["o", "wo"] };

export function tokenRomaji(t: Token): string {
  if (t.particle && PARTICLE_READING[t.kana]) return PARTICLE_READING[t.kana][0];
  return toRomaji(t.kana);
}

export function tokensRomaji(tokens: Token[]): string {
  return tokens.map(tokenRomaji).join(" ");
}

// which unit indexes are particles, and their special spellings
export function particleInfo(q: Pick<Question, "tokens">): { units: Set<number>; overrides: Record<number, string[]> } {
  const units = new Set<number>();
  const overrides: Record<number, string[]> = {};
  let i = 0;
  for (const t of q.tokens ?? []) {
    const n = splitKana(t.kana).length;
    if (t.particle) {
      for (let j = 0; j < n; j++) units.add(i + j);
      if (n === 1 && PARTICLE_READING[t.kana]) overrides[i] = PARTICLE_READING[t.kana];
    }
    i += n;
  }
  return { units, overrides };
}
