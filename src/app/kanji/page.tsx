import type { Metadata } from "next";
import { KanjiView } from "@/features/kanji/kanji-view";

export const metadata: Metadata = { title: "Kanji" };

export default function Page() {
  return <KanjiView />;
}
