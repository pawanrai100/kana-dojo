import { isKnownKana, splitKana, toHiragana, toRomaji } from "@/lib/kana/hiragana";
import { COMMON_LESSONS, COMMON_RAW, COMMON_WORDS } from "./common";

// the jlpt n5 kanji in lessons 1-9, then the most used kanji up to 500 in 10+ (see common.ts). readings: on'yomi in katakana (the chinese-style
// reading, used in compounds), kun'yomi in hiragana with a dot before the
// okurigana (the kana tail): た.べる = 食べる

export interface Kanji {
  k: string;
  meanings: string[]; // first one is the main meaning
  on: string[];
  kun: string[];
  trick: string;
  lesson: number;
}

export interface KanjiWord {
  id: string; // the word as written
  word: string;
  reading: string; // hiragana
  romaji: string;
  meaning: string;
  kanji: string[]; // kanji in it, in order
}

export interface KanjiLesson {
  id: number;
  name: string;
  blurb: string;
}

export const LESSONS: KanjiLesson[] = [
  { id: 1, name: "Numbers", blurb: "One to ten thousand, plus yen." },
  { id: 2, name: "Days & time", blurb: "The week, the clock and the calendar." },
  { id: 3, name: "People", blurb: "Family, friends and who's who." },
  { id: 4, name: "Body & senses", blurb: "Hands, eyes, ears and what they do." },
  { id: 5, name: "Nature", blurb: "Mountains, rivers, rain and sky." },
  { id: 6, name: "Places & directions", blurb: "Up, down, left, right, school and station." },
  { id: 7, name: "Actions", blurb: "Go, come, eat, drink, read and write." },
  { id: 8, name: "Describing", blurb: "Big, small, new, old, cheap, expensive." },
  { id: 9, name: "Things & language", blurb: "Books, cars, trains and Japanese itself." },
  ...COMMON_LESSONS,
];

// lessons 1-9 are the n5 set
export const N5_LAST_LESSON = 9;

export type Row = [k: string, meanings: string, on: string, kun: string, trick: string];
const s = (x: string) => (x ? x.split("|") : []);

const N5_RAW: Record<number, Row[]> = {
  1: [
    ["一", "one", "イチ|イツ", "ひと|ひと.つ", "One single line."],
    ["二", "two", "ニ", "ふた|ふた.つ", "Two lines stacked."],
    ["三", "three", "サン", "み|み.つ|みっ.つ", "Three lines stacked."],
    ["四", "four", "シ", "よ|よ.つ|よっ.つ|よん", "A box with four corners and two legs inside."],
    ["五", "five", "ゴ", "いつ|いつ.つ", "Looks like a 5 lying on its side, boxed in."],
    ["六", "six", "ロク", "む|む.つ|むっ.つ|むい", "A person with a hat, legs spread: six limbs and a head."],
    ["七", "seven", "シチ", "なな|なな.つ|なの", "An upside-down 7 with a line through it."],
    ["八", "eight", "ハチ", "や|や.つ|やっ.つ|よう", "Two lines spreading apart, like the bottom of an 8."],
    ["九", "nine", "キュウ|ク", "ここの|ここの.つ", "Looks like a 9 written with a brush."],
    ["十", "ten", "ジュウ|ジッ", "とお|と", "A plus sign. Ten is a cross."],
    ["百", "hundred", "ヒャク", "もも", "One (一) on top of white (白): a hundred is one big white number."],
    ["千", "thousand", "セン", "ち", "Ten (十) with a little hat. Ten with a lid holds a thousand."],
    ["万", "ten thousand", "マン|バン", "よろず", "An old man with a hooked cane. He's lived ten thousand days."],
    ["円", "yen|circle|round", "エン", "まる.い", "A cash drawer with money inside. Yen!"],
  ],
  2: [
    ["日", "sun|day", "ニチ|ジツ", "ひ|か", "A window with the sun shining through."],
    ["月", "moon|month", "ゲツ|ガツ", "つき", "A crescent moon with two lines across it."],
    ["火", "fire", "カ", "ひ", "A campfire with sparks flying off both sides."],
    ["水", "water", "スイ", "みず", "A river splashing out to both sides."],
    ["木", "tree|wood", "モク|ボク", "き", "A tree: trunk, branches and roots."],
    ["金", "gold|money|metal", "キン|コン", "かね", "A roof over a pile of gold nuggets."],
    ["土", "earth|soil|ground", "ド|ト", "つち", "A sprout poking out of the ground."],
    ["曜", "weekday", "ヨウ", "", "Sun (日) on the left plus two wings and a bird: days fly by."],
    ["年", "year", "ネン", "とし", "A farmer carrying rice: one harvest per year."],
    ["時", "time|hour|o'clock", "ジ", "とき", "Sun (日) next to a temple (寺): the temple bell tells the time."],
    ["分", "minute|part|divide|understand", "フン|ブン", "わ.かる|わ.ける", "A knife (刀) cutting something into eight (八) parts."],
    ["半", "half", "ハン", "なか.ば", "A line straight down the middle cuts it in half."],
    ["今", "now", "コン|キン", "いま", "A roof with one thing under it right now."],
    ["週", "week", "シュウ", "", "Walking around (⻌) a circle: a week goes round and round."],
    ["毎", "every|each", "マイ", "", "A person with a hat over a mother (母), every single day."],
    ["午", "noon", "ゴ", "", "Like 千 without the top dash: the sun's straight up at noon."],
    ["前", "before|front", "ゼン", "まえ", "Horns on top, moon and a knife: the bull in front of you."],
    ["後", "after|behind|later", "ゴ|コウ", "あと|うし.ろ|のち", "A person walking slowly, falling behind."],
  ],
  3: [
    ["人", "person|people", "ジン|ニン", "ひと", "A person walking, two legs."],
    ["子", "child", "シ|ス", "こ", "A baby wrapped up with its arms out."],
    ["女", "woman|female", "ジョ|ニョ", "おんな|め", "A woman sitting with her legs crossed."],
    ["男", "man|male", "ダン|ナン", "おとこ", "A rice field (田) and power (力): the man works the field."],
    ["父", "father|dad", "フ", "ちち", "Two crossed sticks with hair on top: dad's tools."],
    ["母", "mother|mom", "ボ", "はは", "A woman with two dots: mom holding her babies."],
    ["友", "friend", "ユウ", "とも", "Two hands reaching for each other."],
    ["名", "name", "メイ|ミョウ", "な", "Evening (夕) and a mouth (口): in the dark you shout your name."],
    ["先", "ahead|previous|tip", "セン", "さき", "A person (儿) walking ahead with something on their head."],
    ["生", "life|birth|raw", "セイ|ショウ", "い.きる|う.まれる|なま", "A plant growing out of the ground: life."],
  ],
  4: [
    ["手", "hand", "シュ", "て", "A hand with fingers spread out."],
    ["目", "eye", "モク", "め", "An eye turned on its side, with lashes inside."],
    ["口", "mouth", "コウ|ク", "くち", "An open mouth: just a square."],
    ["耳", "ear", "ジ", "みみ", "An ear with lines inside it."],
    ["足", "foot|leg|enough", "ソク", "あし|た.りる", "A knee (口) on top of a foot."],
    ["見", "see|look|watch", "ケン", "み.る|み.せる", "An eye (目) on legs: walking around looking."],
    ["聞", "hear|listen|ask", "ブン|モン", "き.く", "An ear (耳) pressed to a gate (門): listening in."],
    ["言", "say|word", "ゲン|ゴン", "い.う|こと", "Words coming out of a mouth (口)."],
    ["話", "talk|speak|story", "ワ", "はな.す|はなし", "Words (言) from a tongue (舌): talking."],
  ],
  5: [
    ["山", "mountain", "サン", "やま", "Three mountain peaks."],
    ["川", "river", "セン", "かわ", "Water flowing in three lines."],
    ["田", "rice field|field", "デン", "た", "A rice field cut into four plots."],
    ["天", "heaven|sky", "テン", "あめ|あま", "A big person (大) with the sky (一) above them."],
    ["気", "spirit|energy|mood|air", "キ|ケ", "", "Steam rising from a pot of rice: energy."],
    ["雨", "rain", "ウ", "あめ", "A window with raindrops falling inside."],
    ["花", "flower", "カ", "はな", "Grass (艹) on top of something changing (化): a flower blooming."],
    ["空", "sky|empty", "クウ", "そら|あ.く|から", "A hole (穴) over work (工): the sky is one big empty space."],
  ],
  6: [
    ["上", "up|above|top", "ジョウ", "うえ|あ.がる|のぼ.る", "A line pointing up from the ground."],
    ["下", "down|below|under", "カ|ゲ", "した|さ.がる|くだ.さる", "A line hanging down from the ceiling."],
    ["中", "middle|inside|center", "チュウ", "なか", "A box with a line straight through the middle."],
    ["外", "outside", "ガイ|ゲ", "そと", "Evening (夕) and a fortune stick (卜): fortunes are told outside."],
    ["右", "right", "ウ|ユウ", "みぎ", "A hand going to the mouth (口). You eat with your right hand."],
    ["左", "left", "サ", "ひだり", "A hand holding a tool (工). The left hand holds it while the right works."],
    ["東", "east", "トウ", "ひがし", "The sun (日) rising behind a tree (木) in the east."],
    ["西", "west", "セイ|サイ", "にし", "A bird settling into its nest at sunset, in the west."],
    ["南", "south", "ナン", "みなみ", "A tent with warm sun inside: down south it's warm."],
    ["北", "north", "ホク", "きた", "Two people sitting back to back against the cold north wind."],
    ["国", "country", "コク", "くに", "A jewel (玉) inside borders: a country."],
    ["学", "study|learning", "ガク", "まな.ぶ", "A child (子) under a roof with sparks of ideas on top."],
    ["校", "school", "コウ", "", "A tree (木) next to a building where people mix (交)."],
    ["店", "shop|store", "テン", "みせ", "A roof (广) over a stall (占)."],
    ["駅", "station", "エキ", "", "A horse (馬) on the left: the old horse stop is now a station."],
    ["道", "road|way|path", "ドウ", "みち", "A head (首) walking along (⻌) a road."],
    ["社", "company|shrine", "シャ", "やしろ", "An altar (礻) next to the earth (土): a shrine, now a company."],
    ["間", "between|interval|space", "カン|ケン", "あいだ|ま", "The sun (日) shining between the doors of a gate (門)."],
  ],
  7: [
    ["行", "go", "コウ|ギョウ", "い.く|おこな.う", "A crossroads: where you go."],
    ["来", "come", "ライ", "く.る", "A tree (木) with a hat: it came from far away."],
    ["出", "exit|leave|go out", "シュツ", "で.る|だ.す", "Two mountains (山) stacked: climbing out."],
    ["入", "enter|put in", "ニュウ", "はい.る|い.れる", "A person ducking to go in. Like 人, but the left leg is on top."],
    ["食", "eat|food", "ショク", "た.べる", "A lid over a bowl of food: let's eat."],
    ["飲", "drink", "イン", "の.む", "Food (食) next to a person yawning (欠) to drink."],
    ["読", "read", "ドク", "よ.む", "Words (言) and selling (売): read the words out like a salesman."],
    ["書", "write", "ショ", "か.く", "A hand holding a brush over a sun (日): writing all day."],
    ["買", "buy", "バイ", "か.う", "A net (罒) over a shell (貝). Shells used to be money."],
    ["休", "rest|day off", "キュウ", "やす.む", "A person (亻) leaning on a tree (木): resting."],
    ["立", "stand", "リツ", "た.つ", "A person standing on the ground."],
    ["会", "meet|meeting", "カイ|エ", "あ.う", "People gathering under one roof."],
  ],
  8: [
    ["大", "big|large", "ダイ|タイ", "おお.きい", "A person stretching their arms out wide: this big!"],
    ["小", "small|little", "ショウ", "ちい.さい|こ", "A small thing with two tiny crumbs falling off."],
    ["長", "long|chief|leader", "チョウ", "なが.い", "An old man with long flowing hair."],
    ["高", "tall|high|expensive", "コウ", "たか.い", "A tall tower with a roof on top."],
    ["安", "cheap|safe|calm", "アン", "やす.い", "A woman (女) under a roof: safe at home."],
    ["新", "new", "シン", "あたら.しい", "Standing (立) by a tree (木) with an axe (斤): chopping fresh new wood."],
    ["古", "old", "コ", "ふる.い", "Ten (十) mouths (口) telling an old story."],
    ["多", "many|much", "タ", "おお.い", "Two evenings (夕) stacked: many nights."],
    ["少", "few|little", "ショウ", "すく.ない|すこ.し", "Small (小) with a slash: even fewer."],
    ["早", "early|fast", "ソウ", "はや.い", "The sun (日) on top of ten (十): up early at sunrise."],
    ["白", "white", "ハク", "しろ|しろ.い", "The sun (日) with a ray of light on top: bright white."],
  ],
  9: [
    ["本", "book|origin|main", "ホン", "もと", "A tree (木) with a line at its root: the origin, and books are made of trees."],
    ["車", "car|vehicle", "シャ", "くるま", "A cart seen from above: wheels and an axle."],
    ["電", "electricity", "デン", "", "Rain (雨) over a field with lightning striking."],
    ["語", "language|word", "ゴ", "かた.る", "Words (言) and five (五) mouths (口): a language."],
    ["何", "what", "カ", "なに|なん", "A person (亻) holding a box: what's in it?"],
  ],
};

// [word, reading, meaning]
const N5_WORDS: [string, string, string][] = [
  // numbers
  ["一つ", "ひとつ", "one (thing)"],
  ["一人", "ひとり", "one person, alone"],
  ["二人", "ふたり", "two people"],
  ["二つ", "ふたつ", "two (things)"],
  ["三つ", "みっつ", "three (things)"],
  ["四つ", "よっつ", "four (things)"],
  ["五つ", "いつつ", "five (things)"],
  ["六つ", "むっつ", "six (things)"],
  ["七つ", "ななつ", "seven (things)"],
  ["八つ", "やっつ", "eight (things)"],
  ["九つ", "ここのつ", "nine (things)"],
  ["十", "じゅう", "ten"],
  ["二十", "にじゅう", "twenty"],
  ["百", "ひゃく", "hundred"],
  ["三百", "さんびゃく", "three hundred"],
  ["八百", "はっぴゃく", "eight hundred"],
  ["千", "せん", "thousand"],
  ["三千", "さんぜん", "three thousand"],
  ["一万", "いちまん", "ten thousand"],
  ["百円", "ひゃくえん", "100 yen"],
  ["千円", "せんえん", "1000 yen"],
  ["一万円", "いちまんえん", "10,000 yen"],
  // days & time
  ["日", "ひ", "sun, day"],
  ["月", "つき", "moon"],
  ["火", "ひ", "fire"],
  ["水", "みず", "water"],
  ["木", "き", "tree"],
  ["土", "つち", "soil"],
  ["お金", "おかね", "money"],
  ["日曜日", "にちようび", "Sunday"],
  ["月曜日", "げつようび", "Monday"],
  ["火曜日", "かようび", "Tuesday"],
  ["水曜日", "すいようび", "Wednesday"],
  ["木曜日", "もくようび", "Thursday"],
  ["金曜日", "きんようび", "Friday"],
  ["土曜日", "どようび", "Saturday"],
  ["一月", "いちがつ", "January"],
  ["三月", "さんがつ", "March"],
  ["四月", "しがつ", "April"],
  ["七月", "しちがつ", "July"],
  ["九月", "くがつ", "September"],
  ["毎日", "まいにち", "every day"],
  ["毎週", "まいしゅう", "every week"],
  ["毎年", "まいとし", "every year"],
  ["今", "いま", "now"],
  ["今日", "きょう", "today"],
  ["今年", "ことし", "this year"],
  ["今週", "こんしゅう", "this week"],
  ["今月", "こんげつ", "this month"],
  ["一年", "いちねん", "one year"],
  ["一時", "いちじ", "one o'clock"],
  ["四時", "よじ", "four o'clock"],
  ["九時", "くじ", "nine o'clock"],
  ["五分", "ごふん", "five minutes"],
  ["十分", "じゅっぷん", "ten minutes"],
  ["半分", "はんぶん", "half"],
  ["二時半", "にじはん", "half past two"],
  ["午前", "ごぜん", "morning, a.m."],
  ["午後", "ごご", "afternoon, p.m."],
  ["前", "まえ", "front, before"],
  ["後ろ", "うしろ", "behind"],
  ["分かる", "わかる", "to understand"],
  // people
  ["人", "ひと", "person"],
  ["三人", "さんにん", "three people"],
  ["子ども", "こども", "child"],
  ["女", "おんな", "woman"],
  ["男", "おとこ", "man"],
  ["女の子", "おんなのこ", "girl"],
  ["男の子", "おとこのこ", "boy"],
  ["女の人", "おんなのひと", "woman"],
  ["男の人", "おとこのひと", "man"],
  ["父", "ちち", "(my) father"],
  ["母", "はは", "(my) mother"],
  ["お父さん", "おとうさん", "father"],
  ["お母さん", "おかあさん", "mother"],
  ["友だち", "ともだち", "friend"],
  ["名前", "なまえ", "name"],
  ["先生", "せんせい", "teacher"],
  ["先週", "せんしゅう", "last week"],
  ["先月", "せんげつ", "last month"],
  ["生まれる", "うまれる", "to be born"],
  ["一生", "いっしょう", "whole life"],
  // body
  ["手", "て", "hand"],
  ["目", "め", "eye"],
  ["口", "くち", "mouth"],
  ["耳", "みみ", "ear"],
  ["足", "あし", "foot, leg"],
  ["見る", "みる", "to see, to watch"],
  ["見せる", "みせる", "to show"],
  ["聞く", "きく", "to listen, to ask"],
  ["言う", "いう", "to say"],
  ["話す", "はなす", "to talk"],
  ["話", "はなし", "talk, story"],
  ["一言", "ひとこと", "a word"],
  ["人口", "じんこう", "population"],
  // nature
  ["山", "やま", "mountain"],
  ["川", "かわ", "river"],
  ["山田", "やまだ", "Yamada (a name)"],
  ["火山", "かざん", "volcano"],
  ["天気", "てんき", "weather"],
  ["人気", "にんき", "popular"],
  ["空気", "くうき", "air"],
  ["雨", "あめ", "rain"],
  ["花", "はな", "flower"],
  ["花火", "はなび", "fireworks"],
  ["空", "そら", "sky"],
  // places
  ["上", "うえ", "above, up"],
  ["下", "した", "below, under"],
  ["中", "なか", "inside"],
  ["外", "そと", "outside"],
  ["右", "みぎ", "right"],
  ["左", "ひだり", "left"],
  ["東", "ひがし", "east"],
  ["西", "にし", "west"],
  ["南", "みなみ", "south"],
  ["北", "きた", "north"],
  ["国", "くに", "country"],
  ["外国", "がいこく", "foreign country"],
  ["外国人", "がいこくじん", "foreigner"],
  ["中国", "ちゅうごく", "China"],
  ["学校", "がっこう", "school"],
  ["学生", "がくせい", "student"],
  ["中学生", "ちゅうがくせい", "middle schooler"],
  ["店", "みせ", "shop"],
  ["駅", "えき", "station"],
  ["道", "みち", "road"],
  ["時間", "じかん", "time"],
  ["上手", "じょうず", "good at"],
  ["下手", "へた", "bad at"],
  ["田中", "たなか", "Tanaka (a name)"],
  // actions
  ["行く", "いく", "to go"],
  ["来る", "くる", "to come"],
  ["来週", "らいしゅう", "next week"],
  ["来月", "らいげつ", "next month"],
  ["来年", "らいねん", "next year"],
  ["出る", "でる", "to leave, to go out"],
  ["出口", "でぐち", "exit"],
  ["入る", "はいる", "to enter"],
  ["入口", "いりぐち", "entrance"],
  ["食べる", "たべる", "to eat"],
  ["飲む", "のむ", "to drink"],
  ["読む", "よむ", "to read"],
  ["書く", "かく", "to write"],
  ["買う", "かう", "to buy"],
  ["休む", "やすむ", "to rest"],
  ["休み", "やすみ", "holiday, break"],
  ["立つ", "たつ", "to stand"],
  ["会う", "あう", "to meet"],
  ["会社", "かいしゃ", "company"],
  // describing
  ["大きい", "おおきい", "big"],
  ["小さい", "ちいさい", "small"],
  ["長い", "ながい", "long"],
  ["高い", "たかい", "tall, expensive"],
  ["安い", "やすい", "cheap"],
  ["新しい", "あたらしい", "new"],
  ["古い", "ふるい", "old"],
  ["多い", "おおい", "many"],
  ["少ない", "すくない", "few"],
  ["少し", "すこし", "a little"],
  ["早い", "はやい", "early"],
  ["白い", "しろい", "white"],
  ["大人", "おとな", "adult"],
  ["大学", "だいがく", "university"],
  ["大学生", "だいがくせい", "university student"],
  ["高校", "こうこう", "high school"],
  ["社長", "しゃちょう", "company president"],
  ["新聞", "しんぶん", "newspaper"],
  ["中古", "ちゅうこ", "secondhand"],
  // things
  ["本", "ほん", "book"],
  ["一本", "いっぽん", "one (long thing)"],
  ["日本", "にほん", "Japan"],
  ["日本人", "にほんじん", "Japanese person"],
  ["日本語", "にほんご", "Japanese (language)"],
  ["車", "くるま", "car"],
  ["電車", "でんしゃ", "train"],
  ["電話", "でんわ", "phone"],
  ["電気", "でんき", "electricity, lights"],
  ["何", "なに", "what"],
  ["何時", "なんじ", "what time"],
  ["何人", "なんにん", "how many people"],
];

// ---- build + check everything once ----

const RAW: Record<number, Row[]> = { ...N5_RAW, ...COMMON_RAW };
const WORDS = [...N5_WORDS, ...COMMON_WORDS];

const ALL: Kanji[] = Object.entries(RAW).flatMap(([lesson, rows]) =>
  rows.map(([k, m, on, kun, trick]) => ({ k, meanings: s(m), on: s(on), kun: s(kun), trick, lesson: Number(lesson) })),
);

const BY_K = new Map(ALL.map((x) => [x.k, x]));
const isKanji = (ch: string) => /\p{Script=Han}/u.test(ch);

function buildWords(): KanjiWord[] {
  const seen = new Set<string>();
  return WORDS.map(([word, reading, meaning]) => {
    const chars = Array.from(word);
    const kanji = chars.filter(isKanji);
    // catch typos when the site builds, not when someone plays
    if (seen.has(word)) throw new Error(`duplicate kanji word: ${word}`);
    seen.add(word);
    if (!kanji.length) throw new Error(`no kanji in ${word}`);
    for (const k of kanji) if (!BY_K.has(k)) throw new Error(`${word} uses ${k}, which isn't in the kanji list`);
    for (const part of word.split(/\p{Script=Han}+/u).filter(Boolean))
      for (const u of splitKana(part)) if (!isKnownKana(u)) throw new Error(`odd character in ${word}: ${u}`);
    const units = splitKana(reading);
    if (!units.every(isKnownKana)) throw new Error(`bad reading for ${word}: ${reading}`);
    return { id: word, word, reading, romaji: toRomaji(reading), meaning, kanji };
  });
}

for (const x of ALL) {
  for (const r of [...x.on.map(toHiragana), ...x.kun.map((r) => r.replace(".", ""))])
    if (!splitKana(r).every(isKnownKana)) throw new Error(`bad reading for ${x.k}: ${r}`);
}

export const KANJI: Kanji[] = ALL;
export const KANJI_LIST: string[] = ALL.map((x) => x.k);
export const N5_KANJI: string[] = ALL.filter((x) => x.lesson <= N5_LAST_LESSON).map((x) => x.k);
export const KANJI_WORDS: KanjiWord[] = buildWords();
const WORD_IDS = new Set(KANJI_WORDS.map((w) => w.id));

export function getKanji(k: string): Kanji | undefined {
  return BY_K.get(k);
}

export function isCourseKanji(k: string): boolean {
  return BY_K.has(k);
}

export function kanjiOfLessons(lessons: number[]): string[] {
  const set = new Set(lessons);
  return ALL.filter((x) => set.has(x.lesson)).map((x) => x.k);
}

// words you can read with these kanji (kana parts are always fine)
export function wordsFor(kanji: string[]): KanjiWord[] {
  const set = new Set(kanji);
  return KANJI_WORDS.filter((w) => w.kanji.every((k) => set.has(k)));
}

// a handful of words for the detail card, without six weekdays in a row
export function exampleWords(k: string, n = 6): KanjiWord[] {
  const out: KanjiWord[] = [];
  const tails = new Map<string, number>();
  // words built only from easier kanji come first
  const level = (w: KanjiWord) => Math.max(...w.kanji.map((x) => BY_K.get(x)!.lesson));
  const all = wordsWith(k).sort((a, b) => level(a) - level(b) || a.kanji.length - b.kanji.length);
  for (const w of all) {
    const tail = w.word.length > 2 ? w.word.slice(1) : w.word;
    if ((tails.get(tail) ?? 0) >= 2) continue;
    tails.set(tail, (tails.get(tail) ?? 0) + 1);
    out.push(w);
    if (out.length === n) break;
  }
  return out;
}

export function isKanjiWord(id: string): boolean {
  return WORD_IDS.has(id);
}

export function wordsWith(k: string): KanjiWord[] {
  return KANJI_WORDS.filter((w) => w.kanji.includes(k));
}

// kanji that look alike, and how to tell them apart
export const KANJI_LOOKALIKES: { set: string[]; tip: string }[] = [
  { set: ["日", "目", "白", "百"], tip: "日 has one line inside, 目 has two. 白 is 日 with a tick on top, and 百 puts one more line (一) over 白." },
  { set: ["人", "入", "八"], tip: "人 leans on its left leg, 入 on its right. 八's two strokes don't touch at all." },
  { set: ["木", "本", "休"], tip: "本 is 木 with a line at the root. 休 has a person (亻) leaning on the tree." },
  { set: ["千", "十", "午"], tip: "十 is a plain cross. 千 adds a slanted hat. 午 has a flat line instead of the slant, plus a short stroke on top." },
  { set: ["右", "左"], tip: "Both start with the same hand. 右 has a mouth (口) under it, 左 has a tool (工)." },
  { set: ["大", "天"], tip: "天 is 大 with one more line on top: the sky above the big person." },
  { set: ["間", "聞"], tip: "Both are gates (門). 間 has the sun (日) inside, 聞 has an ear (耳)." },
  { set: ["話", "語", "読", "言"], tip: "All start with words (言). 話 adds a tongue, 語 adds five and a mouth, 読 adds 売 (sell)." },
  { set: ["東", "車"], tip: "東 is a tree (木) with the sun (日) behind it. 車 has no tree legs, just a straight axle down the middle." },
  { set: ["小", "少"], tip: "少 is 小 with an extra slash at the bottom." },
  { set: ["土", "上"], tip: "土 has the long line at the bottom. 上 has a short stroke sticking up and right." },
  { set: ["見", "貝"], tip: "見 ends in legs (儿) that walk. 貝 ends in two short little feet." },
  { set: ["持", "待", "特", "時"], tip: "All have 寺 on the right. 持 has a hand (扌), 待 has walking (彳), 特 has a cow (牛), 時 has the sun (日)." },
  { set: ["問", "間", "聞", "開", "関"], tip: "All gates (門). Mouth inside = 問 ask, sun = 間 between, ear = 聞 hear, hands lifting a bar = 開 open, tied up = 関 barrier." },
  { set: ["右", "石"], tip: "右 starts with a hand that sticks out on top. 石 has a flat cliff top with no stick-out." },
  { set: ["官", "宮"], tip: "Both under a roof. 宮 has two stacked boxes, 官 has a hill-like shape." },
  { set: ["住", "主"], tip: "主 is the master. 住 adds a person (亻): the place where the master lives." },
  { set: ["体", "休", "本"], tip: "休 is a person by a tree. 体 is a person by a root (本)." },
  { set: ["期", "朝", "明"], tip: "All have a moon (月). 明 = sun + moon, 朝 has the sun rising in grass, 期 has a basket (其)." },
  { set: ["治", "台", "始"], tip: "All have 台. Water (氵) = 治 govern, woman (女) = 始 begin, alone = 台 stand." },
  { set: ["議", "義"], tip: "義 is justice. 議 adds words (言): talking about what's just." },
  { set: ["近", "所"], tip: "Both have an axe (斤). 近 is on the road (⻌), 所 has a door (戸)." },
  { set: ["代", "化"], tip: "Both start with a person (亻). 代 has a stake with a dot (弋), 化 has a person upside down (匕)." },
  { set: ["民", "氏"], tip: "氏 is the plain one. 民 adds a box on top." },
  { set: ["方", "万"], tip: "方 has a dot on top. 万 doesn't." },
  { set: ["重", "動", "働"], tip: "重 heavy, plus power (力) = 動 move, plus a person (亻) = 働 work." },
  { set: ["共", "供"], tip: "共 is together. 供 adds a person (亻)." },
  { set: ["反", "友"], tip: "反 has a cliff (厂). 友 has two hands crossing." },
  { set: ["成", "戦"], tip: "Both have a halberd (戈). 戦 has 単 on the left, 成 has nothing on the left." },
  { set: ["元", "院"], tip: "元 is the base. 院 adds a hill (⻖) and a roof." },
  { set: ["分", "今"], tip: "分 is eight (八) over a knife (刀). 今 is a roof over a short line and a hook." },
  { set: ["可", "何"], tip: "可 is a mouth with a hook. 何 adds a person (亻)." },
  { set: ["続", "読", "売"], tip: "All have 売 sell. Thread (糸) = 続 continue, words (言) = 読 read." },
  { set: ["説", "話", "語"], tip: "All start with words (言). 説 explain, 話 talk, 語 language." },
  { set: ["式", "試"], tip: "式 is a ceremony. 試 adds words (言): testing." },
  { set: ["活", "話"], tip: "Both have a tongue (舌). Water (氵) = 活 lively, words (言) = 話 talk." },
  { set: ["番", "審"], tip: "番 is a number. 審 adds a roof (宀): judging under a roof." },
];

export function kanjiTwins(k: string): { other: string; tip: string }[] {
  return KANJI_LOOKALIKES.filter((g) => g.set.includes(k)).flatMap((g) => g.set.filter((o) => o !== k && BY_K.has(o)).map((other) => ({ other, tip: g.tip })));
}
