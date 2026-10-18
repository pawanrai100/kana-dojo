import type { Floor } from "./floors";

// one battle on one floor. pure so it can be unit tested

export interface BattleState {
  floorId: number;
  hearts: number;
  maxHearts: number;
  enemyHp: number;
  maxEnemyHp: number;
  combo: number;
  bestCombo: number;
  answered: number;
  correct: number;
  status: "fighting" | "won" | "lost";
}

export function startBattle(f: Floor): BattleState {
  return {
    floorId: f.id,
    hearts: f.hearts,
    maxHearts: f.hearts,
    enemyHp: f.enemyHp,
    maxEnemyHp: f.enemyHp,
    combo: 0,
    bestCombo: 0,
    answered: 0,
    correct: 0,
    status: "fighting",
  };
}

// a correct read hits the enemy, a miss (or timeout) costs a heart
export function applyAnswer(s: BattleState, correct: boolean): BattleState {
  if (s.status !== "fighting") return s;
  const combo = correct ? s.combo + 1 : 0;
  const next: BattleState = {
    ...s,
    answered: s.answered + 1,
    correct: s.correct + (correct ? 1 : 0),
    enemyHp: correct ? Math.max(0, s.enemyHp - 1) : s.enemyHp,
    hearts: correct ? s.hearts : Math.max(0, s.hearts - 1),
    combo,
    bestCombo: Math.max(s.bestCombo, combo),
  };
  if (next.enemyHp === 0) next.status = "won";
  else if (next.hearts === 0) next.status = "lost";
  return next;
}

// 3 stars untouched, 2 stars if at least half your hearts are left
export function battleStars(s: BattleState): 0 | 1 | 2 | 3 {
  if (s.status !== "won") return 0;
  if (s.hearts === s.maxHearts) return 3;
  if (s.hearts >= Math.ceil(s.maxHearts / 2)) return 2;
  return 1;
}
