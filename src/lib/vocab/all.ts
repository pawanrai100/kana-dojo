import { HIRAGANA_VOCAB } from "./hiragana-words";
import { KATAKANA_VOCAB } from "./katakana-words";
import type { VocabWord } from "./types";

// every word we know, both scripts. rounds only pick ones whose kana are switched on
export const ALL_VOCAB: VocabWord[] = [...HIRAGANA_VOCAB, ...KATAKANA_VOCAB];
