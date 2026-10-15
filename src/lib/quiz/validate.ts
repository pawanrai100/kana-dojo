import { getKana, splitKana } from "@/lib/kana/hiragana";

export interface AnswerCheck {
  correct: boolean;
  normalized: string;
  // index of each kana unit the learner got wrong (empty when correct)
  missedIdx: number[];
}

// lowercase, strip spaces/dashes, unify apostrophes
export function normalizeAnswer(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[\s\-_.・]/g, "")
    .trim();
}

// every spelling we accept for one kana unit, given what comes next
export function acceptedSpellings(kana: string, next?: string): string[] {
  const c = getKana(kana);
  if (!c) throw new Error(`unknown kana: ${kana}`);
  if (kana === "ん") {
    // n, nn and n' are all standard ways to type ん
    return ["n'", "nn", "n"];
  }
  void next;
  return c.romaji;
}

const MAX_SLICE = 4;

// edit-style alignment between kana units and typed romaji.
// cost 0 = typed a valid spelling, cost 1 = wrong / missing / extra.
// gives us which kana were misread instead of failing the whole word blindly
export function checkAnswer(kanaText: string, input: string): AnswerCheck {
  const units = splitKana(kanaText);
  const s = normalizeAnswer(input);
  const n = units.length;
  const L = s.length;
  const opts = units.map((u, i) => acceptedSpellings(u, units[i + 1]));

  const INF = 1e9;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(L + 1).fill(INF));
  // back[i][j] = [prevI, prevJ, missedUnit | -1]
  const back: [number, number, number][][] = Array.from({ length: n + 1 }, () =>
    new Array(L + 1).fill(null),
  );
  dp[0][0] = 0;

  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= L; j++) {
      const cur = dp[i][j];
      if (cur >= INF) continue;
      const relax = (ni: number, nj: number, cost: number, missed: number) => {
        if (cur + cost < dp[ni][nj]) {
          dp[ni][nj] = cur + cost;
          back[ni][nj] = [i, j, missed];
        }
      };
      if (i < n) {
        for (const o of opts[i]) {
          if (s.startsWith(o, j)) relax(i + 1, j + o.length, 0, -1);
        }
        // wrong reading for this unit, eats 0..4 chars
        for (let k = 0; k <= MAX_SLICE && j + k <= L; k++) relax(i + 1, j + k, 1, i);
      }
      // stray extra character in the answer
      if (j < L) relax(i, j + 1, 1, -1);
    }
  }

  const missed = new Set<number>();
  let i = n;
  let j = L;
  while (i > 0 || j > 0) {
    const b = back[i][j];
    if (!b) break;
    if (b[2] >= 0) missed.add(b[2]);
    [i, j] = [b[0], b[1]];
  }

  return {
    correct: dp[n][L] === 0 && L > 0,
    normalized: s,
    missedIdx: [...missed].sort((a, b) => a - b),
  };
}
