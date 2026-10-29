import { BASIC_KANA_LIST } from "@/lib/kana/hiragana";
import { encounteredChars, masteredChars } from "@/lib/progress/stats";
import type { Progress } from "@/lib/progress/types";
import { KANA_GROUPS } from "@/lib/kana/hiragana";
import { skillMissRate } from "@/lib/quiz/adaptive";
import { BELTS, beltStatus } from "@/lib/progress/belts";
import { ALL_BOSSES, ALL_FLOORS, FLOORS, FINAL_BOSS, SKY_FINAL_BOSS, SKY_FLOORS, floorLabel, getFloor, type Enemy } from "./floors";
import { skyOpen } from "./gate";
import { clearedCount, isCleared } from "./progress";

// badges are worked out from progress, never stored on their own,
// so they can't drift out of sync and need no extra database column

export type BadgeTier = "bronze" | "silver" | "gold" | "boss";

export interface Achievement {
  id: string;
  name: string;
  how: string; // shown before it's earned
  glyph: string; // big character on the medal
  tier: BadgeTier;
  title?: string; // bosses grant a title
  art?: Enemy["id"]; // boss portrait instead of the glyph
  earned: (p: Progress) => boolean;
}

const bossFloor = (bossId: string) => ALL_FLOORS.find((f) => f.boss?.id === bossId)!.id;
const group = (id: string) => KANA_GROUPS.find((g) => g.id === id)!.chars;
const allMastered = (p: Progress, pool: string[]) => masteredChars(p, pool).length === pool.length;
const beltAt = (id: string) => BELTS.findIndex((b) => b.id === id);
const bestDay = (p: Progress, f: (d: Progress["days"][string]) => boolean) => Object.values(p.days).some(f);

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-round", name: "First Steps", how: "Finish your first round.", glyph: "あ", tier: "bronze", earned: (p) => p.roundsCompleted >= 1 },
  { id: "tower-1", name: "Into the Tower", how: "Clear floor 1 of the tower.", glyph: "一", tier: "bronze", earned: (p) => isCleared(p.tower, 1) },
  ...ALL_BOSSES.map<Achievement>((b) => ({
    id: `boss-${b.id}`,
    name: b.title,
    how: `Defeat ${b.name} on ${floorLabel(getFloor(bossFloor(b.id))!).toLowerCase()}.`,
    glyph: b.kana[0],
    tier: b.id === FINAL_BOSS.id || b.id === SKY_FINAL_BOSS.id ? "gold" : "boss",
    title: b.title,
    art: b.id as Enemy["id"],
    earned: (p) => isCleared(p.tower, bossFloor(b.id)),
  })),
  {
    id: "untouchable",
    name: "Untouchable",
    how: "Beat a boss without losing a heart.",
    glyph: "無",
    tier: "silver",
    earned: (p) => Object.values(p.tower.floors).some((f) => f.flawlessBoss),
  },
  {
    id: "hanamaru",
    name: "Hanamaru",
    how: "Get 3 stars on every floor of the tower.",
    glyph: "花",
    tier: "gold",
    earned: (p) => FLOORS.every((f) => (p.tower.floors[f.id]?.stars ?? 0) === 3),
  },
  { id: "halfway", name: "Halfway Up", how: "Clear 10 floors.", glyph: "十", tier: "silver", earned: (p) => clearedCount(p.tower) >= 10 },
  { id: "combo-10", name: "Combo Master", how: "Hit a ×10 combo in practice.", glyph: "連", tier: "silver", earned: (p) => p.bestCombo >= 10 },
  { id: "streak-7", name: "Week Warrior", how: "Practice 7 days in a row.", glyph: "七", tier: "silver", earned: (p) => p.bestStreak >= 7 },
  { id: "streak-30", name: "Habit Formed", how: "Practice 30 days in a row.", glyph: "月", tier: "gold", earned: (p) => p.bestStreak >= 30 },
  { id: "full-set", name: "Full Set", how: "See all 46 hiragana in practice.", glyph: "全", tier: "bronze", earned: (p) => encounteredChars(p).length === BASIC_KANA_LIST.length },
  { id: "rounds-50", name: "Dedicated", how: "Finish 50 rounds.", glyph: "五", tier: "silver", earned: (p) => p.roundsCompleted >= 50 },
  { id: "kana-master", name: "Kana Master", how: "Master all 46 hiragana.", glyph: "極", tier: "gold", earned: (p) => masteredChars(p).length === BASIC_KANA_LIST.length },
  // the sky shrine
  { id: "sky-open", name: "Above the Clouds", how: "Open the Sky Shrine (beat the Dragon or earn your Blue belt).", glyph: "雲", tier: "silver", earned: (p) => skyOpen(p) },
  {
    id: "sky-stars",
    name: "Cloud Nine",
    how: "Get 3 stars on every Sky Shrine floor.",
    glyph: "九",
    tier: "gold",
    earned: (p) => SKY_FLOORS.every((f) => (p.tower.floors[f.id]?.stars ?? 0) === 3),
  },
  // the new kana
  { id: "marks", name: "Mark Master", how: "Master all 25 dakuten (が ざ だ ば ぱ).", glyph: "゛", tier: "silver", earned: (p) => allMastered(p, group("dakuten")) },
  { id: "combos", name: "Smooth Talker", how: "Master all 33 combos (きゃ to ぴょ).", glyph: "ゃ", tier: "silver", earned: (p) => allMastered(p, group("combos")) },
  { id: "small-tsu", name: "Tiny but Mighty", how: "Master small っ.", glyph: "っ", tier: "bronze", earned: (p) => allMastered(p, group("sokuon")) },
  {
    id: "every-kana",
    name: "Every Last Kana",
    how: "Master all 105 hiragana, extras included.",
    glyph: "皆",
    tier: "gold",
    earned: (p) => allMastered(p, KANA_GROUPS.flatMap((g) => g.chars)),
  },
  // sentences
  {
    id: "particle-pro",
    name: "Particle Pro",
    how: "Read particles right 90% of the time over your last 20 in Sentences.",
    glyph: "は",
    tier: "silver",
    earned: (p) => (p.skills.particles?.recent.length ?? 0) >= 20 && skillMissRate(p.skills.particles.recent.slice(-20)) <= 0.1,
  },
  { id: "bookworm", name: "Bookworm", how: "Read 25 sentences right in one day.", glyph: "本", tier: "silver", earned: (p) => bestDay(p, (d) => (d.sentences ?? 0) >= 25) },
  // belts and quests
  { id: "blue-belt", name: "True Blue", how: "Earn your Blue belt.", glyph: "青", tier: "silver", earned: (p) => beltStatus(p).index >= beltAt("blue") },
  { id: "black-belt", name: "Black Belt", how: "Earn your Black belt.", glyph: "黒", tier: "gold", earned: (p) => beltStatus(p).index >= beltAt("black") },
  { id: "quest-day", name: "Quest Hunter", how: "Finish all 3 daily quests in one day.", glyph: "全", tier: "bronze", earned: (p) => bestDay(p, (d) => (d.quests?.length ?? 0) >= 3) },
  {
    id: "quest-week",
    name: "Quest Week",
    how: "Finish all 3 daily quests on 7 different days.",
    glyph: "週",
    tier: "silver",
    earned: (p) => Object.values(p.days).filter((d) => (d.quests?.length ?? 0) >= 3).length >= 7,
  },
];

export function earnedIds(p: Progress): Set<string> {
  return new Set(ACHIEVEMENTS.filter((a) => a.earned(p)).map((a) => a.id));
}

// what changed between two snapshots, for the "new badge" popup
export function newlyEarned(before: Progress, after: Progress): Achievement[] {
  const had = earnedIds(before);
  return ACHIEVEMENTS.filter((a) => !had.has(a.id) && a.earned(after));
}

// the title shown on your profile: the highest boss you've beaten
export function currentTitle(p: Progress): string | null {
  const boss = [...ACHIEVEMENTS].reverse().find((a) => a.title && a.earned(p));
  return boss?.title ?? null;
}
