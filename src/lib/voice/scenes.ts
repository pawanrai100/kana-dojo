import { normJa } from "./match";

// little scripted conversations with hana-sensei. she says a line, you answer
// out loud (or tap an answer), she reacts to what you actually said.
// replies are checked against the mic's guesses after flattening katakana to
// hiragana, so patterns are written in hiragana plus the usual kanji

export interface Reply {
  match: RegExp; // tested on the flattened guess. group 1 = something worth repeating back
  then: string; // what she says next. {x} = your group 1, {name} = your name
  en: string;
  save?: "name"; // remember group 1 as your name
}

export interface Turn {
  say: string;
  en: string;
  replies: Reply[];
  hint: { ja: string; romaji: string; en: string }; // what you could say
  options: string[]; // answers to tap when there's no mic
}

export interface Scene {
  id: string;
  title: string;
  ja: string;
  blurb: string;
  turns: Turn[];
}

const YES = "(?:はい|ええ|うん|そう|もちろん|ぜひ|いいよ|いいね)";
const NO = "(?:いいえ|いや|ううん|ちがう|違う|ちがいます|違います|ごめん|むり|無理|ちょっと)";
const BYE = "(?:またね|また|ばいばい|さようなら|さよなら|じゃあね|じゃね|では)";
const THANKS = "(?:ありがとう|有難う|どうも)";
const DRINKS = "(こーひー|珈琲|てぃー|紅茶|こうちゃ|じゅーす|けーき|さんどいっち|おちゃ|お茶|みず|水|ぱん|あいす|らーめん|かれー|ぴざ|みるく|こーら)";
const CLOTHES = "(てぃーしゃつ|しゃつ|ぼうし|帽子|くつ|靴|かばん|鞄|めがね|眼鏡|ずぼん|すかーと|たおる|ねくたい)";

export const SCENES: Scene[] = [
  {
    id: "meet",
    title: "Meet Hana",
    ja: "はじめまして",
    blurb: "Say hi, tell her your name, chat about what you like.",
    turns: [
      {
        say: "こんにちは！ わたしは はな です。 おなまえは？",
        en: "Hi! I'm Hana. What's your name?",
        replies: [
          { match: /^(?:わたしは|ぼくは|おれは|私は|僕は|俺は)?(.{1,12}?)(?:です|といいます|ともうします|と申します|だよ|だ)$/, then: "{x}さん！ よろしく ね！", en: "{x}! Nice to meet you!", save: "name" },
          { match: /^(.{1,10})$/, then: "{x}さん！ よろしく ね！", en: "{x}! Nice to meet you!", save: "name" },
        ],
        hint: { ja: "（なまえ） です", romaji: "(your name) desu", en: "I'm (your name)." },
        options: ["{me} です"],
      },
      {
        say: "{name}さんは がくせい ですか？",
        en: "{name}, are you a student?",
        replies: [
          { match: new RegExp(`^${YES}`), then: "そうなんだ！ べんきょう がんばって ね！", en: "Oh nice! Good luck with your studies!" },
          { match: new RegExp(`^${NO}`), then: "そっか！ おしごと おつかれさま！", en: "Ah, okay! You must work hard!" },
          { match: /(がくせい|学生)/, then: "そうなんだ！ べんきょう がんばって ね！", en: "Oh nice! Good luck with your studies!" },
        ],
        hint: { ja: "はい、 がくせい です", romaji: "hai, gakusei desu", en: "Yes, I'm a student." },
        options: ["はい、 がくせい です", "いいえ"],
      },
      {
        say: "なにが すき？",
        en: "What do you like?",
        replies: [{ match: /^(.+?)(?:が|も)?(?:だいすき|大好き|すき|好き)/, then: "{x}！ いいね、 わたしも すき！", en: "{x}! Nice, I like it too!" }],
        hint: { ja: "ねこが すき です", romaji: "neko ga suki desu", en: "I like cats." },
        options: ["ねこが すき です", "アニメが すき です", "サッカーが すき です"],
      },
      {
        say: "じゃあ、 また ね！",
        en: "Well, see you later!",
        replies: [{ match: new RegExp(BYE), then: "またね〜！", en: "See ya!" }],
        hint: { ja: "またね！", romaji: "mata ne!", en: "See you!" },
        options: ["またね！", "バイバイ！"],
      },
    ],
  },
  {
    id: "cafe",
    title: "At the café",
    ja: "カフェで",
    blurb: "Hana is working the counter. Order something and pay.",
    turns: [
      {
        say: "いらっしゃいませ！ ごちゅうもんは？",
        en: "Welcome! What would you like?",
        replies: [{ match: new RegExp(DRINKS), then: "{x} ですね！", en: "{x}, got it!" }],
        hint: { ja: "コーヒーを ください", romaji: "koohii o kudasai", en: "A coffee, please." },
        options: ["コーヒーを ください", "ケーキを ください", "おちゃを ください"],
      },
      {
        say: "ほかに なにか ありますか？",
        en: "Anything else?",
        replies: [
          { match: /(いいえ|だいじょうぶ|大丈夫|それだけ|けっこう|結構|ないです|ありません|いらない)/, then: "かしこまりました！", en: "Certainly!" },
          { match: new RegExp(DRINKS), then: "{x}も ですね！ かしこまりました！", en: "{x} too! Certainly!" },
        ],
        hint: { ja: "いいえ、 だいじょうぶ です", romaji: "iie, daijoubu desu", en: "No, I'm good." },
        options: ["いいえ、 だいじょうぶ です", "ジュースも ください"],
      },
      {
        say: "ぜんぶで ごひゃく えん です。",
        en: "That's 500 yen in total.",
        replies: [
          { match: /(かーど|カード)/, then: "カード ですね。 ありがとう ございます！", en: "Card, okay. Thank you!" },
          { match: /(はい|どうぞ|げんきん|現金|これで)/, then: "ありがとう ございます！", en: "Thank you very much!" },
        ],
        hint: { ja: "はい、 どうぞ", romaji: "hai, douzo", en: "Here you go." },
        options: ["はい、 どうぞ", "カードで おねがいします"],
      },
      {
        say: "ごゆっくり どうぞ！",
        en: "Enjoy!",
        replies: [{ match: new RegExp(THANKS), then: "また きて ね！", en: "Come again!" }],
        hint: { ja: "ありがとう！", romaji: "arigatou!", en: "Thanks!" },
        options: ["ありがとう！", "どうも！"],
      },
    ],
  },
  {
    id: "weekend",
    title: "Weekend plans",
    ja: "しゅうまつ",
    blurb: "Small talk about the weather and your weekend. She might invite you out.",
    turns: [
      {
        say: "おはよう！ きょうは いい てんき だね！",
        en: "Morning! Nice weather today, huh!",
        replies: [{ match: /(おはよう|お早う|そうだね|そうですね|うん|はい|いいてんき|いい天気)/, then: "でしょ？ さんぽ したく なる ね。", en: "Right? Makes you want to go for a walk." }],
        hint: { ja: "おはよう！ そうだね！", romaji: "ohayou! sou da ne!", en: "Morning! It sure is!" },
        options: ["おはよう！", "そうだね！"],
      },
      {
        say: "しゅうまつは なにを する？",
        en: "What are you doing this weekend?",
        replies: [
          {
            match: /^(.+?)(?:を|に|で)?(?:する|します|やる|やります|いく|行く|いきます|行きます|みる|見る|みます|見ます|あそぶ|遊ぶ|あそびます|遊びます)/,
            then: "{x}！ いいね！ たのしんで ね！",
            en: "{x}! Nice! Have fun!",
          },
          { match: /(べんきょう|勉強|しごと|仕事|ねる|寝る|やすむ|休む)/, then: "えらい！ でも やすんで ね。", en: "Good for you! But get some rest too." },
        ],
        hint: { ja: "ゲームを します", romaji: "geemu o shimasu", en: "I'll play games." },
        options: ["ゲームを します", "べんきょう します", "えいがを みます"],
      },
      {
        say: "ねえ、 いっしょに カラオケ いかない？",
        en: "Hey, wanna go to karaoke together?",
        replies: [
          { match: /(いかない|行かない|いけない|行けない|ごめん|むり|無理|いいえ|ちょっと)/, then: "そっか、 ざんねん。 また こんど ね！", en: "Aw, too bad. Next time then!" },
          { match: /(いく|行く|いきたい|行きたい|いこう|行こう|いいね|いいよ|うん|はい|もちろん|ぜひ)/, then: "やった！ じゃあ どようびに！", en: "Yay! Saturday it is!" },
        ],
        hint: { ja: "いいね！ いこう！", romaji: "ii ne! ikou!", en: "Sounds good! Let's go!" },
        options: ["いいね！ いこう！", "ごめん、 ちょっと…"],
      },
      {
        say: "じゃあ、 たのしみに してる ね！",
        en: "Okay, looking forward to it!",
        replies: [{ match: new RegExp(`(${YES}|${BYE}|わたしも|私も|ぼくも|僕も|おれも|俺も|たのしみ|楽しみ)`), then: "またね〜！", en: "Bye~!" }],
        hint: { ja: "うん、 またね！", romaji: "un, mata ne!", en: "Yeah, see you!" },
        options: ["うん、 またね！", "わたしも！"],
      },
    ],
  },
  {
    id: "shop",
    title: "Shopping",
    ja: "かいもの",
    blurb: "Buy something at Hana's clothes shop. Haggle a little.",
    turns: [
      {
        say: "いらっしゃいませ！ なにを おさがし ですか？",
        en: "Welcome! What are you looking for?",
        replies: [{ match: new RegExp(CLOTHES), then: "{x} ですね！", en: "{x}, okay!" }],
        hint: { ja: "ぼうしを さがして います", romaji: "boushi o sagashite imasu", en: "I'm looking for a hat." },
        options: ["ぼうし です", "くつ です", "シャツ です"],
      },
      {
        say: "この あかいのは どう ですか？ にせん えん です。",
        en: "How about this red one? It's 2000 yen.",
        replies: [
          { match: /(たかい|高い|ほかの|他の|ちょっと|いいえ|いらない|いりません|やめ)/, then: "では、 こちらは せん えん です！", en: "Then how about this one for 1000 yen!" },
          { match: /(いい|かわいい|可愛い|これ|ください|かいます|買います|すき|好き)/, then: "ありがとう ございます！", en: "Thank you so much!" },
        ],
        hint: { ja: "これを ください", romaji: "kore o kudasai", en: "I'll take this one." },
        options: ["これを ください", "ちょっと たかい です"],
      },
      {
        say: "ふくろは いりますか？",
        en: "Do you need a bag?",
        replies: [
          { match: /(いいえ|いらない|いりません|だいじょうぶ|大丈夫|けっこう|結構)/, then: "かしこまりました！", en: "Got it!" },
          { match: /(はい|おねがい|お願い|いります|ください)/, then: "はい、 どうぞ！", en: "Here you go!" },
        ],
        hint: { ja: "いいえ、 だいじょうぶ です", romaji: "iie, daijoubu desu", en: "No, I'm fine." },
        options: ["はい、 おねがいします", "いいえ、 だいじょうぶ です"],
      },
      {
        say: "ありがとう ございました！",
        en: "Thank you very much!",
        replies: [{ match: new RegExp(`(${THANKS}|${BYE})`), then: "また きて ください ね！", en: "Please come again!" }],
        hint: { ja: "ありがとう！", romaji: "arigatou!", en: "Thanks!" },
        options: ["ありがとう！", "またね！"],
      },
    ],
  },
];

export const HUH = { ja: "ん？ もう いちど いって？", en: "Hm? Say that again?" };
export const TRY_THIS = { ja: "こう いって みて：", en: "Try saying:" };

export interface Matched {
  reply: Reply;
  x: string; // what group 1 caught, in the script you said it in
}

// which reply fits what you said, if any. keeps katakana/kanji as you said them for {x}
export function matchReply(turn: Turn, alternatives: string[]): Matched | undefined {
  for (const alt of alternatives) {
    const raw = alt.normalize("NFKC").replace(/[\s、。，．,.!！?？「」『』"'～~・…]/g, "");
    const flat = normJa(alt);
    for (const reply of turn.replies) {
      const m = reply.match.exec(flat);
      if (!m) continue;
      // hiragana/katakana flattening keeps lengths the same, so the positions line up
      const start = m[1] !== undefined ? flat.indexOf(m[1], m.index) : -1;
      const x = start >= 0 ? raw.slice(start, start + m[1].length) : "";
      return { reply, x };
    }
  }
  return undefined;
}

export function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}
