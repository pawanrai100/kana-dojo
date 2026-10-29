import { dayKey } from "@/lib/progress/stats";
import type { Progress } from "@/lib/progress/types";
import { battleStars, type BattleState } from "./battle";
import { SKY_FIRST, floorsOf, getFloor, type TowerId } from "./floors";

export interface FloorRecord {
  stars: 0 | 1 | 2 | 3;
  clearedAt: number; // first clear
  attempts: number;
  flawlessBoss?: boolean;
}

export interface TowerProgress {
  floors: Record<string, FloorRecord>; // key = floor id
}

export function emptyTower(): TowerProgress {
  return { floors: {} };
}

export function isCleared(t: TowerProgress, id: number): boolean {
  return (t.floors[id]?.stars ?? 0) > 0;
}

// a floor opens once the one below it is cleared
// the sky shrine's first floor has its own gate (see gate.ts), so callers pass it in
export function isUnlocked(t: TowerProgress, id: number, skyOpen = false): boolean {
  if (id === 1) return true;
  if (id === SKY_FIRST) return skyOpen;
  return isCleared(t, id - 1);
}

// highest floor you can play right now
export function currentFloor(t: TowerProgress, tower: TowerId = "kana"): number {
  const fs = floorsOf(tower);
  for (const f of fs) if (!isCleared(t, f.id)) return f.id;
  return fs[fs.length - 1].id;
}

export function clearedCount(t: TowerProgress, tower: TowerId = "kana"): number {
  return floorsOf(tower).filter((f) => isCleared(t, f.id)).length;
}

export function totalStars(t: TowerProgress, tower: TowerId = "kana"): number {
  return floorsOf(tower).reduce((n, f) => n + (t.floors[f.id]?.stars ?? 0), 0);
}

export interface TowerOutcome {
  won: boolean;
  stars: 0 | 1 | 2 | 3;
  firstClear: boolean;
  newBest: boolean;
  bonusXp: number;
}

// fold a finished battle into progress. bonus xp only on a floor's first clear
export function applyBattle(p: Progress, b: BattleState, now = Date.now()): { progress: Progress; outcome: TowerOutcome } {
  const f = getFloor(b.floorId);
  const prev = p.tower.floors[b.floorId];
  const stars = battleStars(b);
  const won = b.status === "won";
  const firstClear = won && !(prev && prev.stars > 0);
  const bonusXp = firstClear && f ? f.bonusXp : 0;
  const flawless = won && f?.kind !== "floor" && b.hearts === b.maxHearts;

  const rec: FloorRecord = {
    stars: Math.max(prev?.stars ?? 0, stars) as FloorRecord["stars"],
    clearedAt: prev?.clearedAt || (won ? now : 0),
    attempts: (prev?.attempts ?? 0) + 1,
    flawlessBoss: !!(prev?.flawlessBoss || flawless),
  };

  // bonus also goes on today's log so a device merge can't drop it
  const days = { ...p.days };
  if (bonusXp || won) {
    const k = dayKey(now);
    const d = days[k] ?? { answered: 0, correct: 0, rounds: 0, xp: 0 };
    days[k] = { ...d, xp: d.xp + bonusXp, floors: (d.floors ?? 0) + (won ? 1 : 0) };
  }

  return {
    progress: {
      ...p,
      xp: p.xp + bonusXp,
      days,
      tower: { floors: { ...p.tower.floors, [b.floorId]: rec } },
    },
    outcome: { won, stars, firstClear, newBest: stars > (prev?.stars ?? 0), bonusXp },
  };
}

// for syncing two devices: keep the best result per floor
export function mergeTower(a: TowerProgress, b: TowerProgress, add = false): TowerProgress {
  const floors: Record<string, FloorRecord> = { ...a.floors };
  for (const [k, r] of Object.entries(b.floors)) {
    const o = floors[k];
    if (!o) {
      floors[k] = r;
      continue;
    }
    const firstClear = [o.clearedAt, r.clearedAt].filter((x) => x > 0);
    floors[k] = {
      stars: Math.max(o.stars, r.stars) as FloorRecord["stars"],
      clearedAt: firstClear.length ? Math.min(...firstClear) : 0,
      attempts: add ? o.attempts + r.attempts : Math.max(o.attempts, r.attempts),
      flawlessBoss: !!(o.flawlessBoss || r.flawlessBoss),
    };
  }
  return { floors };
}

export function sanitizeTower(raw: unknown): TowerProgress {
  const out = emptyTower();
  if (!raw || typeof raw !== "object") return out;
  const floors = (raw as Record<string, unknown>).floors;
  if (!floors || typeof floors !== "object") return out;
  for (const [k, v] of Object.entries(floors as Record<string, unknown>)) {
    const id = Number(k);
    if (!getFloor(id) || !v || typeof v !== "object") continue;
    const r = v as Record<string, unknown>;
    const stars = typeof r.stars === "number" && [0, 1, 2, 3].includes(r.stars) ? (r.stars as FloorRecord["stars"]) : 0;
    out.floors[id] = {
      stars,
      clearedAt: typeof r.clearedAt === "number" && r.clearedAt > 0 ? r.clearedAt : 0,
      attempts: typeof r.attempts === "number" && r.attempts >= 0 ? Math.floor(r.attempts) : 0,
      flawlessBoss: r.flawlessBoss === true,
    };
  }
  return out;
}
