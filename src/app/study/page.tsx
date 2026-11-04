import type { Metadata } from "next";
import { StudyView } from "@/features/learning/study-view";
export const metadata: Metadata = { title: "Study Studio", description: "Build everyday Japanese with words, grammar, listening, shadowing and conversation practice." };
export default function Page() { return <StudyView />; }
