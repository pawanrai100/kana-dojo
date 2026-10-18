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
  boss?: Boss;
}

export const ZONES: Zone[] = [
  {
    id: 1,
    name: "Bamboo Gate",
    drills: [["vowel"], ["k"]],
    boss: { id: "kappa", name: "Kappa", kana: "かっぱ", title: "Kappa Tamer", blurb: "A river imp guarding the gate. Keep your head dry." },
  },
  {
    id: 2,
    name: "Lantern Hall",
    drills: [["s"], ["t"]],
    boss: { id: "tanuki", name: "Tanuki", kana: "たぬき", title: "Tanuki Trickster", blurb: "A shapeshifter. Its words never look the same twice." },
  },
  {
    id: 3,
    name: "Moon Garden",
    drills: [["n"], ["h"]],
    boss: { id: "kitsune", name: "Kitsune", kana: "きつね", title: "Kitsune Whisperer", blurb: "A clever fox spirit that loves lookalike kana." },
  },
  {
    id: 4,
    name: "Mountain Pass",
    drills: [["m"], ["y"]],
    boss: { id: "tengu", name: "Tengu", kana: "てんぐ", title: "Tengu Climber", blurb: "A mountain goblin. It speaks fast, so read faster." },
  },
  {
    id: 5,
    name: "Thunder Roof",
    drills: [["r"], ["w", "nn"]],
    boss: { id: "oni", name: "Oni", kana: "おに", title: "Oni Breaker", blurb: "A storm demon on the last roof before the peak." },
  },
];

export const FINAL_BOSS: Boss = {
  id: "ryu",
  name: "Ryū the Dragon",
  kana: "りゅう",
  title: "Dragon Slayer",
  blurb: "Every one of the 46 kana, fast, with three hearts. The top of the tower.",
};

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
      out.push({
        id: id++,
        zone: z.id,
        kind: "floor",
        name: drillLabel(d),
        chars,
        newChars: chars,
        mode: "random",
        lengthRange: "2-3",
        pace: "relaxed",
        enemyHp: 6,
        hearts: 5,
        bonusXp: 40,
      });
    }
    const zoneRows = z.drills.flat();
    const zoneChars = rowChars(zoneRows);
    // mix floor: the zone's rows together, longer words
    out.push({
      id: id++,
      zone: z.id,
      kind: "floor",
      name: `${z.drills.map(shortLabel).join(" + ")} mix`,
      chars: zoneChars,
      newChars: [],
      mode: "random",
      lengthRange: "2-4",
      pace: "normal",
      enemyHp: 8,
      hearts: 5,
      bonusXp: 60,
    });
    learned.push(...zoneChars);
    // boss: everything learned so far, real words where possible
    out.push({
      id: id++,
      zone: z.id,
      kind: "boss",
      name: z.boss.name,
      chars: [...learned],
      newChars: [],
      mode: "mixed",
      lengthRange: "2-4",
      pace: "fast",
      enemyHp: 10,
      hearts: 3,
      bonusXp: 150 * z.id,
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
    lengthRange: "2-5",
    pace: "fast",
    enemyHp: 15,
    hearts: 3,
    bonusXp: 1500,
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
