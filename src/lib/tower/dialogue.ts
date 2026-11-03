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
    intro: "Ook ook! Nobody gets past the gate without reading for me.",
    lose: ["Hehehe! I'm keeping your answers. And your banana.", "You read {k} like a monkey reads a map. Badly.", "Ook! Back to the start, rookie."],
    slow: "Too slow! I peeled three bananas while you were thinking.",
    win: ["Ook... fine. Take the gate. I'm going to go sulk in a tree.", "You beat me?! Nobody tells the other monkeys about this."],
  },
  orochi: {
    intro: "Sssso... another little reader has slithered into my hall.",
    lose: ["Ssssloppy. {k} slipped right past you.", "My words coil, and you got all tangled up.", "Hisss... come back when your eyes are sharper."],
    slow: "Sssslow. I could shed my whole skin in the time you took.",
    win: ["Hsss... you untangled every word. Impressive, little one.", "The coils loosen. Go on, the hall is yours."],
  },
  kitsune: {
    intro: "Ara ara~ Let's see if you can tell my twins apart.",
    lose: ["Fooled you~ {k} wasn't what you thought it was.", "A fox never plays fair. You fell for every trick.", "Hehe~ even my tails can read better than that."],
    slow: "Ara~ did you fall asleep? A fox doesn't wait.",
    win: ["Hmph. You saw through every trick... this time.", "Fine, fine~ my tails bow to you. Just this once."],
  },
  tako: {
    intro: "Eight arms. Eight times faster than you. Let's go!",
    lose: ["Eight arms and I still got more right than you!", "Ink to the face! {k} got you good.", "Glub glub. Better luck next tide."],
    slow: "I answered with all eight arms before you lifted one finger.",
    win: ["Glub... you out-read an octopus. That's never happened.", "Okay okay, I'll un-ink the hallway. You earned it."],
  },
  kozo: {
    intro: "One eye. Zero mercy. Read or fall.",
    lose: ["My one eye saw {k} clearly. Did your two?", "Zero mercy. Told you.", "Blink and you lose. You blinked."],
    slow: "I don't even need to blink. You need to hurry.",
    win: ["...Two eyes beat one. Today. Only today.", "The roof is yours. The peak waits above."],
  },
  ryu: {
    intro: "I built this tower with my own claws. Show me you deserve the top.",
    lose: ["Every one of the 46 bows to me. {k} included.", "The dragon does not fall to half a reader.", "Go back down. Train. Then climb again."],
    slow: "My katana is faster than your keyboard. Much faster.",
    win: ["...You read like a dragon. The tower is yours, champion.", "My blade is lowered. You've mastered the 46. Now look up... the sky is calling."],
  },
  shikappa: {
    intro: "Don't spill my dish! Read fast or I'll drag you into the river.",
    lose: ["Splash! Into the river with you. {k} sank you.", "My dish didn't spill a single drop. Try again.", "Hah! You read like a fish out of water."],
    slow: "My dish is still full. You were too slow to make me bow.",
    win: ["Gah! My dish! It spilled... you win this one.", "Fine, you beat a kappa. Go get a cucumber, you earned it."],
  },
  alekoni: {
    intro: "Ba or pa? Pa or ba? Let's find out if you can see the difference.",
    lose: ["Haha! Was it ば or ぱ? You'll never know!", "Dashes, circles... you mixed up {k}. Classic.", "Oni win! Oni always win!"],
    slow: "Too slow! My club swings faster than you read.",
    win: ["Grr... you saw every dash and every circle.", "Okay okay! No more swapping. You beat me fair."],
  },
  stellatsune: {
    intro: "Welcome to my moon bridge~ Can you keep up when I blend the sounds?",
    lose: ["Oh dear~ {k} got away from you.", "My combos were too cute for you to read, hm?", "Better luck next moon~"],
    slow: "Hurry hurry~ the moon won't wait for you.",
    win: ["Ara~ you read every combo. I'm actually impressed.", "Fine~ cross my bridge. Don't fall off!"],
  },
  minjimata: {
    intro: "Nyaa. I have nine lives. You have three hearts. Good luck.",
    lose: ["Nyahaha! Still got all nine lives. {k} scratched you up.", "Too slow for a cat, too slow for anyone. Nyaa.", "Purrr... come back when you can read in the dark."],
    slow: "I took a nap and woke up. You were still typing. Nyaa.",
    win: ["Hss... you took one of my lives. Just one!", "Nyaa... fine. You can pet me. Once."],
  },
  ayutengu: {
    intro: "Hmph. You dare climb into MY clouds? Read like the wind or go home.",
    lose: ["Hmph! My nose is longer than your streak.", "Even the clouds read {k} better than you.", "Fly back down, little bird."],
    slow: "The wind blew right past you. Too slow!",
    win: ["My nose... it's still long, but you were faster.", "The clouds part for you. Don't let it go to your head."],
  },
  pramirei: {
    intro: "...shh. Listen for the pauses. That's where I hide.",
    lose: ["...you missed the pause. {k} was waiting there.", "...boo. Did I scare the answer out of you?", "...come back. I'll be here. I'm always here."],
    slow: "...time drifts. So did you. Too slow.",
    win: ["...you heard every pause. I can rest now.", "...thank you. Go. The peak is close."],
  },
  basarihyon: {
    intro: "So you made it to the top. Every yokai answers to me. Let's see if you can read like a lord.",
    lose: ["A whole sentence and you tripped on {k}? Pathetic.", "Hah! The throne stays mine.", "Go back down and practise. I'll be sitting right here."],
    slow: "A lord doesn't wait for slow readers. Too slow!",
    win: ["Impossible... a reader who reads like a lord. The shrine is yours.", "...Fine. Sit on the throne. But I'll be watching."],
  },
};

// pick one line. seed is anything that changes per fight so lines rotate
export function bossLine(id: string, kind: "lose" | "win", seed: number, missed?: string): string | undefined {
  const d = DIALOGUE[id];
  if (!d) return undefined;
  const pool = d[kind].filter((l) => missed || !l.includes("{k}"));
  const line = pool[Math.abs(seed) % pool.length];
  return missed ? line.replace("{k}", missed) : line;
}

export function bossSlowLine(id: string): string | undefined {
  return DIALOGUE[id]?.slow;
}

export function bossIntro(id: string): string | undefined {
  return DIALOGUE[id]?.intro;
}
