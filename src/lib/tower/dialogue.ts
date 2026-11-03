// what each boss says. {k} becomes a kana you just missed.
// intro plays on the entrance, lose when it beats you, slow when the timer did,
// win when you take it down

export interface BossLines {
  intro: string;
  lose: string[];
  slow: string;
  win: string[];
}

export const DIALOGUE: Record<string, BossLines> = {
  saru: {
    intro: "You? Past MY gate? I've eaten bananas scarier than you.",
    lose: ["HAHAHA! Get out of my jungle, rookie.", "{k}? You couldn't even read {k}? I'm a MONKEY and I can read that.", "Easiest fight of my life. Send someone harder."],
    slow: "I peeled, ate, and threw the skin at you before you finished typing.",
    win: ["No... NO! Beaten by a beginner?! Don't tell the other monkeys.", "Tch. Lucky. Take the gate before I change my mind."],
  },
  orochi: {
    intro: "Ssslither closer, little snack. My words will squeeze the life out of you.",
    lose: ["Crushed. Swallowed. Forgotten. Just like {k}.", "You're not a reader. You're lunch.", "Every word I gave you, you choked on. Pathetic."],
    slow: "I swallowed you whole while you were still sounding it out.",
    win: ["Impossible... you slipped right out of my coils.", "Hssss... fine. You're too tough to swallow. Go."],
  },
  kitsune: {
    intro: "Ara~ another fool who thinks they can tell my twins apart. Cute.",
    lose: ["Tricked you~ {k} was never what you thought it was. Idiot.", "Nine tails, zero effort. You never stood a chance~", "You fell for EVERY trick. Did you even look?"],
    slow: "Too slow~ I could've tricked you ten more times while you sat there.",
    win: ["...How? Nobody sees through my illusions.", "Hmph! You got lucky. My twins will get you next time~"],
  },
  tako: {
    intro: "Eight arms. Eight times faster. Zero chance for you.",
    lose: ["INKED! {k} got you and I didn't even try.", "Eight arms beat two hands. Every. Single. Time.", "Go home and cry into the sea, loser."],
    slow: "I answered with all eight arms before you moved a finger. Embarrassing.",
    win: ["Out-read by a land walker?! My arms are SHAKING.", "Okay... you're fast. Faster than eight arms. Respect."],
  },
  kozo: {
    intro: "One eye is all I need to see how weak you are.",
    lose: ["I saw {k} with ONE eye. You had two. Think about that.", "Zero mercy. Zero chance. Zero brain.", "You blinked. You lost. Get off my roof."],
    slow: "I don't blink. You don't hurry. That's why you lost.",
    win: ["...Fine. Two eyes beat one. Today.", "My eye... it's watering. NOT because I lost. Go."],
  },
  ryu: {
    intro: "I built this tower with my own claws. Kneel, or read.",
    lose: ["You dare face the dragon and miss {k}? Back to floor one.", "That was your best? My katana didn't even leave its sheath.", "Kneel. You are not worthy of the summit."],
    slow: "My blade cut you down three times before you read one word.",
    win: ["...You read like a dragon. I bow to you, champion.", "My katana falls. The tower is yours. Now look up... the sky is waiting."],
  },
  shikappa: {
    intro: "Come here so I can drag you into the river. Don't even think about spilling my dish.",
    lose: ["SPLASH! Sink to the bottom with {k}.", "Didn't spill a drop. You're not even a challenge.", "Drowned. Next!"],
    slow: "My dish didn't even wobble. That's how slow you were.",
    win: ["MY DISH! You spilled my dish?! ...Okay that was cool.", "Grrr... you beat a kappa. Fine. Take your cucumber and go."],
  },
  alekoni: {
    intro: "Ba or pa? Dash or circle? Get it wrong and my club gets you.",
    lose: ["BONK! Dash or circle, you got {k} wrong. Classic.", "Oni smash! Oni win! You lose!", "Can't even see a little circle? Get glasses."],
    slow: "My club swung twice before you read once. BONK.",
    win: ["Grr... you saw every dash AND every circle. Annoying.", "OKAY! No more tricks! You win, you win!"],
  },
  stellatsune: {
    intro: "Welcome to my moon bridge~ Shame you'll be falling off it.",
    lose: ["Bye bye~ {k} pushed you right off my bridge.", "My combos were too pretty for your tiny brain, hm?", "Oh, you lost? I barely noticed~"],
    slow: "Hurry hurry~ oh wait, too late. Bye~",
    win: ["...Ara. You actually read all of that? Fine, I'm impressed.", "Cross my bridge then~ but I'm watching you."],
  },
  minjimata: {
    intro: "Nyaa. Nine lives. Three hearts. Do the math.",
    lose: ["Nyahaha! {k} scratched you right up. Still got all nine lives~", "You read like a dog. Nyaa.", "Scram. I'm going back to sleep."],
    slow: "I napped, woke up, and napped again. You were still typing. Nyaa.",
    win: ["HSSS! You took one of my lives! ...Just one!", "Nyaa... fine. You can pet me. ONCE."],
  },
  ayutengu: {
    intro: "You dare enter MY sky? Read like the wind or fall like a rock.",
    lose: ["My nose is longer than your whole streak. {k}? Seriously?", "Fall back down to earth where you belong.", "The clouds are laughing at you. So am I."],
    slow: "The wind blew past, then came back, then left again. Still waiting on you.",
    win: ["My nose... is still magnificent. But you were faster.", "Tch. The sky opens for you. Don't let it go to your head."],
  },
  pramirei: {
    intro: "...shh. I live in the pauses. You'll never find me.",
    lose: ["...you missed the pause. {k} was right there. Boo.", "...haunted. You'll hear my pauses in your sleep.", "...I'll be here. Forever. Waiting for you to fail again."],
    slow: "...time stopped. You didn't move. ...boring.",
    win: ["...you heard every pause. ...I'm free now. Thank you.", "...fine. The peak is yours. ...I'll haunt someone else."],
  },
  // katakana tower: neon city
  k1: {
    intro: "My third eye has been watching you since the gate. It saw every mistake you're about to make.",
    lose: ["My eye saw you miss {k} before you even typed it.", "One extra eye and I still read faster than you with two.", "Get off my mountain. My box has spikes for a reason."],
    slow: "I blinked with all three eyes. You still hadn't answered.",
    win: ["My eye... it's watering. You saw something I didn't.", "Tch. Fine. My third eye will remember your face."],
  },
  k2: {
    intro: "My neck stretches over the whole street. You can't run, you can't hide, you can only read.",
    lose: ["I wrapped my neck around {k} and choked you with it.", "Long words, longer neck, and you came up SHORT.", "Stretched you thin. Snapped you. Next."],
    slow: "My neck reached across the city and back before you finished one word.",
    win: ["Ugh... my neck is tied in a knot. How did you do that?", "Fine. Walk past. I'll just... untangle myself."],
  },
  k3: {
    intro: "Behind this mask is a grin you'll see in your nightmares. Every kana here is wearing a disguise.",
    lose: ["Fooled you! {k} was wearing a mask and you fell for it.", "HAHAHA! You can't even see through a cheap disguise.", "My mask is smiling. So am I. You lost."],
    slow: "I swapped masks three times while you sat there staring.",
    win: ["My mask... it cracked. You saw right through me.", "Grr... no more disguises. You win this one."],
  },
  k4: {
    intro: "Welcome to my web. Eight legs, eight eyes on your mistakes. Step carefully.",
    lose: ["Stuck! {k} was a strand in my web and you walked right into it.", "Wrapped up and ready to eat. Thanks for dinner.", "Eight legs. Zero escape. Sit tight."],
    slow: "I spun a whole new web while you were thinking. Sticky, isn't it?",
    win: ["You cut my web?! Every strand?!", "Hssss... crawl on through. My web is ruined anyway."],
  },
  k5: {
    intro: "TWO heads! TWO mouths! TWICE the reasons you're about to lose!",
    lose: ["Left head: \"{k}? Seriously?\" Right head: \"Seriously.\"", "Double the heads, double the laughing. HAHA HAHA.", "We both saw that coming. Both of us. Every time."],
    slow: "We argued with each other for a whole minute and you STILL weren't done.",
    win: ["Left head: \"We lost.\" Right head: \"Don't talk to me.\"", "Two heads and neither of us saw that coming. Go."],
  },
  k6: {
    intro: "Hyper Lane. Fast sounds, foreign sounds, no brakes. Keep up.",
    lose: ["You crashed on {k}. In the slow lane.", "Too fast for you? This is MY lane.", "ファ, ティ, ヴ... you choked on all of them."],
    slow: "I lapped you twice. Pull over.",
    win: ["You... overtook me? On MY lane?", "Speed record broken. Ugh. Go on to the top."],
  },
  k7: {
    intro: "Lanterns lit. Bones rattling. Every sign in Neon City answers to me, the Bone King.",
    lose: ["You climbed my whole city and tripped on {k}? I'll add your bones to my collection.", "My skeleton has no brain and it STILL reads better than you.", "Rattle rattle. That's the sound of you losing."],
    slow: "I'm a skeleton. I have all the time in the world. You don't.",
    win: ["My bones... they're crumbling. The crown is yours, reader.", "Hah... the lanterns go out for me. Neon City bows to you."],
  },
  basarihyon: {
    intro: "You climbed all this way just to lose to me? Every yokai bows to the Lord. So will you.",
    lose: ["You tripped on {k}? In front of the LORD? Shameful.", "The throne stays mine. It was never in danger.", "Crawl back down. Come back when you're worth my time."],
    slow: "A Lord does not wait. You took forever. Dismissed.",
    win: ["Impossible... a reader worthy of the throne. Take it.", "...You win. Every yokai in this shrine now answers to YOU."],
  },
};

// pick one line. seed is anything that changes per fight so lines rotate
export function bossLine(id: string, kind: "lose" | "win", seed: number, missed?: string): string | undefined {
  const d = DIALOGUE[id];
  if (!d) return undefined;
  const pool = d[kind].filter((l) => missed || !l.includes("{k}"));
  const line = pool[Math.abs(seed) % pool.length];
  return missed ? line.replaceAll("{k}", missed) : line;
}

export function bossSlowLine(id: string): string | undefined {
  return DIALOGUE[id]?.slow;
}

export function bossIntro(id: string): string | undefined {
  return DIALOGUE[id]?.intro;
}
