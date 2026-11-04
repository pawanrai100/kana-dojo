import type { Metadata } from "next";
import { LearningView } from "@/features/learning/learning-view";

export const metadata: Metadata = { title: "First Conversations", description: "Learn useful Japanese phrases, practise listening, and try your first conversations alongside kana." };
export default function Page() { return <LearningView />; }
