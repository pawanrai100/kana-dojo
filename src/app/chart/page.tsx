import type { Metadata } from "next";
import { KanaChart } from "@/features/hiragana/chart/kana-chart";

export const metadata: Metadata = { title: "Hiragana Chart" };

export default function Page() {
  return <KanaChart />;
}
