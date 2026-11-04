"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { canSpeak, listen, speak, stopSpeaking, type Heard, type Listening } from "@/lib/voice/speech";
import { actions } from "@/store/app-store";

// hana's voice and ears, using the voice and speed from settings
export function useVoice() {
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const live = useRef<Listening | null>(null);
  const n = useRef(0);

  const say = useCallback(async (text: string, slower = false) => {
    const s = actions.getState().settings;
    const id = ++n.current;
    setSpeaking(true);
    await speak(text, { voice: s.voiceName || undefined, rate: s.voiceRate, slower });
    if (id === n.current) setSpeaking(false);
  }, []);

  const hear = useCallback(async (): Promise<Heard> => {
    stopSpeaking();
    setSpeaking(false);
    live.current?.stop();
    const l = listen("ja-JP");
    live.current = l;
    setListening(true);
    const res = await l.result;
    if (live.current === l) {
      live.current = null;
      setListening(false);
    }
    return res;
  }, []);

  const stopListening = useCallback(() => live.current?.stop(), []);

  useEffect(
    () => () => {
      stopSpeaking();
      live.current?.stop();
    },
    [],
  );

  return { say, hear, stopListening, speaking, listening, canSpeak: canSpeak() };
}
