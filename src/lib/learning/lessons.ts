export interface Phrase {
  id: string;
  japanese: string;
  speech: string;
  reading: string;
  meaning: string;
  note: string;
}
export interface ConversationTurn {
  prompt: string;
  speech: string;
  meaning: string;
  hint: string;
  model: string;
  reading: string;
  accepted: string[];
}
export interface SpeakingLesson {
  id: string;
  title: string;
  goal: string;
  setting: string;
  phrases: Phrase[];
  turns: ConversationTurn[];
}

// A small, explicit curriculum. Models use polite Japanese appropriate for
// a first meeting or a customer speaking to staff. No generated lesson text.
export const SPEAKING_LESSONS: SpeakingLesson[] = [
  {
    id: "introductions", title: "Meet someone", goal: "Introduce yourself and greet someone you have just met.",
    setting: "You meet someone at a language exchange. Use the sample name Hana, or say your own name aloud.",
    phrases: [
      { id: "hello", japanese: "こんにちは。", speech: "こんにちは。", reading: "konnichiwa", meaning: "Hello.", note: "A daytime greeting. The final は is pronounced wa." },
      { id: "name", japanese: "はなです。", speech: "ハナです。", reading: "Hana desu", meaning: "I'm Hana.", note: "Replace Hana with your name. You can introduce yourself without わたしは." },
      { id: "nice", japanese: "よろしくおねがいします。", speech: "よろしくお願いします。", reading: "yoroshiku onegaishimasu", meaning: "Nice to meet you. (A conventional introduction.)", note: "An expression used when starting a relationship or working together; its meaning depends on the situation." },
    ],
    turns: [
      { prompt: "こんにちは。", speech: "こんにちは。", meaning: "Hello.", hint: "Greet them back.", model: "こんにちは。", reading: "konnichiwa", accepted: ["こんにちは", "konnichiwa", "konnitiwa"] },
      { prompt: "おなまえは？", speech: "お名前は？", meaning: "What's your name?", hint: "For typed practice, introduce yourself as Hana. For spoken practice, use your own name.", model: "はなです。", reading: "Hana desu", accepted: ["はなです", "ハナです", "hana desu", "わたしははなです", "watashi wa hana desu"] },
    ],
  },
  {
    id: "repair", title: "Ask for help", goal: "Ask someone to repeat or slow down.",
    setting: "Your conversation partner speaks too quickly. Keep the conversation going by asking for help.",
    phrases: [
      { id: "again", japanese: "もういちどおねがいします。", speech: "もう一度お願いします。", reading: "mou ichido onegaishimasu", meaning: "Once more, please.", note: "Use this when you need to hear something again." },
      { id: "slow", japanese: "ゆっくりおねがいします。", speech: "ゆっくりお願いします。", reading: "yukkuri onegaishimasu", meaning: "Slowly, please.", note: "The small っ in ゆっくり creates a short hold before k." },
      { id: "unknown", japanese: "わかりません。", speech: "わかりません。", reading: "wakarimasen", meaning: "I don't understand.", note: "You can follow this with a request to repeat or slow down." },
    ],
    turns: [
      { prompt: "あした、さんじにあいましょう。", speech: "明日、三時に会いましょう。", meaning: "Let's meet tomorrow at three.", hint: "You missed what they said. Ask them to repeat it.", model: "もういちどおねがいします。", reading: "mou ichido onegaishimasu", accepted: ["もういちどおねがいします", "もう一度お願いします", "mou ichido onegaishimasu", "もういちど", "mou ichido"] },
      { prompt: "えきのまえでまっています。", speech: "駅の前で待っています。", meaning: "I'll be waiting in front of the station.", hint: "They are speaking too fast. Ask them to slow down.", model: "ゆっくりおねがいします。", reading: "yukkuri onegaishimasu", accepted: ["ゆっくりおねがいします", "ゆっくりお願いします", "yukkuri onegaishimasu", "ゆっくり", "yukkuri"] },
    ],
  },
  {
    id: "cafe", title: "Order a drink", goal: "Order a drink and thank the person serving you.",
    setting: "You are a customer at a café. Practise a short, polite order.",
    phrases: [
      { id: "coffee", japanese: "コーヒーをください。", speech: "コーヒーをください。", reading: "koohii o kudasai", meaning: "Coffee, please.", note: "Use item + をください to ask for something. The particle を is pronounced o." },
      { id: "tea", japanese: "おちゃをください。", speech: "お茶をください。", reading: "ocha o kudasai", meaning: "Tea, please.", note: "Swap the drink while keeping the same request pattern." },
      { id: "thanks", japanese: "ありがとうございます。", speech: "ありがとうございます。", reading: "arigatou gozaimasu", meaning: "Thank you.", note: "A polite thank-you suitable for staff or someone you have just met." },
    ],
    turns: [
      { prompt: "ごちゅうもんは？", speech: "ご注文は？", meaning: "What would you like to order?", hint: "Order coffee.", model: "コーヒーをください。", reading: "koohii o kudasai", accepted: ["コーヒーをください", "こーひーをください", "koohii o kudasai", "koohii wo kudasai", "コーヒーおねがいします", "koohii onegaishimasu"] },
      { prompt: "どうぞ。", speech: "どうぞ。", meaning: "Here you are.", hint: "Thank the person serving you.", model: "ありがとうございます。", reading: "arigatou gozaimasu", accepted: ["ありがとうございます", "arigatou gozaimasu", "ありがとう", "arigatou"] },
    ],
  },
  {
    id: "interests", title: "Talk about likes", goal: "Say what you like and answer a simple question.",
    setting: "Talk about drinks with a new acquaintance. These examples keep the conversation polite.",
    phrases: [
      { id: "like-tea", japanese: "おちゃがすきです。", speech: "お茶が好きです。", reading: "ocha ga suki desu", meaning: "I like tea.", note: "Use noun + がすきです to say what you like." },
      { id: "like-coffee", japanese: "コーヒーがすきです。", speech: "コーヒーが好きです。", reading: "koohii ga suki desu", meaning: "I like coffee.", note: "Change the noun to make the statement your own." },
      { id: "like-question", japanese: "おちゃがすきですか。", speech: "お茶が好きですか。", reading: "ocha ga suki desu ka", meaning: "Do you like tea?", note: "Adding か turns this polite statement into a question." },
    ],
    turns: [
      { prompt: "なにがすきですか。", speech: "何が好きですか。", meaning: "What do you like?", hint: "Say that you like tea.", model: "おちゃがすきです。", reading: "ocha ga suki desu", accepted: ["おちゃがすきです", "お茶が好きです", "ocha ga suki desu"] },
      { prompt: "コーヒーがすきですか。", speech: "コーヒーが好きですか。", meaning: "Do you like coffee?", hint: "Answer yes and say that you like it.", model: "はい、すきです。", reading: "hai, suki desu", accepted: ["はいすきです", "はい好きです", "hai suki desu", "はいコーヒーがすきです", "hai koohii ga suki desu"] },
    ],
  },
  {
    id: "shopping", title: "Ask the price", goal: "Ask how much something costs and request it.",
    setting: "You are looking at an item in a shop. Pointing to an item gives これ (this) its meaning.",
    phrases: [
      { id: "excuse", japanese: "すみません。", speech: "すみません。", reading: "sumimasen", meaning: "Excuse me.", note: "Use this to politely get someone's attention. It can also be an apology." },
      { id: "price", japanese: "これはいくらですか。", speech: "これはいくらですか。", reading: "kore wa ikura desu ka", meaning: "How much is this?", note: "Point to the item. Here は marks the topic and is pronounced wa." },
      { id: "this", japanese: "これをください。", speech: "これをください。", reading: "kore o kudasai", meaning: "This one, please.", note: "Use これ when the item is near you or you are pointing to it." },
    ],
    turns: [
      { prompt: "いらっしゃいませ。", speech: "いらっしゃいませ。", meaning: "Welcome. (Said by shop staff.)", hint: "Ask how much the item is.", model: "これはいくらですか。", reading: "kore wa ikura desu ka", accepted: ["これはいくらですか", "kore wa ikura desu ka", "いくらですか", "ikura desu ka"] },
      { prompt: "ごひゃくえんです。", speech: "五百円です。", meaning: "It's 500 yen.", hint: "Ask for the item.", model: "これをください。", reading: "kore o kudasai", accepted: ["これをください", "kore o kudasai", "kore wo kudasai", "これおねがいします", "kore onegaishimasu"] },
    ],
  },
  {
    id: "places", title: "Find a place", goal: "Ask where a place is and recognize a simple location answer.",
    setting: "You are in a station and need to find the restroom. Start by getting someone's attention.",
    phrases: [
      { id: "where", japanese: "トイレはどこですか。", speech: "トイレはどこですか。", reading: "toire wa doko desu ka", meaning: "Where is the restroom?", note: "Use place + はどこですか to ask where something is." },
      { id: "over-there", japanese: "あそこです。", speech: "あそこです。", reading: "asoko desu", meaning: "It's over there.", note: "Usually accompanied by a gesture toward somewhere away from both speakers." },
      { id: "station", japanese: "えきはどこですか。", speech: "駅はどこですか。", reading: "eki wa doko desu ka", meaning: "Where is the station?", note: "Change the place while keeping the same question pattern." },
    ],
    turns: [
      { prompt: "はい？", speech: "はい？", meaning: "Yes? (Responding when you get their attention.)", hint: "Ask where the restroom is.", model: "トイレはどこですか。", reading: "toire wa doko desu ka", accepted: ["トイレはどこですか", "といれはどこですか", "toire wa doko desu ka"] },
      { prompt: "あそこです。", speech: "あそこです。", meaning: "It's over there.", hint: "Thank them for helping.", model: "ありがとうございます。", reading: "arigatou gozaimasu", accepted: ["ありがとうございます", "arigatou gozaimasu", "ありがとう", "arigatou"] },
    ],
  },
];

export function normalizeReply(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[\s。、！？!?.,'’\-]/g, "");
}

export function matchesReply(turn: ConversationTurn, value: string): boolean {
  const normalized = normalizeReply(value);
  return normalized.length > 0 && turn.accepted.some((a) => normalizeReply(a) === normalized);
}

export function listeningOptions(lesson: SpeakingLesson, phrase: Phrase): string[] {
  // Rotate answer positions without making renders or hydration random.
  const meanings = lesson.phrases.map((p) => p.meaning);
  const offset = (lesson.id.length + phrase.id.length) % meanings.length;
  return [...meanings.slice(offset), ...meanings.slice(0, offset)];
}
