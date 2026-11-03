"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VoiceRecorder() {
  const [status, setStatus] = useState<"idle" | "requesting" | "recording" | "ready">("idle");
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);
  const recordingUrl = useRef("");

  const stopTracks = useCallback(() => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; }, []);
  const stop = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    stopTracks();
  }, [stopTracks]);
  useEffect(() => {
    mounted.current = true;
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", hidden);
      if (timeout.current) clearTimeout(timeout.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stopTracks();
      if (recordingUrl.current) URL.revokeObjectURL(recordingUrl.current);
    };
  }, [stop, stopTracks]);

  const clear = () => {
    if (recordingUrl.current) URL.revokeObjectURL(recordingUrl.current);
    recordingUrl.current = ""; setUrl(""); setStatus("idle");
  };

  const start = async () => {
    if (status === "requesting" || status === "recording") return;
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Recording is unavailable here. Say your answer aloud, or use typed practice."); return;
    }
    setStatus("requesting");
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || document.hidden) {
        acquired.getTracks().forEach((t) => t.stop());
        if (mounted.current) setStatus("idle");
        return;
      }
      stream.current = acquired;
      const media = new MediaRecorder(acquired);
      recorder.current = media;
      const chunks: BlobPart[] = [];
      media.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      media.onstop = () => {
        stopTracks();
        if (!mounted.current) return;
        if (recordingUrl.current) URL.revokeObjectURL(recordingUrl.current);
        const blob = new Blob(chunks, { type: media.mimeType || "audio/webm" });
        if (!blob.size) { setStatus("idle"); setError("No audio was captured. Check your microphone and try again."); return; }
        recordingUrl.current = URL.createObjectURL(blob);
        setUrl(recordingUrl.current); setStatus("ready");
      };
      media.onerror = () => {
        stop();
        if (mounted.current) { setStatus("idle"); setError("Recording stopped unexpectedly. Please try again."); }
      };
      media.start();
      setStatus("recording");
      timeout.current = setTimeout(stop, 30_000);
    } catch {
      stopTracks();
      if (mounted.current) { setStatus("idle"); setError("Microphone access was unavailable or denied. You can continue aloud or type your reply."); }
    }
  };

  return <div className="space-y-3 rounded-2xl bg-background p-4">
    <p className="text-sm text-muted">Optional recording stays in this tab and is discarded when you leave this activity. No recording is uploaded. Maximum 30 seconds.</p>
    <div className="flex flex-wrap gap-3">
      {status === "recording" ? <Button type="button" variant="danger" onClick={stop}><Square aria-hidden /> Stop recording</Button>
        : <Button type="button" variant="outline" disabled={status === "requesting"} onClick={start}><Mic aria-hidden /> {status === "requesting" ? "Waiting for microphone…" : url ? "Record again" : "Record my reply"}</Button>}
      {url && status !== "recording" && <Button type="button" variant="ghost" onClick={clear}><Trash2 aria-hidden /> Discard recording</Button>}
    </div>
    <p role="status" className="text-sm">{status === "recording" ? "Recording… press Stop when you are done." : error}</p>
    {url && status !== "recording" && <audio aria-label="Your recorded reply" className="w-full" controls src={url} />}
    <p className="text-xs text-muted">Self-comparison practice: the app does not score or transcribe your pronunciation.</p>
  </div>;
}
