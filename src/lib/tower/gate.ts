import { BELTS, beltStatus } from "@/lib/progress/belts";
import type { Progress } from "@/lib/progress/types";
import { TOP_FLOOR } from "./floors";
import { isCleared } from "./progress";

const BLUE = BELTS.findIndex((b) => b.id === "blue");

// the sky shrine opens once you beat the dragon or earn your blue belt
export function skyOpen(p: Progress): boolean {
  return isCleared(p.tower, TOP_FLOOR) || beltStatus(p).index >= BLUE;
}
