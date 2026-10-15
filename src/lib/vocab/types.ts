export type VocabCategory =
  | "animals"
  | "nature"
  | "food"
  | "body"
  | "people"
  | "home"
  | "places"
  | "time"
  | "adjectives"
  | "verbs"
  | "numbers"
  | "phrases"
  | "misc";

export interface VocabWord {
  id: string; // stable id, the kana itself for now
  kana: string;
  romaji: string; // canonical, derived from the kana table
  meaning: string;
  category: VocabCategory;
  // future: jlpt level, kanji, audio url, example sentence
  jlpt?: "N5" | "N4" | "N3" | "N2" | "N1";
}
