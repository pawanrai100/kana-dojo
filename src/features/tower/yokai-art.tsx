import type { Enemy } from "@/lib/tower/floors";
import { cn } from "@/lib/utils";

// boss art. regular monsters have no art, just a name

const INK = "#1a1d3a";
const line = { stroke: INK, strokeWidth: 5, strokeLinejoin: "round", strokeLinecap: "round" } as const;

// fox spirit: three tails, smug closed eyes, red face marks
function Kitsune() {
  const tail = (deg: number) => (
    <g transform={`rotate(${deg} 80 140)`}>
      <path d="M80 140 C56 110 60 60 80 40 C100 60 104 110 80 140 Z" fill="#ff9a3c" {...line} />
      <path d="M80 40 C72 50 70 60 72 66 C78 62 86 62 88 66 C90 60 88 50 80 40 Z" fill="#fff6ea" {...line} strokeWidth={4} />
    </g>
  );
  return (
    <g>
      {tail(-48)}
      {tail(48)}
      {tail(0)}
      <path d="M38 30 L68 66 L32 78 Z" fill="#ff9a3c" {...line} />
      <path d="M122 30 L92 66 L128 78 Z" fill="#ff9a3c" {...line} />
      <path d="M42 44 L58 64 L40 70 Z" fill="#ffb3c1" />
      <path d="M118 44 L102 64 L120 70 Z" fill="#ffb3c1" />
      <ellipse cx={80} cy={94} rx={46} ry={40} fill="#ff9a3c" {...line} />
      <path d="M50 104 Q80 140 110 104 Q96 116 80 116 Q64 116 50 104 Z" fill="#fff6ea" {...line} strokeWidth={4} />
      <path d="M54 88 q10 -9 20 0" {...line} strokeWidth={6} fill="none" />
      <path d="M86 88 q10 -9 20 0" {...line} strokeWidth={6} fill="none" />
      <path d="M58 74 l6 6 M102 74 l-6 6" stroke="#e5484d" strokeWidth={5} strokeLinecap="round" />
      <ellipse cx={80} cy={106} rx={6} ry={4.5} fill={INK} />
      <path d="M72 116 q8 5 16 0" {...line} strokeWidth={4} fill="none" />
    </g>
  );
}

// bosses drawn by pawan, cut out as transparent webp
const DRAWN: Partial<Record<Enemy["id"], string>> = {
  saru: "/bosses/ugyasaru.webp",
  orochi: "/bosses/hyunorochi.webp",
  tako: "/bosses/deeptako.webp",
  kozo: "/bosses/jinkozo.webp",
  ryu: "/bosses/pawaryu.webp",
  shikappa: "/bosses/shikappa.webp",
  alekoni: "/bosses/alekoni.webp",
  stellatsune: "/bosses/stellatsune.webp",
  minjimata: "/bosses/minjimata.webp",
  ayutengu: "/bosses/ayutengu.webp",
  pramirei: "/bosses/pramirei.webp",
  basarihyon: "/bosses/basarihyon.webp",
};

const ART: Partial<Record<Enemy["id"], () => React.ReactElement>> = {
  kitsune: Kitsune,
};

export function YokaiArt({ id, className, title }: { id: Enemy["id"]; className?: string; title?: string }) {
  const src = DRAWN[id];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- small fixed sprites, animated with css
    return <img src={src} alt={title ?? ""} draggable={false} decoding="async" className={cn("object-contain select-none", className)} />;
  }
  const Art = ART[id]!;
  return (
    <svg viewBox="0 0 160 160" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <Art />
    </svg>
  );
}
