import type { Enemy } from "@/lib/tower/floors";
import { cn } from "@/lib/utils";

// hand-drawn yokai, all on a 160x160 board with the same chunky outline

const INK = "#1a1d3a";
const line = { stroke: INK, strokeWidth: 5, strokeLinejoin: "round", strokeLinecap: "round" } as const;

function Eye({ x, y, r = 11, look = 0 }: { x: number; y: number; r?: number; look?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#fff" {...line} strokeWidth={4} />
      <circle cx={x + look} cy={y + 1} r={r * 0.5} fill={INK} />
      <circle cx={x + look + r * 0.2} cy={y - r * 0.2} r={r * 0.17} fill="#fff" />
    </g>
  );
}

function Cheeks({ y = 100, dx = 34 }: { y?: number; dx?: number }) {
  return (
    <g fill="#ff8fa3" opacity={0.7}>
      <ellipse cx={80 - dx} cy={y} rx={8} ry={5} />
      <ellipse cx={80 + dx} cy={y} rx={8} ry={5} />
    </g>
  );
}

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

// paper lantern ghost: one big eye, tongue out
function Obake() {
  return (
    <g>
      <path d="M80 10 L80 26" {...line} />
      <rect x={58} y={24} width={44} height={12} rx={4} fill="#2a2a3a" {...line} strokeWidth={4} />
      <rect x={58} y={128} width={44} height={12} rx={4} fill="#2a2a3a" {...line} strokeWidth={4} />
      <ellipse cx={80} cy={82} rx={42} ry={50} fill="#fff1d6" {...line} />
      <g stroke="#e8c98f" strokeWidth={3} fill="none">
        <path d="M42 62 Q80 54 118 62" />
        <path d="M39 100 Q80 108 121 100" />
        <path d="M44 118 Q80 126 116 118" />
      </g>
      <circle cx={84} cy={70} r={16} fill="#fff" {...line} strokeWidth={4} />
      <circle cx={86} cy={72} r={8} fill={INK} />
      <circle cx={89} cy={68} r={3} fill="#fff" />
      <path d="M58 92 Q80 112 102 92 Q80 100 58 92 Z" fill="#8a1c2b" {...line} strokeWidth={4} />
      <path d="M74 98 Q72 130 84 132 Q94 130 88 99 Z" fill="#ff6f91" {...line} strokeWidth={4} />
      <path d="M50 40 Q40 30 46 22" stroke="#e5484d" strokeWidth={4} fill="none" strokeLinecap="round" />
    </g>
  );
}

// okinawan lion-dog guard: curly mane, big grin
function Shisa() {
  const curls = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return <circle key={i} cx={80 + Math.cos(a) * 50} cy={88 + Math.sin(a) * 46} r={16} fill="#c75b2c" {...line} strokeWidth={4} />;
  });
  return (
    <g>
      {curls}
      <ellipse cx={80} cy={88} rx={44} ry={40} fill="#f0a35a" {...line} />
      <path d="M50 70 q8 -8 18 -2 M110 70 q-8 -8 -18 -2" {...line} strokeWidth={6} fill="none" />
      <Eye x={62} y={82} r={12} look={1} />
      <Eye x={98} y={82} r={12} look={-1} />
      <ellipse cx={80} cy={100} rx={12} ry={8} fill="#8a3a1c" {...line} strokeWidth={4} />
      <path d="M50 108 Q80 140 110 108 Z" fill="#8a1c2b" {...line} />
      <path d="M56 109 L104 109 L100 116 L60 116 Z" fill="#fff" />
      <Cheeks y={104} dx={36} />
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
};

const ART: Partial<Record<Enemy["id"], () => React.ReactElement>> = {
  kitsune: Kitsune,
  obake: Obake,
  shisa: Shisa,
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
