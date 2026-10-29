import { isKnownKana, splitKana } from "@/lib/kana/hiragana";
import { tokensRomaji, type Token } from "@/lib/quiz/tokens";

// short sentences, written with spaces between words like a kids' reader.
// a ~ marks a particle (は reads wa, を o, へ e). they only show up once
// every kana in them is switched on, so the basic 46 get their own simple set
const RAW: [string, string][] = [
  // basic 46 only
  ["いぬ ~は かわいい", "The dog is cute."],
  ["そら ~は あおい", "The sky is blue."],
  ["はな ~は きれい", "The flower is pretty."],
  ["うみ ~は ひろい", "The sea is wide."],
  ["なつ ~は あつい", "Summer is hot."],
  ["ふゆ ~は さむい", "Winter is cold."],
  ["あさ ~は さむい", "Mornings are cold."],
  ["すし ~を たべる", "I eat sushi."],
  ["みず ~を のむ", "I drink water."],
  ["ほん ~を よむ", "I read a book."],
  ["うち ~へ かえる", "I go home."],
  ["えき ~へ いく", "I go to the station."],
  ["やま ~に のぼる", "I climb a mountain."],
  ["てがみ ~を かく", "I write a letter."],
  ["あした ~は やすみ", "Tomorrow is a day off."],
  ["この みかん ~は あまい", "This mandarin is sweet."],
  ["おかあさん ~は やさしい", "Mom is kind."],
  ["わたし ~の ねこ ~は しろい", "My cat is white."],
  ["あの ひと ~は せんせい", "That person is a teacher."],
  ["いま なに ~を します ~か", "What will you do now?"],
  ["これ ~は ほん", "This is a book."],
  ["あれ ~は つき", "That is the moon."],
  ["さかな ~を かう", "I buy fish."],
  ["あかい はな ~を みる", "I look at the red flowers."],
  ["あに ~は せ ~の たかい ひと", "My big brother is a tall person."],
  // with dakuten, combos and small っ
  ["わたし ~は がくせい です", "I am a student."],
  ["それ ~は わたし ~の かばん です", "That is my bag."],
  ["ねこ ~が すき です", "I like cats."],
  ["いぬ ~が だいすき です", "I love dogs."],
  ["きょう ~は あつい です ~ね", "It's hot today, isn't it?"],
  ["あさごはん ~を たべます", "I eat breakfast."],
  ["まいにち にほんご ~を べんきょう します", "I study Japanese every day."],
  ["がっこう ~へ いきます", "I go to school."],
  ["でんしゃ ~で いきます", "I go by train."],
  ["ともだち ~と あそびます", "I play with my friends."],
  ["としょかん ~で ほん ~を よみます", "I read books at the library."],
  ["みず ~を ください", "Water, please."],
  ["おちゃ ~を のみます", "I drink tea."],
  ["えき ~は どこ です ~か", "Where is the station?"],
  ["おてあらい ~は どこ です ~か", "Where is the restroom?"],
  ["いま なんじ です ~か", "What time is it now?"],
  ["なまえ ~は なん です ~か", "What is your name?"],
  ["はじめまして よろしく おねがいします", "Nice to meet you."],
  ["これ ~は いくら です ~か", "How much is this?"],
  ["にほん ~は きれい な くに です", "Japan is a beautiful country."],
  ["あした ~は あめ です", "It will rain tomorrow."],
  ["きのう ~は さむかった です", "It was cold yesterday."],
  ["ねこ ~が ねて います", "The cat is sleeping."],
  ["しゅくだい ~が おおい です", "I have a lot of homework."],
  ["ごはん ~を たべましょう", "Let's eat."],
  ["いっしょ ~に いきましょう", "Let's go together."],
  ["ちょっと まって ください", "Please wait a moment."],
  ["だいじょうぶ です ~か", "Are you okay?"],
  ["すし ~が たべたい です", "I want to eat sushi."],
  ["にほんご ~が すこし わかります", "I understand a little Japanese."],
  ["えいご ~を はなせます ~か", "Can you speak English?"],
  ["きって ~を かいました", "I bought stamps."],
  ["びょういん ~へ いきます", "I'm going to the hospital."],
  ["じてんしゃ ~で がっこう ~へ いきます", "I go to school by bike."],
  ["どようび ~に えいが ~を みます", "I watch a movie on Saturday."],
  ["おなか ~が すきました", "I'm hungry."],
  ["のど ~が かわきました", "I'm thirsty."],
  ["まど ~を あけて ください", "Please open the window."],
  ["ゆっくり はなして ください", "Please speak slowly."],
  ["もう いちど おねがいします", "One more time, please."],
  ["きょうしつ ~に せんせい ~が います", "The teacher is in the classroom."],
  ["つくえ ~の うえ ~に ほん ~が あります", "There is a book on the desk."],
  ["わたし ~は りょこう ~が すき です", "I like traveling."],
  ["らいしゅう とうきょう ~へ いきます", "I'm going to Tokyo next week."],
  ["ぎゅうにゅう ~を のみました", "I drank milk."],
  ["ありがとう ございます", "Thank you very much."],
  ["あめ ~が ふって います", "It's raining."],
  ["そと ~は さむい です", "It's cold outside."],
  ["これ ~は なん です ~か", "What is this?"],
  ["ちゃいろ ~の いぬ ~が います", "There's a brown dog."],
  ["ほっかいどう ~は さむい です", "Hokkaido is cold."],
  ["きんようび ~は いそがしい です", "I'm busy on Fridays."],
  ["でんわ ~を かけます", "I'll make a phone call."],
  ["かぞく ~は よにん です", "There are four people in my family."],
  ["わたし ~の しゅみ ~は りょうり です", "My hobby is cooking."],
  ["この うどん ~は おいしい です", "This udon is delicious."],
  ["やさい ~を たくさん たべます", "I eat lots of vegetables."],
  ["しゃしん ~を とりましょう ~か", "Shall we take a photo?"],
  ["ちかてつ ~は べんり です", "The subway is convenient."],
  ["べんきょう ~は たのしい です", "Studying is fun."],
  ["おかね ~が ありません", "I don't have any money."],
  ["にちようび ~は ひま です", "I'm free on Sunday."],
  ["まいあさ ろくじ ~に おきます", "I get up at six every morning."],
  ["ごご さんじ ~に あいましょう", "Let's meet at 3 p.m."],
];

export interface Sentence {
  id: string;
  kana: string; // no spaces, what the answer is checked against
  tokens: Token[];
  romaji: string; // spaced, particles read wa / o / e
  meaning: string;
}

function build(): Sentence[] {
  return RAW.map(([text, meaning]) => {
    const tokens: Token[] = text.split(" ").map((t) => (t.startsWith("~") ? { kana: t.slice(1), particle: true } : { kana: t }));
    const kana = tokens.map((t) => t.kana).join("");
    // fail loud so a typo never reaches the quiz
    if (!splitKana(kana).every(isKnownKana)) throw new Error(`sentence uses kana we don't teach: ${text}`);
    return { id: `s:${kana}`, kana, tokens, romaji: tokensRomaji(tokens), meaning };
  });
}

export const SENTENCES: Sentence[] = build();
