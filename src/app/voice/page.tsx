import type { Metadata } from "next";
import { VoiceView } from "@/features/voice/voice-view";

export const metadata: Metadata = { title: "Voice" };

export default function Page() {
  return <VoiceView />;
}
