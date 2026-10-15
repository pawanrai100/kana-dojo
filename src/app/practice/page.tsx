import type { Metadata } from "next";
import { PracticeGame } from "@/features/hiragana/practice/practice-game";

export const metadata: Metadata = { title: "Hiragana Practice" };

export default function Page() {
  return <PracticeGame />;
}
