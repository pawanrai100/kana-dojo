// shared kana types. katakana / dakuten sets plug into the same shape later

export type KanaScript = "hiragana" | "katakana";

export interface KanaChar {
  kana: string;
  // first entry is the canonical (hepburn) reading, rest are accepted variants
  romaji: string[];
  row: string; // row id, ex "k"
  script: KanaScript;
}

export interface KanaRow {
  id: string;
  label: string; // shown in the chart, ex "k-row"
  chars: string[];
}

export interface KanaSet {
  id: string;
  name: string;
  script: KanaScript;
  enabled: boolean; // v1 only ships hiragana-basic
  rows: KanaRow[];
  chars: KanaChar[];
}
