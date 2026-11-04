"use client";

import { Volume2 } from "lucide-react";
import { canSpeak, speak } from "@/lib/voice/speech";
import { cn } from "@/lib/utils";
import { actions } from "@/store/app-store";

// tap to hear a word. hidden on devices that can't talk
export function SpeakerButton({ text, label, className }: { text: string; label?: string; className?: string }) {
  if (typeof window !== "undefined" && !canSpeak()) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        const s = actions.getState().settings;
        void speak(text, { voice: s.voiceName || undefined, rate: s.voiceRate });
      }}
      aria-label={label ?? `Hear ${text}`}
      className={cn("inline-grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary transition-transform hover:scale-105 active:scale-95", className)}
    >
      <Volume2 className="size-4" aria-hidden />
    </button>
  );
}
