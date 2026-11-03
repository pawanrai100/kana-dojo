import { BASIC_KANA_LIST, KANA_GROUPS, KATAKANA_BASIC_LIST, getRow } from "@/lib/kana/hiragana";
import type { LengthRange, PracticeMode, TimerPace } from "@/lib/settings/types";

// the tower climbs the hiragana chart. each zone teaches two rows,
// then mixes them, then a yokai boss tests everything learned so far

export type FloorKind = "floor" | "boss" | "final";

export interface Boss {
  id: string;
  name: string;
  kana: string;
  title: string; // reward title
  blurb: string;
}

// who you fight on a floor. art is keyed by id
export interface Enemy {
  id:
    | "obake"
    | "shisa"
    | "goblin"
    | "skeleton"
    | "kodama"
    | "kasa"
    | "saru"
    | "orochi"
    | "kitsune"
    | "tako"
    | "kozo"
    | "ryu"
    | "shikappa"
    | "alekoni"
    | "stellatsune"
    | "minjimata"
    | "ayutengu"
    | "pramirei"
    | "basarihyon"
    // katakana tower bosses, waiting on drawings
    | "k1"
    | "k2"
    | "k3"
    | "k4"
    | "k5"
    | "k6"
    | "k7";
  name: string;
}

// regular floors get plain monsters, never anyone's name. only bosses are friends.
// they take turns zone by zone so the climb doesn't feel samey
export const MINIONS = {
  drill: [
    { id: "goblin", name: "Goblin" },
    { id: "obake", name: "Lantern Ghost" },
  ],
  mix: [
    { id: "skeleton", name: "Skeleton" },
    { id: "shisa", name: "Shisa Guard" },
  ],
} satisfies Record<string, Enemy[]>;

const SKY_MINIONS = {
  drill: [
    { id: "kodama", name: "Kodama" },
    { id: "goblin", name: "Sky Goblin" },
  ],
  mix: [
    { id: "kasa", name: "Umbrella Ghost" },
    { id: "skeleton", name: "Bone Samurai" },
  ],
} satisfies Record<string, Enemy[]>;

export interface Zone {
  id: number;
  name: string;
  drills: string[][]; // each inner list = the rows taught on one floor
  boss: Boss;
  extra?: string[]; // kana mixed in on drill floors (small っ needs something to double)
  mixName?: string; // shorter name for the zone's mix floor
  mixMode?: PracticeMode; // ex real words for small っ
}

export type TowerId = "kana" | "sky" | "kata";

export interface Floor {
  id: number; // 1 = ground floor of the first tower, sky shrine floors start at 101
  tower: TowerId;
  zone: number;
  kind: FloorKind;
  name: string;
  chars: string[];
  newChars: string[]; // what this floor introduces, for the map
  mode: PracticeMode;
  lengthRange: LengthRange;
  pace: Exclude<TimerPace, "off">;
  enemyHp: number; // correct answers needed
  hearts: number; // misses allowed
  bonusXp: number;
  enemy: Enemy;
  boss?: Boss;
}

export const ZONES: Zone[] = [
  {
    id: 1,
    name: "Bamboo Gate",
    drills: [["vowel"], ["k"]],
    boss: { id: "saru", name: "Ugyasaru", kana: "うぎゃさる", title: "Ugyasaru Tamer", blurb: "A buck-toothed mountain monkey guarding the gate. Don't let him steal your answers." },
  },
  {
    id: 2,
    name: "Lantern Hall",
    drills: [["s"], ["t"]],
    boss: { id: "orochi", name: "Hyunorochi", kana: "ひゅのろち", title: "Hyunorochi Charmer", blurb: "A grinning orochi serpent coiled in the hall. Its words slither past you." },
  },
  {
    id: 3,
    name: "Moon Garden",
    drills: [["n"], ["h"]],
    boss: { id: "kitsune", name: "Ayutsune", kana: "あゆつね", title: "Ayutsune Whisperer", blurb: "A sly kitsune fox spirit that loves lookalike kana." },
  },
  {
    id: 4,
    name: "Mountain Pass",
    drills: [["m"], ["y"]],
    boss: { id: "tako", name: "Deeptako", kana: "でぃぷたこ", title: "Deeptako Wrangler", blurb: "A tako octopus yokai with eight arms and a huge grin. It reads fast, so read faster." },
  },
  {
    id: 5,
    name: "Thunder Roof",
    drills: [["r"], ["w", "nn"]],
    boss: { id: "kozo", name: "Jinkozō", kana: "じんこぞう", title: "Jinkozō Breaker", blurb: "A one-eyed hitotsume-kozō on the last roof before the peak. One eye, zero mercy." },
  },
];

export const FINAL_BOSS: Boss = {
  id: "ryu",
  name: "Pawaryū the Dragon",
  kana: "ぱわりゅう",
  title: "Dragon Slayer",
  blurb: "The katana-wielding dragon who built this tower. Every one of the 46 kana, fast, with three hearts.",
};

// difficulty ramps by zone (index 0 = zone 1). words get longer, the timer
// gets faster, enemies get tougher and you get fewer hearts as you climb
type Tier = { len: LengthRange; pace: Exclude<TimerPace, "off">; hp: number; hearts: number };
const DRILL: Tier[] = [
  { len: "2-3", pace: "relaxed", hp: 6, hearts: 5 },
  { len: "2-3", pace: "relaxed", hp: 7, hearts: 5 },
  { len: "2-4", pace: "normal", hp: 8, hearts: 4 },
  { len: "2-4", pace: "normal", hp: 9, hearts: 4 },
  { len: "2-5", pace: "normal", hp: 10, hearts: 4 },
];
const MIX: Tier[] = [
  { len: "2-4", pace: "normal", hp: 8, hearts: 5 },
  { len: "2-4", pace: "normal", hp: 9, hearts: 4 },
  { len: "2-5", pace: "normal", hp: 10, hearts: 4 },
  { len: "2-5", pace: "fast", hp: 11, hearts: 4 },
  { len: "3-7", pace: "fast", hp: 12, hearts: 4 },
];
const BOSS: Tier[] = [
  { len: "2-4", pace: "fast", hp: 10, hearts: 3 },
  { len: "2-5", pace: "fast", hp: 12, hearts: 3 },
  { len: "2-5", pace: "fast", hp: 14, hearts: 3 },
  { len: "3-7", pace: "fast", hp: 16, hearts: 3 },
  { len: "3-7", pace: "fast", hp: 18, hearts: 3 },
];
const FINAL: Tier = { len: "3-7", pace: "fast", hp: 25, hearts: 3 };

const rowChars = (ids: string[]) => ids.flatMap((id) => getRow(id)!.chars);
const rowLabel = (id: string) => getRow(id)!.label;
const drillLabel = (ids: string[]) => (ids.length === 1 ? rowLabel(ids[0]) : ids.map((r) => (r === "nn" ? "ん" : rowLabel(r))).join(" + "));
const shortLabel = (ids: string[]) => ids.map((r) => (r === "nn" ? "ん" : rowLabel(r).replace("-row", ""))).join("·");

interface TowerPlan {
  tower: TowerId;
  zones: Zone[];
  final: Boss;
  finalEnemy: Enemy["id"];
  startId: number;
  minions: { drill: Enemy[]; mix: Enemy[] };
  known: string[]; // kana you already have walking in
  finalMode: PracticeMode;
  finalHp: number;
  finalPace: Exclude<TimerPace, "off">;
  finalBonus: number;
  bossBonus: number; // per zone
}

function buildFloors(plan: TowerPlan): Floor[] {
  const out: Floor[] = [];
  const learned: string[] = [...plan.known];
  const ZONES = plan.zones;
  const MINIONS = plan.minions;
  const tower = plan.tower;
  let id = plan.startId;

  for (const z of ZONES) {
    // one floor per new row: drill just that row
    for (const d of z.drills) {
      const fresh = rowChars(d);
      // extras only ride along on the small っ / ー floors, they need something to work on
      const needsExtra = d.some((r) => r.endsWith("xtsu") || r.endsWith("long"));
      const chars = [...fresh, ...(needsExtra ? (z.extra ?? []) : [])];
      const t = DRILL[Math.min(z.id, DRILL.length) - 1];
      out.push({
        tower,
        id: id++,
        zone: z.id,
        kind: "floor",
        name: drillLabel(d),
        chars,
        newChars: fresh,
        mode: "random",
        lengthRange: t.len,
        pace: t.pace,
        enemyHp: t.hp,
        hearts: t.hearts,
        bonusXp: 40 + 10 * (z.id - 1),
        enemy: MINIONS.drill[(z.id - 1) % MINIONS.drill.length],
      });
    }
    const zoneRows = z.drills.flat();
    const zoneChars = rowChars(zoneRows);
    // mix floor: the zone's rows together, longer words
    const m = MIX[Math.min(z.id, MIX.length) - 1];
    out.push({
      tower,
      id: id++,
      zone: z.id,
      kind: "floor",
      name: z.mixName ?? `${z.drills.map(shortLabel).join(" + ")} mix`,
      chars: [...zoneChars, ...(z.extra ?? [])],
      newChars: [],
      mode: z.mixMode ?? "random",
      lengthRange: m.len,
      pace: m.pace,
      enemyHp: m.hp,
      hearts: m.hearts,
      bonusXp: 60 + 15 * (z.id - 1),
      enemy: MINIONS.mix[(z.id - 1) % MINIONS.mix.length],
    });
    learned.push(...zoneChars);
    // boss: everything learned so far, real words where possible
    const b = BOSS[Math.min(z.id, BOSS.length) - 1];
    out.push({
      tower,
      id: id++,
      zone: z.id,
      kind: "boss",
      name: z.boss.name,
      chars: [...learned],
      newChars: [],
      mode: "mixed",
      lengthRange: b.len,
      pace: b.pace,
      enemyHp: b.hp,
      hearts: b.hearts,
      bonusXp: plan.bossBonus * z.id,
      enemy: { id: z.boss.id as Enemy["id"], name: z.boss.name },
      boss: z.boss,
    });
  }

  out.push({
    tower,
    id: id++,
    zone: ZONES.length + 1,
    kind: "final",
    name: plan.final.name,
    chars: [...learned],
    newChars: [],
    mode: plan.finalMode,
    lengthRange: FINAL.len,
    pace: plan.finalPace,
    enemyHp: plan.finalHp,
    hearts: FINAL.hearts,
    bonusXp: plan.finalBonus,
    enemy: { id: plan.finalEnemy, name: plan.final.name },
    boss: plan.final,
  });
  return out;
}

export const FLOORS: Floor[] = buildFloors({
  tower: "kana",
  zones: ZONES,
  final: FINAL_BOSS,
  finalEnemy: "ryu",
  startId: 1,
  minions: MINIONS,
  known: [],
  finalMode: "mixed",
  finalHp: FINAL.hp,
  finalPace: FINAL.pace,
  finalBonus: 1500,
  bossBonus: 150,
});
export const TOP_FLOOR = FLOORS.length;

// the sky shrine: a second tower for dakuten, combos and small っ.
// opens once you've beaten the dragon or earned your blue belt
const SOKUON_FRIENDS = [...rowChars(["vowel", "k", "s", "t", "p"])];

export const SKY_ZONES: Zone[] = [
  {
    id: 1,
    name: "Thunder Gate",
    drills: [["g"], ["z"]],
    boss: {
      id: "shikappa",
      name: "Shikappa",
      kana: "しかっぱ",
      title: "River Wrestler",
      blurb: "A grumpy kappa with a dish of water on his head. Read fast enough and he'll spill it.",
    },
  },
  {
    id: 2,
    name: "Bamboo Dojo",
    drills: [["d"], ["b", "p"]],
    boss: { id: "alekoni", name: "Alekoni", kana: "あれこに", title: "Oni Breaker II", blurb: "A one-horned, one-dark-horned oni who swaps ば for ぱ just to watch you squirm." },
  },
  {
    id: 3,
    name: "Moon Bridge",
    drills: [
      ["ky", "sh"],
      ["ch", "ny"],
    ],
    mixName: "Combos mix",
    boss: { id: "stellatsune", name: "Stellatsune", kana: "すてらつね", title: "Fox Charmer", blurb: "A shrine fox with a smug grin. She blends kana together and dares you to keep up." },
  },
  {
    id: 4,
    name: "Cat Alley",
    drills: [["hy", "my"], ["ry"]],
    mixName: "Combos mix II",
    boss: { id: "minjimata", name: "Minjimata", kana: "みんじまた", title: "Cat Whisperer", blurb: "A nekomata with a ghost flame at her side. Nine lives, zero patience for slow readers." },
  },
  {
    id: 5,
    name: "Cloud Garden",
    drills: [
      ["gy", "j"],
      ["by", "py"],
    ],
    mixName: "Combos mix III",
    boss: { id: "ayutengu", name: "Ayutengu", kana: "あゆてんぐ", title: "Cloud Walker", blurb: "A long-nosed tengu who rules the clouds. Proud, fast, and full of ぎょ and じゅ." },
  },
  {
    id: 6,
    name: "Storm Peak",
    drills: [["xtsu"]],
    extra: SOKUON_FRIENDS,
    mixName: "Small っ in real words",
    mixMode: "mixed",
    boss: { id: "pramirei", name: "Pramirei", kana: "ぷらみれい", title: "Ghost Seer", blurb: "A quiet yūrei who drifts between beats. Small っ is a pause, and she lives in the pauses." },
  },
];

export const SKY_FINAL_BOSS: Boss = {
  id: "basarihyon",
  name: "Basarihyon, Lord of Yokai",
  kana: "ばさりひょん",
  title: "Yokai Lord Slayer",
  blurb: "The bald old ruler of every yokai in the shrine. He doesn't fight with kana. He fights with whole sentences.",
};

export const SKY_FLOORS: Floor[] = buildFloors({
  tower: "sky",
  zones: SKY_ZONES,
  final: SKY_FINAL_BOSS,
  finalEnemy: "basarihyon",
  startId: 101,
  minions: SKY_MINIONS,
  known: [...BASIC_KANA_LIST],
  finalMode: "sentences",
  finalHp: 12,
  finalPace: "normal",
  finalBonus: 2500,
  bossBonus: 250,
});
export const SKY_FIRST = SKY_FLOORS[0].id;
export const SKY_TOP = SKY_FLOORS[SKY_FLOORS.length - 1].id;

// the katakana tower: a neon city, same climb as the first tower plus the extras.
// zone 6 is still a shadow until its drawing comes in
const KATA_MINIONS = {
  drill: [
    { id: "goblin", name: "Neon Goblin" },
    { id: "skeleton", name: "Cyber Skeleton" },
  ],
  mix: [
    { id: "obake", name: "Glitch Ghost" },
    { id: "kasa", name: "Robo Umbrella" },
  ],
} satisfies Record<string, Enemy[]>;

const shadow = (n: number, kana: string, title: string): Boss => ({
  id: `k${n}`,
  name: `Shadow Boss ${["I", "II", "III", "IV", "V", "VI"][n - 1]}`,
  kana,
  title,
  blurb: "Nobody has seen its real face yet. Beat it anyway.",
});

export const KATA_ZONES: Zone[] = [
  { id: 1, name: "Neon Gate", drills: [["kt-vowel"], ["kt-k"]], boss: { id: "k1", name: "Ugyatsume", kana: "ウギャツメ", title: "Eye Poker", blurb: "A one-eyed mountain hermit with a spiked box on his back. His third eye never blinks, and it's watching your mistakes." } },
  { id: 2, name: "Arcade Street", drills: [["kt-s"], ["kt-t"]], boss: { id: "k2", name: "Deeprokubi", kana: "ディープロクビ", title: "Neck Breaker", blurb: "His neck stretches across the whole street. The longer the word, the longer the neck." } },
  { id: 3, name: "Robot Alley", drills: [["kt-n"], ["kt-h"]], boss: { id: "k3", name: "Ugyannya", kana: "ウギャンニャ", title: "Mask Breaker", blurb: "A grinning demon hiding behind a horned mask. Every kana he shows you is wearing a disguise." } },
  { id: 4, name: "Pixel Market", drills: [["kt-m", "kt-y"], ["kt-r", "kt-w", "kt-nn"]], boss: { id: "k4", name: "Ugyagumo", kana: "ウギャグモ", title: "Web Cutter", blurb: "An eight-legged spider demon who spins lookalike kana into one big sticky web." } },
  {
    id: 5,
    name: "Voltage Plant",
    drills: [["kt-g", "kt-z"], ["kt-d", "kt-b", "kt-p"], ["kt-xtsu", "kt-long"]],
    extra: KATAKANA_BASIC_LIST,
    mixName: "Voltage mix",
    mixMode: "mixed",
    boss: { id: "k5", name: "Ugdeepkuchi", kana: "ウグディープクチ", title: "Double Trouble", blurb: "Two heads, two mouths, twice the trash talk. Loves small ッ because it doubles everything, just like him." },
  },
  {
    id: 6,
    name: "Hyper Lane",
    drills: [
      ["kt-ky", "kt-sh", "kt-ch", "kt-ny"],
      ["kt-hy", "kt-my", "kt-ry", "kt-gy", "kt-j", "kt-by", "kt-py"],
      ["kt-f", "kt-ti", "kt-wi", "kt-she", "kt-v"],
    ],
    mixName: "Hyper mix",
    mixMode: "mixed",
    boss: shadow(6, "シャドウ", "Speed Demon"),
  },
];

export const KATA_FINAL_BOSS: Boss = {
  id: "k7",
  name: "Pawadokuro, Bone King",
  kana: "パワドクロ",
  title: "Bone Crusher",
  blurb: "A giant skeleton lit by shrine lanterns, ruling the top of Neon City. Every katakana, real loanwords, no mercy.",
};

export const KATA_FLOORS: Floor[] = buildFloors({
  tower: "kata",
  zones: KATA_ZONES,
  final: KATA_FINAL_BOSS,
  finalEnemy: "k7",
  startId: 201,
  minions: KATA_MINIONS,
  known: [],
  finalMode: "mixed",
  finalHp: 25,
  finalPace: "fast",
  finalBonus: 2000,
  bossBonus: 200,
});
export const KATA_FIRST = KATA_FLOORS[0].id;
export const KATA_TOP = KATA_FLOORS[KATA_FLOORS.length - 1].id;

export const ALL_FLOORS: Floor[] = [...FLOORS, ...SKY_FLOORS, ...KATA_FLOORS];
const BY_ID = new Map(ALL_FLOORS.map((f) => [f.id, f]));

export function getFloor(id: number): Floor | undefined {
  return BY_ID.get(id);
}

export function floorsOf(tower: TowerId): Floor[] {
  return tower === "sky" ? SKY_FLOORS : tower === "kata" ? KATA_FLOORS : FLOORS;
}

export function zoneOf(f: Floor): Zone | undefined {
  return (f.tower === "sky" ? SKY_ZONES : f.tower === "kata" ? KATA_ZONES : ZONES).find((z) => z.id === f.zone);
}

export const ALL_BOSSES: Boss[] = [
  ...ZONES.map((z) => z.boss),
  FINAL_BOSS,
  ...SKY_ZONES.map((z) => z.boss),
  SKY_FINAL_BOSS,
  ...KATA_ZONES.map((z) => z.boss),
  KATA_FINAL_BOSS,
];

// sanity: every extra kana is taught somewhere in the sky shrine
export const SKY_TAUGHT = new Set(SKY_FLOORS.flatMap((f) => f.newChars));
export const EXTRA_KANA = KANA_GROUPS.filter((g) => g.script === "hiragana" && g.kind !== "basic").flatMap((g) => g.chars);

// how a floor is named to people: each tower counts from 1 again
export function floorNumber(f: Floor): number {
  return f.tower === "sky" ? f.id - 100 : f.tower === "kata" ? f.id - 200 : f.id;
}

export function floorLabel(f: Floor): string {
  return f.tower === "sky" ? `Sky floor ${f.id - 100}` : f.tower === "kata" ? `Neon floor ${f.id - 200}` : `Floor ${f.id}`;
}

// the next floor in the same tower, if there is one
export function nextFloor(f: Floor): Floor | undefined {
  const n = getFloor(f.id + 1);
  return n && n.tower === f.tower ? n : undefined;
}
