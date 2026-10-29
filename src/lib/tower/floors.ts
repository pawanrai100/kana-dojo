import { BASIC_KANA_LIST, KANA_GROUPS, getRow } from "@/lib/kana/hiragana";
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
    | "basarihyon";
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

export type TowerId = "kana" | "sky";

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
      const chars = [...fresh, ...(z.extra ?? [])];
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

export const ALL_FLOORS: Floor[] = [...FLOORS, ...SKY_FLOORS];
const BY_ID = new Map(ALL_FLOORS.map((f) => [f.id, f]));

export function getFloor(id: number): Floor | undefined {
  return BY_ID.get(id);
}

export function floorsOf(tower: TowerId): Floor[] {
  return tower === "sky" ? SKY_FLOORS : FLOORS;
}

export function zoneOf(f: Floor): Zone | undefined {
  return (f.tower === "sky" ? SKY_ZONES : ZONES).find((z) => z.id === f.zone);
}

export const ALL_BOSSES: Boss[] = [...ZONES.map((z) => z.boss), FINAL_BOSS, ...SKY_ZONES.map((z) => z.boss), SKY_FINAL_BOSS];

// sanity: every extra kana is taught somewhere in the sky shrine
export const SKY_TAUGHT = new Set(SKY_FLOORS.flatMap((f) => f.newChars));
export const EXTRA_KANA = KANA_GROUPS.filter((g) => g.id !== "basic").flatMap((g) => g.chars);

// how a floor is named to people: sky shrine floors count from 1 again
export function floorLabel(f: Floor): string {
  return f.tower === "sky" ? `Sky floor ${f.id - 100}` : `Floor ${f.id}`;
}

// the next floor in the same tower, if there is one
export function nextFloor(f: Floor): Floor | undefined {
  const n = getFloor(f.id + 1);
  return n && n.tower === f.tower ? n : undefined;
}
