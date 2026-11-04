import type { SpeakingLesson } from "./lessons";

type Line = [string, string, string, string];
function mission(id: string, title: string, goal: string, setting: string, lines: Line[], prompts: [string, string, string, number][]): SpeakingLesson {
  return { id, title, goal, setting,
    phrases: lines.map(([japanese, reading, meaning, note], i) => ({ id: `${id}-${i}`, japanese, speech: japanese, reading, meaning, note })),
    turns: prompts.map(([prompt, meaning, hint, i]) => ({ prompt, speech: prompt, meaning, hint, model: lines[i][0], reading: lines[i][1], accepted: [lines[i][0], lines[i][1]] })),
  };
}
export const EXTRA_LESSONS: SpeakingLesson[] = [
  mission("routine", "Describe your day", "Say what you eat and what you study.", "Chat about your daily routine with a classmate.", [
    ["パンを食べます。", "pan o tabemasu", "I eat bread.", "The object comes before を; the verb comes last."],
    ["日本語を勉強します。", "nihongo o benkyou shimasu", "I study Japanese.", "勉強します is a polite way to say study."],
    ["毎日、勉強します。", "mainichi benkyou shimasu", "I study every day.", "毎日 means every day. A habit can use the non-past ます form."],
  ], [["朝、何を食べますか。", "What do you eat in the morning?", "Say that you eat bread.", 0], ["何を勉強しますか。", "What do you study?", "Say that you study Japanese.", 1]]),
  mission("plans", "Make a simple plan", "Invite someone and agree on a time.", "You are arranging a trip to a café with a classmate.", [
    ["一緒に行きませんか。", "issho ni ikimasen ka", "Would you like to go together?", "Verb + ませんか can be a polite invitation."],
    ["三時はどうですか。", "sanji wa dou desu ka", "How about three o'clock?", "Time + はどうですか proposes a time."],
    ["いいですね。", "ii desu ne", "That sounds good.", "A friendly response to an appealing suggestion."],
  ], [["カフェに行きます。", "I'm going to a café.", "Ask whether they would like to go together.", 0], ["何時に会いましょうか。", "What time shall we meet?", "Suggest three o'clock.", 1]]),
  mission("transport", "Buy a train ticket", "Ask for a ticket and find the platform.", "Practise at a station counter. Tokyo is the sample destination.", [
    ["東京までお願いします。", "toukyou made onegaishimasu", "To Tokyo, please.", "まで marks the destination limit: as far as Tokyo."],
    ["一枚ください。", "ichimai kudasai", "One ticket, please.", "枚 counts flat things, including tickets."],
    ["何番線ですか。", "nanbansen desu ka", "Which platform / track is it?", "番線 is used for numbered railway tracks."],
  ], [["どちらまでですか。", "Where are you going?", "Ask for Tokyo.", 0], ["何枚ですか。", "How many tickets?", "Ask for one ticket.", 1]]),
  mission("restaurant", "Eat at a restaurant", "Ask for a menu and the bill.", "You are a customer speaking politely to restaurant staff.", [
    ["メニューをお願いします。", "menyuu o onegaishimasu", "The menu, please.", "Noun + をお願いします is another polite request."],
    ["これをお願いします。", "kore o onegaishimasu", "This one, please.", "Point to the dish on the menu."],
    ["お会計をお願いします。", "okaikei o onegaishimasu", "The bill, please.", "Use when you are ready to pay."],
  ], [["はい、ご用件は？", "Yes, how can I help?", "Ask for the menu.", 0], ["ご注文はお決まりですか。", "Have you decided what to order?", "Point to a dish and request it.", 1]]),
  mission("weather", "Make small talk", "Comment on the weather and ask a follow-up.", "Talk about today's weather with someone you know.", [
    ["今日は暑いですね。", "kyou wa atsui desu ne", "It's hot today, isn't it?", "ね invites agreement or a shared reaction."],
    ["今日は寒いですね。", "kyou wa samui desu ne", "It's cold today, isn't it?", "寒い describes cold weather, not a cold drink."],
    ["明日も暑いですか。", "ashita mo atsui desu ka", "Will it be hot tomorrow too?", "も means also / too here."],
  ], [["いい天気ですね。", "It's nice weather, isn't it?", "Comment that it is hot today.", 0], ["今日は暑いです。", "It's hot today.", "Ask whether tomorrow will also be hot.", 2]]),
  mission("language", "Keep a conversation going", "Explain that you are learning and ask for a word's meaning.", "Use these phrases whenever a conversation becomes difficult.", [
    ["日本語を勉強しています。", "nihongo o benkyou shite imasu", "I'm studying Japanese.", "しています describes an ongoing activity or situation."],
    ["どういう意味ですか。", "dou iu imi desu ka", "What does that mean?", "Ask about a word or expression you just heard."],
    ["日本語で何と言いますか。", "nihongo de nan to iimasu ka", "How do you say it in Japanese?", "Point to something or make the subject clear first."],
  ], [["日本語がわかりますか。", "Do you understand Japanese?", "Explain that you are studying Japanese.", 0], ["これはお土産です。", "This is a souvenir.", "You don't know the word. Ask what it means.", 1]]),
];
