import { HIRAGANA_ROWS } from "@/lib/kana/hiragana";
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
  id: "obake" | "shisa" | "kappa" | "tanuki" | "kitsune" | "tengu" | "oni" | "ryu";
  name: string;
}

// regular floors: lantern ghosts guard the drills, shisa lion-dogs guard the mixes
export const MINIONS = {
  drill: { id: "obake", name: "Basobake" },
  mix: { id: "shisa", name: "Shisarr" },
} as const satisfies Record<string, Enemy>;

export interface Zone {
  id: number;
  name: string;
  drills: string[][]; // each inner list = the rows taught on one floor
  boss: Boss;
}

export interface Floor {
  id: number; // 1 = ground floor
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
    boss: { id: "kappa", name: "Ugyappa", kana: "うぎゃっぱ", title: "Ugyappa Tamer", blurb: "A kappa river imp guarding the gate. Keep your head dry." },
  },
  {
    id: 2,
    name: "Lantern Hall",
    drills: [["s"], ["t"]],
    boss: { id: "tanuki", name: "Hyunuki", kana: "ひゅぬき", title: "Hyunuki Trickster", blurb: "A shapeshifting tanuki. Its words never look the same twice." },
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
    boss: { id: "tengu", name: "Deepengu", kana: "でぃぺんぐ", title: "Deepengu Climber", blurb: "A long-nosed tengu of the mountains. It speaks fast, so read faster." },
  },
  {
    id: 5,
    name: "Thunder Roof",
    drills: [["r"], ["w", "nn"]],
    boss: { id: "oni", name: "Jinkoni", kana: "じんこに", title: "Jinkoni Breaker", blurb: "A thunder oni on the last roof before the peak. Bring your best." },
  },
];

export const FINAL_BOSS: Boss = {
  id: "ryu",
  name: "Pawaryū the Dragon",
  kana: "ぱわりゅう",
  title: "Dragon Slayer",
  blurb: "The power dragon who built this tower. Every one of the 46 kana, fast, with three hearts.",
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

const ROW = new Map(HIRAGANA_ROWS.map((r) => [r.id, r]));
const rowChars = (ids: string[]) => ids.flatMap((id) => ROW.get(id)!.chars);
const rowLabel = (id: string) => ROW.get(id)!.label;
const drillLabel = (ids: string[]) => (ids.length === 1 ? rowLabel(ids[0]) : ids.map((r) => (r === "nn" ? "ん" : rowLabel(r))).join(" + "));
const shortLabel = (ids: string[]) => ids.map((r) => (r === "nn" ? "ん" : rowLabel(r).replace("-row", ""))).join("·");

function buildFloors(): Floor[] {
  const out: Floor[] = [];
  const learned: string[] = [];
  let id = 1;

  for (const z of ZONES) {
    // one floor per new row: drill just that row
    for (const d of z.drills) {
      const chars = rowChars(d);
      const t = DRILL[z.id - 1];
      out.push({
        id: id++,
        zone: z.id,
        kind: "floor",
        name: drillLabel(d),
        chars,
        newChars: chars,
        mode: "random",
        lengthRange: t.len,
        pace: t.pace,
        enemyHp: t.hp,
        hearts: t.hearts,
        bonusXp: 40 + 10 * (z.id - 1),
        enemy: MINIONS.drill,
      });
    }
    const zoneRows = z.drills.flat();
    const zoneChars = rowChars(zoneRows);
    // mix floor: the zone's rows together, longer words
    const m = MIX[z.id - 1];
    out.push({
      id: id++,
      zone: z.id,
      kind: "floor",
      name: `${z.drills.map(shortLabel).join(" + ")} mix`,
      chars: zoneChars,
      newChars: [],
      mode: "random",
      lengthRange: m.len,
      pace: m.pace,
      enemyHp: m.hp,
      hearts: m.hearts,
      bonusXp: 60 + 15 * (z.id - 1),
      enemy: MINIONS.mix,
    });
    learned.push(...zoneChars);
    // boss: everything learned so far, real words where possible
    const b = BOSS[z.id - 1];
    out.push({
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
      bonusXp: 150 * z.id,
      enemy: { id: z.boss.id as Enemy["id"], name: z.boss.name },
      boss: z.boss,
    });
  }

  out.push({
    id: id++,
    zone: ZONES.length + 1,
    kind: "final",
    name: FINAL_BOSS.name,
    chars: [...learned],
    newChars: [],
    mode: "mixed",
    lengthRange: FINAL.len,
    pace: FINAL.pace,
    enemyHp: FINAL.hp,
    hearts: FINAL.hearts,
    bonusXp: 1500,
    enemy: { id: "ryu", name: FINAL_BOSS.name },
    boss: FINAL_BOSS,
  });
  return out;
}

export const FLOORS: Floor[] = buildFloors();
export const TOP_FLOOR = FLOORS.length;

export function getFloor(id: number): Floor | undefined {
  return FLOORS[id - 1];
}

export function zoneOf(f: Floor): Zone | undefined {
  return ZONES.find((z) => z.id === f.zone);
}

export const ALL_BOSSES: Boss[] = [...ZONES.map((z) => z.boss), FINAL_BOSS];
