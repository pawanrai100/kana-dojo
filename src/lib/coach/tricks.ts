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

// katakana: straight lines and sharp corners, so the hooks are blockier
const KATA: Record<string, string> = {
  ア: "An axe hacking down: \"a!\"",
  イ: "An eagle perched on a branch: \"i\" (eagle).",
  ウ: "Like う with a little roof on: \"u\".",
  エ: "An elevator shaft, top and bottom floor: \"e\" (elevator).",
  オ: "An opera singer with arms spread wide: \"o\".",
  カ: "Same shape as か, just without the extra dash: \"ka\".",
  キ: "A key with two teeth, like き but blockier: \"ki\".",
  ク: "A cook's hat seen from the side: \"ku\" (cook).",
  ケ: "A crooked K: \"ke\".",
  コ: "A corner of a box, like a cord wrapped around: \"ko\".",
  サ: "A signpost with two poles: \"sa\" (sign).",
  シ: "A smiley face looking up and to the side: \"shi\" (she's smiling). Dashes lie flat, the tail swoops UP.",
  ス: "A person doing a big stride on a ski: \"su\" (ski... su).",
  セ: "Like せ, a mouth with one sharp tooth: \"se\".",
  ソ: "A sewing needle and a stitch dropping DOWN: \"so\". Dashes stand up, the tail falls from the top.",
  タ: "Like ク with a bar across: a taco folded over: \"ta\".",
  チ: "A cheerleader with a big chin, standing tall: \"chi\".",
  ツ: "Two eyes and a tsunami swooping DOWN: \"tsu\". Dashes stand up, the tail comes from the top.",
  テ: "A telephone pole with wires: \"te\".",
  ト: "A totem pole with one branch: \"to\".",
  ナ: "A knife stabbed through: \"na\" (knife).",
  ニ: "Two needles lying flat: \"ni\" (needle).",
  ヌ: "Chopsticks pinching noodles: \"nu\".",
  ネ: "A nail with a necktie: \"ne\".",
  ノ: "One single slash. No!: \"no\".",
  ハ: "Two people walking away laughing: \"ha\".",
  ヒ: "A heel kicking out: \"hi\" (heel).",
  フ: "Mount Fuji's one big slope: \"fu\".",
  ヘ: "Exactly the same as hiragana へ: \"he\".",
  ホ: "A holy cross with two little feet: \"ho\".",
  マ: "A mama bird's beak pointing down: \"ma\".",
  ミ: "Three missiles flying up: \"mi\".",
  ム: "A cow's face with its moo: \"mu\".",
  メ: "An X marks the spot on a map. Mark: \"me\".",
  モ: "Like も, a fishhook with more bait: \"mo\".",
  ヤ: "A yak's horn: \"ya\".",
  ユ: "A U-turn sign drawn with straight lines: \"yu\".",
  ヨ: "A backwards E like a yo-yo stack: \"yo\".",
  ラ: "A rabbit with one ear flat: \"ra\".",
  リ: "Like り, two reeds: \"ri\".",
  ル: "Two roots growing down: \"ru\".",
  レ: "A leg kicking: \"re\".",
  ロ: "A square road sign: \"ro\".",
  ワ: "A wine glass on its side: \"wa\".",
  ヲ: "Like フ with a bar through it: \"wo\". Pretty rare in katakana.",
  ン: "A needle stitch dropping down, n: \"n\". It tilts more than ソ.",
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
  "シ|ツ": "シ's dashes lie flat and the tail swoops up from the bottom. ツ's dashes stand up and the tail falls from the top.",
  "ソ|ン": "ソ's dash stands up and the stroke falls from the top. ン's dash lies flat and the stroke swoops up.",
  "ク|ケ": "ケ has a line that sticks out past the roof. ク's roof is closed.",
  "ク|タ": "タ is ク with an extra dash inside.",
  "ケ|タ": "タ has a dash inside a closed roof. ケ's top line sticks out.",
  "ウ|ワ": "ウ has a little dash on top. ワ doesn't.",
  "フ|ワ": "ワ has a short line on the left side. フ doesn't.",
  "ウ|フ": "ウ has a dash on top and a line on the left. フ is just the one hook.",
  "チ|テ": "チ's bottom stroke sweeps to the left. テ's goes straight down then left.",
  "ス|ヌ": "ヌ has an extra dash crossing it. ス doesn't.",
  "コ|ユ": "ユ's bottom line sticks out to the left. コ is a clean corner.",
  "ロ|ユ": "ロ is a closed box. ユ is open on the left.",
  "コ|ロ": "ロ is a closed box. コ is open on the left.",
  "ア|マ": "ア has a tail going down the middle. マ just has a little dash.",
  "ナ|メ": "ナ is a cross with a long line. メ is an X.",
  "メ|ノ": "ノ is one slash. メ adds a second stroke to make an X.",
  "ル|レ": "ル has two strokes. レ is one.",
  "ヨ|ヲ": "ヨ has three bars. ヲ is a hook with a bar through it.",
  "カ|ヤ": "カ's hook points down. ヤ's sweeps up and right.",
  "シャ|ジャ": "The two dashes ゛ turn sha into ja.",
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
  if (k.length !== 1 || groupOf(k)?.kind !== "dakuten") return undefined;
  for (const back of [1, 2]) {
    const b = String.fromCharCode(k.charCodeAt(0) - back);
    if (BASIC[b] || KATA[b]) return b;
  }
  return undefined;
}

export function trickFor(k: string): string {
  if (BASIC[k]) return BASIC[k];
  if (KATA[k]) return KATA[k];
  if (k === SMALL_TSU) return "A small っ is a tiny pause. Double the next consonant: きって is kitte, not kitsute.";
  if (k === "ッ") return "Small ッ works just like っ. Double the next consonant: サッカー is sakkaa.";
  if (k === "ー") return "The bar ー stretches the vowel before it. コーヒー is koohii: say the o twice as long.";
  if (groupOf(k)?.kind === "extended") return `A small ${k.slice(1)} glues on to make a sound Japanese borrowed: ${k} = ${readingOf(k)}.`;
  const base = baseOf(k);
  if (base) {
    const row = getKana(base)?.romaji[0][0] ?? "";
    return `It's ${base} (${readingOf(base)}) with a mark. ${MARK_RULE[row] ?? ""}`.trim();
  }
  if (k.length === 2) {
    const first = k[0];
    const big = { ゃ: "や", ゅ: "ゆ", ょ: "よ", ャ: "ヤ", ュ: "ユ", ョ: "ヨ" }[k[1]] ?? k[1];
    return `${first} (${readingOf(first)}) + a small ${k[1]} glue into one beat: ${readingOf(k)}. Say it fast, not ${readingOf(first)}-${readingOf(big)}.`;
  }
  return `Say it out loud as you type it: ${readingOf(k)}.`;
}

// how to tell k from its twin t, if they're a known lookalike pair
export function twinDiff(k: string, t: string): string | undefined {
  if (!LOOK_OF.get(k)?.includes(t)) return undefined;
  return DIFF[pair(k, t)] ?? (/[ばびぶべぼぱぴぷぺぽバビブベボパピプペポ]/.test(k + t) ? MARK_DIFF : undefined);
}
