import type { Metadata } from "next";
import { LeaderboardView } from "@/features/leaderboard/leaderboard";

export const metadata: Metadata = { title: "Leaderboard" };

export default function Page() {
  return <LeaderboardView />;
}
