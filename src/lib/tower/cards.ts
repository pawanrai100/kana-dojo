import { ALL_FLOORS, zoneOf, type Boss, type Floor } from "./floors";
import type { TowerProgress } from "./progress";

// boss loot: beat a boss and its card drops into your collection.
// the card's tier is your best result on that boss, so nothing new gets saved
// and old progress already has its cards

export type CardTier = "bronze" | "silver" | "gold";

export interface BossCard {
  no: number; // 1-based, in tower order
  floor: Floor;
  boss: Boss;
  tier: CardTier | null; // null = not dropped yet
  where: string; // "Floor 5" / "Sky floor 24"
}

export const TIER_NAME: Record<CardTier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold" };

export function tierFor(stars: number): CardTier | null {
  if (stars >= 3) return "gold";
  if (stars === 2) return "silver";
  if (stars === 1) return "bronze";
  return null;
}

const BOSS_FLOORS = ALL_FLOORS.filter((f) => f.kind !== "floor" && f.boss);
export const CARD_COUNT = BOSS_FLOORS.length;

export function bossCards(t: TowerProgress): BossCard[] {
  return BOSS_FLOORS.map((floor, i) => ({
    no: i + 1,
    floor,
    boss: floor.boss!,
    tier: tierFor(t.floors[floor.id]?.stars ?? 0),
    where: `${floor.tower === "sky" ? "Sky floor" : "Floor"} ${floor.tower === "sky" ? floor.id - 100 : floor.id}`,
  }));
}

export function cardFor(t: TowerProgress, floorId: number): BossCard | undefined {
  return bossCards(t).find((c) => c.floor.id === floorId);
}

export function cardRole(c: BossCard): string {
  if (c.floor.kind === "final") return c.floor.tower === "sky" ? "Ruler of the Sky Shrine" : "Master of the Tower";
  return `Guardian of ${zoneOf(c.floor)?.name ?? "the Tower"}`;
}

// how to make the card better
export function upgradeHint(c: BossCard): string {
  if (!c.tier) return `Beat ${c.boss.name} on ${c.where} to get this card.`;
  if (c.tier === "gold") return "Maxed out. You beat it without losing a heart.";
  return `Beat it again ${c.tier === "bronze" ? "with half your hearts left for Silver, or " : ""}without losing a heart for Gold.`;
}
