"use client";

import { useId, useState } from "react";

// small dependency-free svg charts. one series each, so one hue + a legend-free title

interface Point {
  label: string; // x label for tooltip
  value: number;
  detail?: string;
}

const W = 640;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const step = Math.pow(10, Math.floor(Math.log10(max / count)));
  const err = (count * step) / max;
  const mult = err <= 0.15 ? 10 : err <= 0.35 ? 5 : err <= 0.75 ? 2 : 1;
  const s = step * mult;
  const out: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += s) out.push(+v.toFixed(6));
  return out;
}

export function LineChart({
  data,
  max,
  format = (v) => String(v),
  ariaLabel,
  emptyText,
}: {
  data: Point[];
  max?: number;
  format?: (v: number) => string;
  ariaLabel: string;
  emptyText: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length < 2) return <EmptyChart text={emptyText} />;

  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  const ticks = niceTicks(top);
  const yMax = Math.max(top, ticks[ticks.length - 1]);
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (data.length - 1)) * iw;
  const y = (v: number) => PAD.top + ih - (v / yMax) * ih;
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join("");
  const area = `${path}L${x(data.length - 1)},${PAD.top + ih}L${x(0)},${PAD.top + ih}Z`;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - r.left) / r.width;
    setHover(Math.round(rel * (data.length - 1)));
  };

  const h = hover != null ? data[hover] : null;

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)">
              {format(t)}
            </text>
          </g>
        ))}
        <path d={area} fill="var(--primary)" opacity={0.08} />
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <text x={PAD.left} y={H - 6} fontSize={11} fill="var(--muted)">
          {data[0].label}
        </text>
        <text x={W - PAD.right} y={H - 6} fontSize={11} fill="var(--muted)" textAnchor="end">
          {data[data.length - 1].label}
        </text>
        {h && hover != null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--muted)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.value)} r={5} fill="var(--primary)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        )}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={iw}
          height={ih}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {h && hover != null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-card"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <div className="text-muted">{h.label}</div>
          <div className="font-semibold">{format(h.value)}</div>
          {h.detail && <div className="text-muted">{h.detail}</div>}
        </div>
      )}
      <DataTable data={data} format={format} />
    </figure>
  );
}

export function BarChart({
  data,
  format = (v) => String(v),
  ariaLabel,
  emptyText,
}: {
  data: Point[];
  format?: (v: number) => string;
  ariaLabel: string;
  emptyText: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.every((d) => d.value === 0)) return <EmptyChart text={emptyText} />;
  const top = Math.max(...data.map((d) => d.value));
  const ticks = niceTicks(top);
  const yMax = Math.max(top, ticks[ticks.length - 1]);
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const slot = iw / data.length;
  const bw = Math.max(4, slot - 2 - slot * 0.25);
  const y = (v: number) => PAD.top + ih - (v / yMax) * ih;
  const h = hover != null ? data[hover] : null;

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)">
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const bx = PAD.left + i * slot + (slot - bw) / 2;
          const by = y(d.value);
          const bh = PAD.top + ih - by;
          const r = Math.min(4, bw / 2, bh);
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={ih} fill="transparent" />
              {d.value > 0 && (
                <path
                  d={`M${bx},${by + bh}V${by + r}Q${bx},${by} ${bx + r},${by}H${bx + bw - r}Q${bx + bw},${by} ${bx + bw},${by + r}V${by + bh}Z`}
                  fill="var(--primary)"
                  opacity={hover == null || hover === i ? 1 : 0.45}
                />
              )}
              {(i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 7) === 0) && (
                <text x={bx + bw / 2} y={H - 6} fontSize={10} textAnchor="middle" fill="var(--muted)">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {h && hover != null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-card"
          style={{ left: `${((PAD.left + (hover + 0.5) * slot) / W) * 100}%` }}
        >
          <div className="text-muted">{h.label}</div>
          <div className="font-semibold">{format(h.value)}</div>
          {h.detail && <div className="text-muted">{h.detail}</div>}
        </div>
      )}
      <DataTable data={data} format={format} />
    </figure>
  );
}

function DataTable({ data, format }: { data: Point[]; format: (v: number) => string }) {
  const id = useId();
  return (
    <details className="mt-2 text-xs text-muted">
      <summary className="cursor-pointer select-none hover:text-foreground">Show as table</summary>
      <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-border">
        <table className="w-full text-left" aria-describedby={id}>
          <tbody>
            {data.map((d, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <th scope="row" className="px-3 py-1.5 font-normal">
                  {d.label}
                </th>
                <td className="px-3 py-1.5 text-right tabular-nums text-foreground">{format(d.value)}</td>
                <td className="px-3 py-1.5">{d.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="grid h-40 place-items-center rounded-xl border border-dashed border-border text-center text-sm text-muted">
      <p className="max-w-xs px-4">{text}</p>
    </div>
  );
}
