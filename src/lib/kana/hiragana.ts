import type { KanaChar, KanaRow, KanaScript, KanaSet } from "./types";

// the 46 basic hiragana. dakuten, combos and small っ are further down
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

// dakuten (゛) and handakuten (゜): the same shapes with a voiced or p sound
const DAKUTEN_RAW: [string, string[], string][] = [
  ["が", ["ga"], "g"],
  ["ぎ", ["gi"], "g"],
  ["ぐ", ["gu"], "g"],
  ["げ", ["ge"], "g"],
  ["ご", ["go"], "g"],
  ["ざ", ["za"], "z"],
  ["じ", ["ji", "zi"], "z"],
  ["ず", ["zu"], "z"],
  ["ぜ", ["ze"], "z"],
  ["ぞ", ["zo"], "z"],
  ["だ", ["da"], "d"],
  ["ぢ", ["ji", "di"], "d"],
  ["づ", ["zu", "du"], "d"],
  ["で", ["de"], "d"],
  ["ど", ["do"], "d"],
  ["ば", ["ba"], "b"],
  ["び", ["bi"], "b"],
  ["ぶ", ["bu"], "b"],
  ["べ", ["be"], "b"],
  ["ぼ", ["bo"], "b"],
  ["ぱ", ["pa"], "p"],
  ["ぴ", ["pi"], "p"],
  ["ぷ", ["pu"], "p"],
  ["ぺ", ["pe"], "p"],
  ["ぽ", ["po"], "p"],
];

// combos (yoon): an i-sound kana plus a small ゃ ゅ ょ, read as one sound
const COMBO_BASES: [string, string, string[]][] = [
  // base kana, row id, spellings of the start (first is hepburn)
  ["き", "ky", ["ky"]],
  ["し", "sh", ["sh", "sy"]],
  ["ち", "ch", ["ch", "ty", "cy"]],
  ["に", "ny", ["ny"]],
  ["ひ", "hy", ["hy"]],
  ["み", "my", ["my"]],
  ["り", "ry", ["ry"]],
  ["ぎ", "gy", ["gy"]],
  ["じ", "j", ["j", "zy", "jy"]],
  ["び", "by", ["by"]],
  ["ぴ", "py", ["py"]],
];
const SMALL_Y: [string, string][] = [
  ["ゃ", "a"],
  ["ゅ", "u"],
  ["ょ", "o"],
];
const COMBO_RAW: [string, string[], string][] = COMBO_BASES.flatMap(([base, row, starts]) =>
  SMALL_Y.map(([small, v]): [string, string[], string] => [base + small, starts.map((st) => st + v), row]),
);

// small っ doubles the next consonant, so its spelling is worked out from the next kana
export const SMALL_TSU = "っ";
export const SMALL_TSU_K = "ッ";
// katakana long vowel mark: stretches the vowel before it (コーヒー = koohii)
export const LONG_MARK = "ー";
const SOKUON_RAW: [string, string[], string][] = [[SMALL_TSU, [""], "xtsu"]];

export function isSmallTsu(k: string | undefined): boolean {
  return k === SMALL_TSU || k === SMALL_TSU_K;
}

// katakana sit exactly 0x60 after their hiragana twins in unicode
export function toKatakana(s: string): string {
  return Array.from(s)
    .map((ch) => (ch >= "ぁ" && ch <= "ゖ" ? String.fromCharCode(ch.charCodeAt(0) + 0x60) : ch))
    .join("");
}
export function toHiragana(s: string): string {
  return Array.from(s)
    .map((ch) => (ch >= "ァ" && ch <= "ヶ" ? String.fromCharCode(ch.charCodeAt(0) - 0x60) : ch))
    .join("");
}
const kataRaw = (raw: [string, string[], string][]): [string, string[], string][] =>
  raw.map(([k, r, row]) => [toKatakana(k), r, `kt-${row}`]);

// sounds katakana needs for foreign words: small ァ ィ ゥ ェ ォ glue on like ゃ does
const KATA_EXTENDED_RAW: [string, string[], string][] = [
  ["ファ", ["fa"], "kt-f"],
  ["フィ", ["fi"], "kt-f"],
  ["フェ", ["fe"], "kt-f"],
  ["フォ", ["fo"], "kt-f"],
  ["ティ", ["ti", "thi"], "kt-ti"],
  ["ディ", ["di", "dhi"], "kt-ti"],
  ["トゥ", ["tu", "twu"], "kt-ti"],
  ["ドゥ", ["du", "dwu"], "kt-ti"],
  ["ウィ", ["wi"], "kt-wi"],
  ["ウェ", ["we"], "kt-wi"],
  ["ウォ", ["wo"], "kt-wi"],
  ["シェ", ["she"], "kt-she"],
  ["ジェ", ["je"], "kt-she"],
  ["チェ", ["che"], "kt-she"],
  ["ヴァ", ["va"], "kt-v"],
  ["ヴィ", ["vi"], "kt-v"],
  ["ヴ", ["vu"], "kt-v"],
  ["ヴェ", ["ve"], "kt-v"],
  ["ヴォ", ["vo"], "kt-v"],
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

const toChars = (raw: [string, string[], string][], script: KanaScript = "hiragana"): KanaChar[] =>
  raw.map(([kana, romaji, row]) => ({ kana, romaji, row, script }));

export const HIRAGANA_DAKUTEN = toChars(DAKUTEN_RAW);
export const HIRAGANA_COMBOS = toChars(COMBO_RAW);
export const HIRAGANA_SOKUON = toChars(SOKUON_RAW);

export const KATAKANA_BASIC = toChars(kataRaw(RAW), "katakana");
export const KATAKANA_DAKUTEN = toChars(kataRaw(DAKUTEN_RAW), "katakana");
export const KATAKANA_COMBOS = toChars(kataRaw(COMBO_RAW), "katakana");
export const KATAKANA_SOKUON = toChars(
  [
    [SMALL_TSU_K, [""], "kt-xtsu"],
    [LONG_MARK, [""], "kt-long"],
  ],
  "katakana",
);
export const KATAKANA_EXTENDED = toChars(KATA_EXTENDED_RAW, "katakana");
export const KATAKANA_BASIC_LIST: string[] = KATAKANA_BASIC.map((c) => c.kana);

const rowsOf = (chars: KanaChar[], labels: Record<string, string>): KanaRow[] =>
  Object.entries(labels).map(([id, label]) => ({ id, label, chars: chars.filter((c) => c.row === id).map((c) => c.kana) }));

// basic/dakuten/combos/sokuon are hiragana, k-* the katakana copies
export type KanaGroupId = "basic" | "dakuten" | "combos" | "sokuon" | "k-basic" | "k-dakuten" | "k-combos" | "k-sokuon" | "k-extended";
export type KanaGroupKind = "basic" | "dakuten" | "combos" | "sokuon" | "extended";

export interface KanaGroup {
  id: KanaGroupId;
  kind: KanaGroupKind;
  script: KanaScript;
  label: string;
  blurb: string;
  rows: KanaRow[];
  chars: string[];
}

const COMBO_ROW_LABELS = { ky: "KY", sh: "SH", ch: "CH", ny: "NY", hy: "HY", my: "MY", ry: "RY", gy: "GY", j: "J", by: "BY", py: "PY" };
const DAKUTEN_ROW_LABELS = { g: "G-row", z: "Z-row", d: "D-row", b: "B-row", p: "P-row" };
const kt = (labels: Record<string, string>) => Object.fromEntries(Object.entries(labels).map(([k, v]) => [`kt-${k}`, v]));

export const HIRAGANA_GROUPS: KanaGroup[] = [
  { id: "basic", kind: "basic", script: "hiragana", label: "Basic 46", blurb: "The core hiragana everything else is built on.", rows: HIRAGANA_ROWS, chars: BASIC_KANA_LIST },
  {
    id: "dakuten",
    kind: "dakuten",
    script: "hiragana",
    label: "Dakuten ゛ ゜",
    blurb: "Two little marks (゛) make k into g, s into z, t into d, h into b. A circle (゜) makes h into p.",
    rows: rowsOf(HIRAGANA_DAKUTEN, DAKUTEN_ROW_LABELS),
    chars: HIRAGANA_DAKUTEN.map((c) => c.kana),
  },
  {
    id: "combos",
    kind: "combos",
    script: "hiragana",
    label: "Combos ゃ ゅ ょ",
    blurb: "An i-sound kana plus a small ゃ, ゅ or ょ blends into one sound: き + ゃ = kya.",
    rows: rowsOf(HIRAGANA_COMBOS, COMBO_ROW_LABELS),
    chars: HIRAGANA_COMBOS.map((c) => c.kana),
  },
  {
    id: "sokuon",
    kind: "sokuon",
    script: "hiragana",
    label: "Small っ",
    blurb: "A small っ is a tiny pause that doubles the next consonant: きって = kitte.",
    rows: rowsOf(HIRAGANA_SOKUON, { xtsu: "Small っ" }),
    chars: [SMALL_TSU],
  },
];

export const KATAKANA_ROWS: KanaRow[] = HIRAGANA_ROWS.map((r) => ({ id: `kt-${r.id}`, label: r.id === "nn" ? "ン" : r.label, chars: r.chars.map(toKatakana) }));

export const KATAKANA_GROUPS: KanaGroup[] = [
  { id: "k-basic", kind: "basic", script: "katakana", label: "Basic 46", blurb: "The blocky twin of hiragana, used for foreign words, names and loud sounds.", rows: KATAKANA_ROWS, chars: KATAKANA_BASIC_LIST },
  {
    id: "k-dakuten",
    kind: "dakuten",
    script: "katakana",
    label: "Dakuten ゛ ゜",
    blurb: "Same marks as hiragana: カ is ka, ガ is ga, パ (circle) is pa.",
    rows: rowsOf(KATAKANA_DAKUTEN, kt(DAKUTEN_ROW_LABELS)),
    chars: KATAKANA_DAKUTEN.map((c) => c.kana),
  },
  {
    id: "k-combos",
    kind: "combos",
    script: "katakana",
    label: "Combos ャ ュ ョ",
    blurb: "Works just like hiragana: キ + small ャ = kya.",
    rows: rowsOf(KATAKANA_COMBOS, kt(COMBO_ROW_LABELS)),
    chars: KATAKANA_COMBOS.map((c) => c.kana),
  },
  {
    id: "k-sokuon",
    kind: "sokuon",
    script: "katakana",
    label: "Small ッ + long ー",
    blurb: "ッ doubles the next consonant like っ. The bar ー stretches the vowel before it: コーヒー = koohii.",
    rows: rowsOf(KATAKANA_SOKUON, { "kt-xtsu": "Small ッ", "kt-long": "Long ー" }),
    chars: [SMALL_TSU_K, LONG_MARK],
  },
  {
    id: "k-extended",
    kind: "extended",
    script: "katakana",
    label: "Foreign sounds",
    blurb: "Extra combos for sounds Japanese didn't have: ファ = fa, ティ = ti, ヴ = vu.",
    rows: rowsOf(KATAKANA_EXTENDED, { "kt-f": "F", "kt-ti": "T / D", "kt-wi": "W", "kt-she": "SH / J / CH", "kt-v": "V" }),
    chars: KATAKANA_EXTENDED.map((c) => c.kana),
  },
];

// the chart, settings and practice all work off these groups
export const KANA_GROUPS: KanaGroup[] = [...HIRAGANA_GROUPS, ...KATAKANA_GROUPS];

export const ALL_KANA_LIST: string[] = KANA_GROUPS.flatMap((g) => g.chars);
const ALL_SET = new Set(ALL_KANA_LIST);

const BY_KANA = new Map(
  [...HIRAGANA_BASIC, ...HIRAGANA_DAKUTEN, ...HIRAGANA_COMBOS, ...HIRAGANA_SOKUON, ...KATAKANA_BASIC, ...KATAKANA_DAKUTEN, ...KATAKANA_COMBOS, ...KATAKANA_SOKUON, ...KATAKANA_EXTENDED].map((c) => [c.kana, c]),
);
const ROW_LABEL = new Map(KANA_GROUPS.flatMap((g) => g.rows).map((r) => [r.id, r]));

export function getRow(id: string): KanaRow | undefined {
  return ROW_LABEL.get(id);
}

const GROUP_OF = new Map(KANA_GROUPS.flatMap((g) => g.chars.map((k) => [k, g] as const)));
export function groupOf(kana: string): KanaGroup | undefined {
  return GROUP_OF.get(kana);
}

export function scriptOf(kana: string): KanaScript | undefined {
  return BY_KANA.get(kana)?.script;
}

export function getKana(kana: string): KanaChar | undefined {
  return BY_KANA.get(kana);
}

export function isBasicHiragana(kana: string): boolean {
  return BASIC_SET.has(kana);
}

// any unit we teach, in either script
export function isKnownKana(kana: string): boolean {
  return ALL_SET.has(kana);
}

const SMALL_JOIN = new Set(["ゃ", "ゅ", "ょ", "ャ", "ュ", "ョ", "ァ", "ィ", "ゥ", "ェ", "ォ"]);

// splits a string into kana units. a small ゃ ゅ ょ (or ァ ィ...) joins the kana before it (きゃ is one sound)
export function splitKana(text: string): string[] {
  const out: string[] = [];
  for (const ch of Array.from(text)) {
    const prev = out[out.length - 1];
    if (SMALL_JOIN.has(ch) && prev && (BY_KANA.has(prev + ch) || !BY_KANA.has(ch))) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

// the vowel a ー stretches: whatever the unit before it ends on
export function longVowelOf(prev: string | undefined): string | undefined {
  const r = prev ? BY_KANA.get(prev)?.romaji[0] : undefined;
  const v = r?.at(-1);
  return v && "aiueo".includes(v) ? v : undefined;
}

// the consonant(s) a small っ turns into before this kana, or [] if っ can't go there
export function sokuonSpellings(next: string | undefined): string[] {
  const c = next ? BY_KANA.get(next) : undefined;
  if (!c || isSmallTsu(next) || next === "ん" || next === "ン" || next === LONG_MARK) return [];
  const firsts = new Set<string>();
  for (const r of c.romaji) {
    if (!/^[bcdfghjkmprstvz]/.test(r)) continue;
    // ch doubles as tch in hepburn, people also type cch
    if (r.startsWith("ch")) firsts.add("t").add("c");
    else firsts.add(r[0]);
  }
  return [...firsts];
}

// kana a small っ can sit in front of in a natural-looking word
export function canFollowSokuon(kana: string): boolean {
  const c = BY_KANA.get(kana);
  return !!c && /^[kstcp]/.test(c.romaji[0]) && !isSmallTsu(kana);
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
      if (k === "ん" || k === "ン") {
        const next = arr[i + 1] ? BY_KANA.get(arr[i + 1]) : undefined;
        if (next && /^[aiueoy]/.test(next.romaji[0])) return "n'";
      }
      // small っ: the next consonant doubled (kitte), ch becomes tch (matchi)
      if (isSmallTsu(k)) return sokuonSpellings(arr[i + 1])[0] ?? "";
      if (k === LONG_MARK) return longVowelOf(arr[i - 1]) ?? "";
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
  // ゛ vs ゜ is an easy slip
  ["ば", "ぱ"],
  ["び", "ぴ"],
  ["ぶ", "ぷ"],
  ["べ", "ぺ"],
  ["ぼ", "ぽ"],
  ["じ", "ぢ"],
  ["ず", "づ"],
  ["しゃ", "じゃ"],
  ["しょ", "じょ"],
  // katakana has its own nasty twins
  ["シ", "ツ"],
  ["ソ", "ン"],
  ["ク", "ケ", "タ"],
  ["ウ", "ワ", "フ"],
  ["チ", "テ"],
  ["ス", "ヌ"],
  ["コ", "ユ", "ロ"],
  ["ア", "マ"],
  ["ナ", "メ"],
  ["ノ", "メ"],
  ["ル", "レ"],
  ["ヨ", "ヲ"],
  ["カ", "ヤ"],
  ["バ", "パ"],
  ["ビ", "ピ"],
  ["ブ", "プ"],
  ["ベ", "ペ"],
  ["ボ", "ポ"],
  ["シャ", "ジャ"],
];

const LOOKALIKE_SET = new Set(LOOKALIKES.flat());
export function isLookalike(kana: string): boolean {
  return LOOKALIKE_SET.has(kana);
}

// short label for what's switched on, for badges
export function describeSelection(enabled: string[]): string {
  const set = new Set(enabled);
  const scripts = new Set(enabled.map((k) => scriptOf(k)));
  const pool = KANA_GROUPS.filter((g) => scripts.has(g.script));
  const groups = pool.filter((g) => g.chars.every((k) => set.has(k)));
  const name = scripts.size > 1 ? "kana" : scripts.has("katakana") ? "katakana" : "hiragana";
  if (groups.length === pool.length) return `All ${name}`;
  const whole = groups.reduce((n, g) => n + g.chars.length, 0);
  const prefix = scripts.size > 1 ? "" : scripts.has("katakana") ? "Katakana " : "";
  if (whole === set.size) return prefix + groups.map((g) => (g.kind === "basic" ? "Basic 46" : g.label.split(" ")[0])).join(" + ");
  return `${set.size} ${name}`;
}

// what to print for a kana's sound. small っ has none of its own
export function readingOf(kana: string): string {
  if (isSmallTsu(kana)) return "pause";
  if (kana === LONG_MARK) return "long";
  return BY_KANA.get(kana)?.romaji[0] ?? "";
}
