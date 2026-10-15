"use client";

import { useState } from "react";

// falling sakura petals for a perfect round
export function Petals({ count = 26 }: { count?: number }) {
  const [petals] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      dx: `${(Math.random() - 0.5) * 30}vw`,
      rot: `${Math.random() * 720 - 360}deg`,
      dur: `${2.6 + Math.random() * 2}s`,
      delay: `${Math.random() * 0.8}s`,
      size: 8 + Math.random() * 8,
    })),
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {petals.map((p) => (
        <span
          key={p.id}
          className="petal absolute top-0 block rounded-[60%_0_60%_0] bg-sakura/80"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.8,
              "--dx": p.dx,
              "--rot": p.rot,
              "--dur": p.dur,
              "--delay": p.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
