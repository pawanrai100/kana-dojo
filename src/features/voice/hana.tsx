import { cn } from "@/lib/utils";

// hana-sensei: an original little character, a girl with a flower clip
// (hana means flower). her mouth moves while she talks, a ring pulses while she listens
export function Hana({ state = "idle", className }: { state?: "idle" | "talking" | "listening" | "happy" | "sad"; className?: string }) {
  const talking = state === "talking";
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} aria-hidden>
      {state === "listening" && <span className="animate-mic-ring absolute inset-0 rounded-full bg-bad/40" />}
      <svg viewBox="0 0 120 120" className={cn("relative size-full", talking && "animate-hana-bob")}>
        <circle cx="60" cy="60" r="58" fill="#ffe3ec" />
        {/* hair back */}
        <path d="M22 66 C18 34 38 16 60 16 C82 16 102 34 98 66 L98 92 C90 96 84 92 82 86 L38 86 C36 92 30 96 22 92 Z" fill="#2b2140" />
        {/* face */}
        <ellipse cx="60" cy="66" rx="30" ry="31" fill="#ffe7d6" />
        {/* bangs */}
        <path d="M30 58 C32 36 46 28 60 28 C74 28 88 36 90 58 C82 50 76 44 70 42 C66 50 56 54 46 52 C42 56 36 58 30 58 Z" fill="#2b2140" />
        {/* flower clip */}
        <g transform="translate(86 36)">
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="0" cy="-7" rx="5" ry="7" fill="#ff7aa8" transform={`rotate(${r})`} />
          ))}
          <circle r="4" fill="#ffd23f" />
        </g>
        {/* eyes */}
        {state === "happy" ? (
          <g stroke="#2b2140" strokeWidth="3.5" strokeLinecap="round" fill="none">
            <path d="M43 66 q5 -6 10 0" />
            <path d="M67 66 q5 -6 10 0" />
          </g>
        ) : (
          <g fill="#2b2140">
            <ellipse cx="48" cy="66" rx="4.5" ry={state === "sad" ? 4 : 5.5} />
            <ellipse cx="72" cy="66" rx="4.5" ry={state === "sad" ? 4 : 5.5} />
            <circle cx="49.5" cy="64" r="1.6" fill="#fff" />
            <circle cx="73.5" cy="64" r="1.6" fill="#fff" />
          </g>
        )}
        {state === "sad" && (
          <g stroke="#2b2140" strokeWidth="2.5" strokeLinecap="round">
            <path d="M42 57 l9 3" />
            <path d="M78 57 l-9 3" />
          </g>
        )}
        <ellipse cx="40" cy="77" rx="5" ry="3" fill="#ff9bb5" opacity="0.7" />
        <ellipse cx="80" cy="77" rx="5" ry="3" fill="#ff9bb5" opacity="0.7" />
        {/* mouth */}
        {talking ? (
          <ellipse className="animate-hana-mouth" cx="60" cy="83" rx="5" ry="4" fill="#c2415f" />
        ) : state === "sad" ? (
          <path d="M54 86 q6 -5 12 0" stroke="#c2415f" strokeWidth="3" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M53 81 q7 7 14 0" stroke="#c2415f" strokeWidth="3" fill="none" strokeLinecap="round" />
        )}
      </svg>
    </span>
  );
}
