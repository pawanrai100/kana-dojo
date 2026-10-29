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

function Brows({ y, dx = 18, tilt = 7 }: { y: number; dx?: number; tilt?: number }) {
  return (
    <g {...line} strokeWidth={7} fill="none">
      <path d={`M${80 - dx - 16} ${y - tilt} L${80 - dx + 8} ${y + tilt}`} />
      <path d={`M${80 + dx + 16} ${y - tilt} L${80 + dx - 8} ${y + tilt}`} />
    </g>
  );
}

// river imp: green, water plate on the head, duck beak
function Kappa() {
  return (
    <g>
      <ellipse cx={34} cy={112} rx={12} ry={16} fill="#3fa654" {...line} />
      <ellipse cx={126} cy={112} rx={12} ry={16} fill="#3fa654" {...line} />
      <ellipse cx={80} cy={100} rx={48} ry={46} fill="#5cc46a" {...line} />
      <ellipse cx={80} cy={124} rx={26} ry={18} fill="#f3e6a0" {...line} strokeWidth={4} />
      <path d="M44 72 L50 52 L60 66 L68 46 L80 62 L92 46 L100 66 L110 52 L116 72 Z" fill="#2f8a44" {...line} />
      <ellipse cx={80} cy={58} rx={26} ry={9} fill="#bfe8ff" {...line} />
      <path d="M70 56 q6 -3 12 0" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Eye x={62} y={86} look={2} />
      <Eye x={98} y={86} look={2} />
      <path d="M64 104 Q80 96 96 104 Q80 116 64 104 Z" fill="#ffc93c" {...line} />
      <Cheeks y={104} dx={38} />
    </g>
  );
}

// shapeshifter raccoon dog: dark eye mask, leaf on its head
function Tanuki() {
  return (
    <g>
      <circle cx={46} cy={50} r={16} fill="#8a5a3b" {...line} />
      <circle cx={114} cy={50} r={16} fill="#8a5a3b" {...line} />
      <circle cx={46} cy={50} r={7} fill="#4a2f20" />
      <circle cx={114} cy={50} r={7} fill="#4a2f20" />
      <ellipse cx={80} cy={98} rx={52} ry={50} fill="#b07a52" {...line} />
      <ellipse cx={80} cy={126} rx={30} ry={20} fill="#f1d9b5" {...line} strokeWidth={4} />
      <ellipse cx={60} cy={88} rx={19} ry={14} fill="#4a2f20" transform="rotate(-12 60 88)" />
      <ellipse cx={100} cy={88} rx={19} ry={14} fill="#4a2f20" transform="rotate(12 100 88)" />
      <Eye x={60} y={88} r={9} look={1} />
      <Eye x={100} y={88} r={9} look={1} />
      <ellipse cx={80} cy={104} rx={7} ry={5} fill={INK} />
      <path d="M70 112 q10 8 20 0" {...line} strokeWidth={4} fill="none" />
      <path d="M80 48 C66 40 66 22 86 14 C92 30 92 42 80 48 Z" fill="#62c46b" {...line} strokeWidth={4} />
      <path d="M80 46 L84 24" stroke="#2f8a44" strokeWidth={3} strokeLinecap="round" />
      <Cheeks y={108} dx={38} />
    </g>
  );
}

// mountain goblin: red face, very long nose, tiny black cap, wild white hair
function Tengu() {
  return (
    <g>
      <path d="M30 96 L22 70 L38 74 L34 48 L54 58 L60 34 L80 50 L100 34 L106 58 L126 48 L122 74 L138 70 L130 96 L138 120 L116 114 Z" fill="#f4f4f4" {...line} />
      <ellipse cx={80} cy={94} rx={42} ry={44} fill="#e5484d" {...line} />
      <path d="M68 48 L80 36 L92 48 L88 58 L72 58 Z" fill="#2a2a3a" {...line} strokeWidth={4} />
      <Brows y={76} dx={18} tilt={6} />
      <Eye x={60} y={88} r={9} look={2} />
      <Eye x={100} y={88} r={9} look={-2} />
      <path d="M72 100 L136 96 Q146 100 136 108 L76 116 Z" fill="#c9343a" {...line} />
      <path d="M62 126 Q80 118 98 126" {...line} strokeWidth={5} fill="none" />
      <path d="M58 128 Q80 160 102 128 Q92 140 80 140 Q68 140 58 128 Z" fill="#f4f4f4" {...line} strokeWidth={4} />
    </g>
  );
}

// thunder demon: blue, two yellow horns, fangs, purple hair
function Oni() {
  return (
    <g>
      <path d="M32 92 L26 58 L44 66 L46 40 L62 54 L80 34 L98 54 L114 40 L116 66 L134 58 L128 92 Z" fill="#6b3fa0" {...line} />
      <path d="M56 58 L44 16 L72 50 Z" fill="#ffc93c" {...line} />
      <path d="M104 58 L116 16 L88 50 Z" fill="#ffc93c" {...line} />
      <ellipse cx={80} cy={96} rx={46} ry={44} fill="#4f7cff" {...line} />
      <Brows y={78} dx={18} tilt={8} />
      <circle cx={60} cy={90} r={11} fill="#ffe680" {...line} strokeWidth={4} />
      <circle cx={100} cy={90} r={11} fill="#ffe680" {...line} strokeWidth={4} />
      <circle cx={62} cy={91} r={5} fill={INK} />
      <circle cx={98} cy={91} r={5} fill={INK} />
      <ellipse cx={80} cy={104} rx={8} ry={5} fill="#3456c9" />
      <path d="M52 114 Q80 140 108 114 Z" fill="#8a1c2b" {...line} />
      <path d="M58 116 L64 104 L70 118 Z M90 118 L96 104 L102 116 Z" fill="#fff" {...line} strokeWidth={3} />
      <path d="M62 30 l6 -10 l-2 8 l6 -2 l-6 10" stroke="#ffc93c" strokeWidth={3} fill="none" strokeLinejoin="round" />
    </g>
  );
}

// tree spirit: little white head, three dark holes for a face
function Kodama() {
  return (
    <g>
      <ellipse cx={80} cy={140} rx={34} ry={8} fill="#000" opacity={0.08} />
      <path d="M58 136 Q60 112 64 104 L96 104 Q100 112 102 136 Q80 142 58 136 Z" fill="#f2f3ec" {...line} />
      <ellipse cx={80} cy={74} rx={44} ry={40} fill="#f7f8f2" {...line} />
      <ellipse cx={62} cy={72} rx={8} ry={11} fill={INK} />
      <ellipse cx={98} cy={70} rx={8} ry={11} fill={INK} />
      <ellipse cx={80} cy={98} rx={7} ry={9} fill={INK} />
      <path d="M44 52 q-10 -10 -4 -22 M116 50 q10 -10 4 -22" stroke="#7bbf6a" strokeWidth={5} fill="none" strokeLinecap="round" />
      <ellipse cx={42} cy={28} rx={9} ry={5} fill="#7bbf6a" transform="rotate(-30 42 28)" />
      <ellipse cx={118} cy={26} rx={9} ry={5} fill="#7bbf6a" transform="rotate(30 118 26)" />
    </g>
  );
}

// umbrella ghost: paper umbrella, one big eye, long tongue, one hopping leg
function Kasa() {
  return (
    <g>
      <path d="M80 104 L80 138" {...line} strokeWidth={6} />
      <path d="M80 138 L70 146 L92 146" {...line} strokeWidth={6} fill="none" />
      <path d="M14 96 Q80 -8 146 96 Q130 88 114 96 Q97 88 80 96 Q63 88 46 96 Q30 88 14 96 Z" fill="#7c5cff" {...line} />
      <path d="M80 24 L80 94 M48 54 L44 92 M112 54 L116 92" stroke="#5a3fd6" strokeWidth={3} />
      <path d="M80 18 L80 8" {...line} />
      <circle cx={80} cy={58} r={17} fill="#fff" {...line} strokeWidth={4} />
      <circle cx={82} cy={60} r={8} fill={INK} />
      <circle cx={85} cy={56} r={3} fill="#fff" />
      <path d="M72 84 Q70 116 84 120 Q94 116 88 84 Z" fill="#ff6f91" {...line} strokeWidth={4} />
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
  kappa: Kappa,
  tanuki: Tanuki,
  tengu: Tengu,
  oni: Oni,
  kodama: Kodama,
  kasa: Kasa,
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
