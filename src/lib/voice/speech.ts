// talking and listening with the browser's own speech tools. no account, no cost.
// how good the voice sounds depends on the device, so we hunt for the most
// natural japanese voice it has and lean towards female ones

export type Rate = "slow" | "normal";

const FEMALE = /nanami|mayu|aoi|shiori|kyoko|o-?ren|haruka|ayumi|sayaka|nanako|mizuki|google 日本語|google japanese|female|女性/i;
const MALE = /keita|ichiro|hattori|otoya|daichi|naoki|takumi|male|男性/i;
const NATURAL = /natural|online|neural|enhanced|premium|siri/i;

export function voiceScore(v: Pick<SpeechSynthesisVoice, "name" | "lang" | "localService">): number {
  if (!/^ja/i.test(v.lang)) return -1;
  let s = 100;
  if (NATURAL.test(v.name)) s += 40; // neural voices sound the least robotic by far
  if (/google/i.test(v.name)) s += 20;
  if (FEMALE.test(v.name)) s += 30;
  if (MALE.test(v.name) && !/female/i.test(v.name)) s -= 60;
  return s;
}

// neural / google voices: the ones that don't sound like a robot
export function isNatural(name: string): boolean {
  return NATURAL.test(name) || /google/i.test(name);
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

// voices load a moment after the page does on some browsers
export function japaneseVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!canSpeak()) return Promise.resolve([]);
  const pick = () =>
    window.speechSynthesis
      .getVoices()
      .filter((v) => voiceScore(v) >= 0)
      .sort((a, b) => voiceScore(b) - voiceScore(a));
  const now = pick();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", done);
      resolve(pick());
    };
    window.speechSynthesis.addEventListener("voiceschanged", done);
    window.setTimeout(done, 1500);
  });
}

export async function bestVoice(preferred?: string): Promise<SpeechSynthesisVoice | undefined> {
  const vs = await japaneseVoices();
  return vs.find((v) => v.name === preferred) ?? vs[0];
}

export interface SpeakOpts {
  rate?: Rate;
  voice?: string; // a name from settings, else the best one we can find
  slower?: boolean; // the "say it slowly" button
}

// say something in japanese. resolves when she's done talking
export async function speak(text: string, opts: SpeakOpts = {}): Promise<void> {
  if (!canSpeak() || !text.trim()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const voice = await bestVoice(opts.voice);
  const u = new SpeechSynthesisUtterance(text.replace(/\s+/g, " ").trim());
  u.lang = "ja-JP";
  if (voice) u.voice = voice;
  // a touch slower and brighter than default reads more like a friendly teacher, less like a robot
  const base = opts.rate === "slow" ? 0.75 : 0.95;
  u.rate = opts.slower ? 0.6 : base;
  u.pitch = 1.08;
  return new Promise((resolve) => {
    const t = window.setTimeout(resolve, 15000);
    u.onend = u.onerror = () => {
      window.clearTimeout(t);
      resolve();
    };
    synth.speak(u);
  });
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

// ---- listening ----

type Recognizer = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function recognizerClass(): (new () => Recognizer) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Recognizer) | undefined;
}

export function canListen(): boolean {
  return !!recognizerClass();
}

export type HeardError = "no-speech" | "not-allowed" | "unsupported" | "network" | "aborted" | "other";
export interface Heard {
  alternatives: string[]; // best guess first
  error?: HeardError;
}

export interface Listening {
  result: Promise<Heard>;
  stop: () => void; // stop and use what was heard so far
}

// one answer from the mic. the browser gives a few guesses, we keep them all
// so a slightly different guess can still count
export function listen(lang = "ja-JP", maxMs = 7000): Listening {
  const R = recognizerClass();
  if (!R) return { result: Promise.resolve({ alternatives: [], error: "unsupported" }), stop: () => {} };
  const r = new R();
  r.lang = lang;
  r.interimResults = false;
  r.maxAlternatives = 5;
  r.continuous = false;
  let alts: string[] = [];
  let err: HeardError | undefined;
  const result = new Promise<Heard>((resolve) => {
    const timer = window.setTimeout(() => r.stop(), maxMs);
    r.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      alts = Array.from({ length: last.length }, (_, i) => last[i].transcript).filter(Boolean);
    };
    r.onerror = (e) => {
      err = e.error === "no-speech" || e.error === "not-allowed" || e.error === "network" || e.error === "aborted" ? e.error : e.error === "service-not-allowed" ? "not-allowed" : "other";
    };
    r.onend = () => {
      window.clearTimeout(timer);
      resolve({ alternatives: alts, error: alts.length ? undefined : (err ?? "no-speech") });
    };
  });
  try {
    r.start();
  } catch {
    return { result: Promise.resolve({ alternatives: [], error: "other" }), stop: () => {} };
  }
  return { result, stop: () => r.stop() };
}
