import type { KanaChar, KanaRow, KanaSet } from "./types";

// the 46 basic hiragana. no dakuten, handakuten or small kana in v1
const RAW: [string, string[], string][] = [
  ["あ", ["a"], "vowel"],
  ["い", ["i"], "vowel"],
  ["う", ["u"], "vowel"],
  ["え", ["e"], "vowel"],
  ["お", ["o"], "vowel"],
  ["か", ["ka"], "k"],
  ["き", ["ki"], "k"],
  ["く", ["ku"], "k"],
  ["け", ["ke"], "k"],
  ["こ", ["ko"], "k"],
  ["さ", ["sa"], "s"],
  ["し", ["shi", "si"], "s"],
  ["す", ["su"], "s"],
  ["せ", ["se"], "s"],
  ["そ", ["so"], "s"],
  ["た", ["ta"], "t"],
  ["ち", ["chi", "ti"], "t"],
  ["つ", ["tsu", "tu"], "t"],
  ["て", ["te"], "t"],
  ["と", ["to"], "t"],
  ["な", ["na"], "n"],
  ["に", ["ni"], "n"],
  ["ぬ", ["nu"], "n"],
  ["ね", ["ne"], "n"],
  ["の", ["no"], "n"],
  ["は", ["ha"], "h"],
  ["ひ", ["hi"], "h"],
  ["ふ", ["fu", "hu"], "h"],
  ["へ", ["he"], "h"],
  ["ほ", ["ho"], "h"],
  ["ま", ["ma"], "m"],
  ["み", ["mi"], "m"],
  ["む", ["mu"], "m"],
  ["め", ["me"], "m"],
  ["も", ["mo"], "m"],
  ["や", ["ya"], "y"],
  ["ゆ", ["yu"], "y"],
  ["よ", ["yo"], "y"],
  ["ら", ["ra"], "r"],
  ["り", ["ri"], "r"],
  ["る", ["ru"], "r"],
  ["れ", ["re"], "r"],
  ["ろ", ["ro"], "r"],
  ["わ", ["wa"], "w"],
  ["を", ["wo", "o"], "w"],
  // nn and n' are handled in validation so they can disambiguate ん before vowels
  ["ん", ["n"], "nn"],
];

export const HIRAGANA_ROWS: KanaRow[] = [
  { id: "vowel", label: "Vowels", chars: [] },
  { id: "k", label: "K-row", chars: [] },
  { id: "s", label: "S-row", chars: [] },
  { id: "t", label: "T-row", chars: [] },
  { id: "n", label: "N-row", chars: [] },
  { id: "h", label: "H-row", chars: [] },
  { id: "m", label: "M-row", chars: [] },
  { id: "y", label: "Y-row", chars: [] },
  { id: "r", label: "R-row", chars: [] },
  { id: "w", label: "W-row", chars: [] },
  { id: "nn", label: "ん", chars: [] },
];

export const HIRAGANA_BASIC: KanaChar[] = RAW.map(([kana, romaji, row]) => ({
  kana,
  romaji,
  row,
  script: "hiragana",
}));

for (const c of HIRAGANA_BASIC) {
  HIRAGANA_ROWS.find((r) => r.id === c.row)!.chars.push(c.kana);
}

export const HIRAGANA_BASIC_SET: KanaSet = {
  id: "hiragana-basic",
  name: "Hiragana (basic 46)",
  script: "hiragana",
  enabled: true,
  rows: HIRAGANA_ROWS,
  chars: HIRAGANA_BASIC,
};

export const BASIC_KANA_LIST: string[] = HIRAGANA_BASIC.map((c) => c.kana);
const BASIC_SET = new Set(BASIC_KANA_LIST);

const BY_KANA = new Map(HIRAGANA_BASIC.map((c) => [c.kana, c]));

export function getKana(kana: string): KanaChar | undefined {
  return BY_KANA.get(kana);
}

export function isBasicHiragana(kana: string): boolean {
  return BASIC_SET.has(kana);
}

// splits a string into kana units. v1 has no digraphs so one char = one unit
export function splitKana(text: string): string[] {
  return Array.from(text);
}

// true when every char in the word is inside the allowed set
export function usesOnly(word: string, allowed: Set<string>): boolean {
  return splitKana(word).every((k) => allowed.has(k));
}

// hepburn reading built straight from the kana table
export function toRomaji(word: string): string {
  return splitKana(word)
    .map((k, i, arr) => {
      const c = BY_KANA.get(k);
      if (!c) throw new Error(`unknown kana: ${k}`);
      // ん before a vowel or y gets an apostrophe so it stays readable (kin'en)
      if (k === "ん") {
        const next = arr[i + 1] ? BY_KANA.get(arr[i + 1]) : undefined;
        if (next && /^[aiueoy]/.test(next.romaji[0])) return "n'";
      }
      return c.romaji[0];
    })
    .join("");
}

// characters that look alike, used to bump timer + adaptive weight
export const LOOKALIKES: string[][] = [
  ["ぬ", "め"],
  ["ね", "れ", "わ"],
  ["る", "ろ"],
  ["さ", "ち", "き"],
  ["は", "ほ"],
  ["い", "り"],
  ["こ", "に"],
  ["あ", "お"],
  ["ま", "も"],
  ["く", "へ"],
  ["そ", "ろ"],
];

const LOOKALIKE_SET = new Set(LOOKALIKES.flat());
export function isLookalike(kana: string): boolean {
  return LOOKALIKE_SET.has(kana);
}
