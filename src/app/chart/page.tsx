import type { Metadata } from "next";
import { KanaChart } from "@/features/hiragana/chart/kana-chart";

export const metadata: Metadata = { title: "Kana Chart" };

export default function Page() {
  return <KanaChart />;
}
