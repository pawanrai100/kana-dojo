import { LOOKALIKES, SMALL_TSU, getKana, groupOf, readingOf } from "@/lib/kana/hiragana";

// little memory hooks for each basic kana. picture it, say the sound
const BASIC: Record<string, string> = {
  あ: "Someone doing a huge stretch after waking up: \"aaah\".",
  い: "Two eels swimming side by side: \"ii\" (eel).",
  う: "Someone bent over holding their stomach: \"uuu\".",
  え: "A ninja mid-kick shouting \"eh!\"",
  お: "Like あ, but with a little tail flicking off the side: \"oh!\"",
  か: "A karate chop that leaves a spark: \"KA!\"",
  き: "An old key with two teeth: \"ki\" (key).",
  く: "A bird's open beak going \"ku ku\".",
  け: "A keg standing next to its tap: \"ke\" (keg).",
  こ: "Two coins stacked on top of each other: \"ko\" (coin).",
  さ: "Like き with one bar missing. Sad it lost a line: \"sa\".",
  し: "A fishhook. She caught a fish: \"shi\".",
  す: "A swing with a loop in the rope: \"su\" (swing).",
  せ: "A mouth wide open with one tooth, about to say \"se\".",
  そ: "A zigzag sewing stitch: \"so\" (sew).",
  た: "It's basically the letters t and a squished together: \"ta\".",
  ち: "A cheerleader with a big chin looking right: \"chi\" (chin).",
  つ: "A tsunami wave curling over: \"tsu\".",
  て: "An arm reaching out to grab something. Te even means hand.",
  と: "A toe with a splinter stuck in it: \"to\" (toe).",
  な: "A nun praying next to a cross: \"na\".",
  に: "A knee poking out next to two lines: \"ni\" (knee).",
  ぬ: "Noodles twirled on chopsticks, with a loop at the end: \"nu\" (noodle).",
  ね: "A cat curling its tail into a loop. Cat is neko: \"ne\".",
  の: "A big \"no\" sign: one round swirl.",
  は: "Two people laughing next to each other: \"ha ha\".",
  ひ: "A big cheesy grin: \"hee hee\".",
  ふ: "Mount Fuji with little puffs around it: \"fu\".",
  へ: "A tiny hill. Heh, Fuji's little brother: \"he\".",
  ほ: "Like は with an extra roof line on top: \"ho ho ho\".",
  ま: "A mama with a belt loop at the bottom: \"ma\".",
  み: "Looks like the number 21. Me at twenty-one: \"mi\".",
  む: "A cow's face with one horn going \"mu\" (moo).",
  め: "An eye with no loop at the end. Me means eye in Japanese.",
  も: "A fishhook with two worms on it. More bait: \"mo\".",
  や: "A yak with big horns: \"ya\".",
  ゆ: "A fish swimming in a U-turn: \"yu\".",
  よ: "A yo-yo hanging from a string: \"yo\".",
  ら: "A rabbit with one ear up: \"ra\".",
  り: "Two reeds by a river, the right one longer: \"ri\".",
  る: "A road that loops back on itself at the end: \"ru\" (route).",
  れ: "Someone kneeling with one leg kicked out flat: \"re\".",
  ろ: "A road that just stops open, no loop: \"ro\" (road).",
  わ: "A whale's tail curving down into the water: \"wa\".",
  を: "A wobbly person tripping over: \"wo\". As a particle it sounds like o.",
  ん: "A lowercase n written in one quick swoop: \"n\".",
};

// how to tell the twins apart, keyed by sorted pair
const DIFF: Record<string, string> = {
  "ぬ|め": "ぬ ends with a little loop. め just stops.",
  "ね|れ": "Same left side. ね ends in a loop, れ kicks out flat.",
  "ね|わ": "Same left side. ね ends in a loop, わ curves down round with no loop.",
  "れ|わ": "Same left side. れ kicks out flat at the end, わ curves down round.",
  "る|ろ": "る has a loop at the bottom. ろ stays open.",
  "さ|ち": "Mirror twins. さ curves out to the left at the bottom, ち bulges out to the right.",
  "き|さ": "き has two bars across, さ has one.",
  "き|ち": "き has two bars across and a separate bottom stroke. ち has one bar and a big bulge.",
  "は|ほ": "ほ has an extra line on top of the right side. は doesn't.",
  "い|り": "い is two short even strokes. り's right stroke is long and drops down.",
  "こ|に": "に has an extra line standing on the left. こ is just the two lines.",
  "あ|お": "In あ the cross stroke goes all the way through. お's flicks off to the side.",
  "ま|も": "ま has two bars and a loop at the bottom. も is a hook with two bars.",
  "く|へ": "く points left like <. へ is a flat little hill like ^.",
  "そ|ろ": "そ is a zigzag with a tail. ろ is a loose 3.",
  "じ|ぢ": "Same sound. ぢ is rare, so if you see it, type ji (or di).",
  "ず|づ": "Same sound. づ is rare, so if you see it, type zu (or du).",
  "しゃ|じゃ": "The two dashes ゛ turn sha into ja.",
  "しょ|じょ": "The two dashes ゛ turn sho into jo.",
};
const MARK_DIFF = "Two dashes ゛ make a b sound. A tiny circle ゜ makes a p sound.";

const MARK_RULE: Record<string, string> = {
  k: "The ゛ turns k into g.",
  s: "The ゛ turns s into z (and し into ji).",
  t: "The ゛ turns t into d (ぢ and づ are read ji and zu).",
  h: "Two dashes ゛ turn h into b. The circle ゜ turns it into p.",
};

const pair = (a: string, b: string) => [a, b].sort().join("|");
const LOOK_OF = new Map(LOOKALIKES.flatMap((g) => g.map((k) => [k, g] as const)));

// dakuten kana sit right after their plain version in unicode: か+1 = が, は+2 = ぱ
function baseOf(k: string): string | undefined {
  if (k.length !== 1 || groupOf(k)?.id !== "dakuten") return undefined;
  for (const back of [1, 2]) {
    const b = String.fromCharCode(k.charCodeAt(0) - back);
    if (BASIC[b]) return b;
  }
  return undefined;
}

export function trickFor(k: string): string {
  if (BASIC[k]) return BASIC[k];
  if (k === SMALL_TSU) return "A small っ is a tiny pause. Double the next consonant: きって is kitte, not kitsute.";
  const base = baseOf(k);
  if (base) {
    const row = getKana(base)?.romaji[0][0] ?? "";
    return `It's ${base} (${readingOf(base)}) with a mark. ${MARK_RULE[row] ?? ""}`.trim();
  }
  if (k.length === 2) {
    const first = k[0];
    return `${first} (${readingOf(first)}) + a small ${k[1]} glue into one beat: ${readingOf(k)}. Say it fast, not ${readingOf(first)}-${readingOf(k[1] === "ゃ" ? "や" : k[1] === "ゅ" ? "ゆ" : "よ")}.`;
  }
  return `Say it out loud as you type it: ${readingOf(k)}.`;
}

// how to tell k from its twin t, if they're a known lookalike pair
export function twinDiff(k: string, t: string): string | undefined {
  if (!LOOK_OF.get(k)?.includes(t)) return undefined;
  return DIFF[pair(k, t)] ?? (/[ばびぶべぼぱぴぷぺぽ]/.test(k + t) ? MARK_DIFF : undefined);
}
