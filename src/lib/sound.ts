// tiny webaudio blips, no audio files needed

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.08) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export type SoundName = "lock" | "tick" | "correct" | "wrong" | "fanfare" | "timeout";

export function playSound(name: SoundName) {
  switch (name) {
    case "lock":
      tone(660, 0, 0.08, "triangle", 0.05);
      break;
    case "tick":
      tone(1200, 0, 0.04, "square", 0.025);
      break;
    case "timeout":
      tone(300, 0, 0.18, "sawtooth", 0.04);
      break;
    case "correct":
      tone(784, 0, 0.12, "triangle");
      tone(1047, 0.07, 0.16, "triangle");
      break;
    case "wrong":
      tone(220, 0, 0.2, "triangle", 0.06);
      break;
    case "fanfare":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, "triangle", 0.07));
      break;
  }
}
