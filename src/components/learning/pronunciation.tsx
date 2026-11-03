"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pronunciation({ text, label = "Listen", slow = false }: { text: string; label?: string; slow?: boolean }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const update = () => setVoices(synth.getVoices().filter((v) => /^ja(?:-|$)/i.test(v.lang)));
    update();
    synth.addEventListener("voiceschanged", update);
    return () => { synth.removeEventListener("voiceschanged", update); synth.cancel(); };
  }, []);

  const play = () => {
    setError("");
    if (!("speechSynthesis" in window)) { setError("Speech playback is not supported in this browser. You can still use the written model."); return; }
    const synth = window.speechSynthesis;
    const voice = voices[0] ?? synth.getVoices().find((v) => /^ja(?:-|$)/i.test(v.lang));
    if (!voice) { setError("No Japanese voice is available. Enable a Japanese speech voice on your device, then reload. Written practice is still available."); return; }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.voice = voice;
    utterance.rate = slow ? 0.7 : 0.95;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = (event) => {
      setPlaying(false);
      if (event.error !== "canceled" && event.error !== "interrupted") setError("Playback did not finish. Try again, or use the written model.");
    };
    try { setPlaying(true); synth.speak(utterance); }
    catch { setPlaying(false); setError("Playback could not start. Use the written model or try again."); }
  };

  return <span className="inline-flex max-w-full flex-col items-start gap-2">
    <Button type="button" variant="secondary" size="sm" onClick={play} aria-label={`${label}${slow ? " slowly" : ""}`}>
      <Volume2 aria-hidden /> {playing ? "Replay" : label}{slow ? " slowly" : ""}
    </Button>
    {error && <span role="status" className="max-w-sm whitespace-normal text-sm text-warn">{error}</span>}
  </span>;
}

export function SpeechControls({ text }: { text: string }) {
  return <div className="flex flex-wrap gap-3"><Pronunciation text={text} /><Pronunciation text={text} slow /></div>;
}
