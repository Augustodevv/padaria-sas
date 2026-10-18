"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useRef, useState } from "react";
import { compactBRL, niceMax, shortDay } from "@/lib/chart";
import { formatBRL } from "@/lib/money";

interface Point {
  day: string;
  cents: number;
  orders: number;
}

const W = 720;
const H = 260;
const M = { top: 16, right: 16, bottom: 28, left: 56 };
const innerW = W - M.left - M.right;
const innerH = H - M.top - M.bottom;

/** Receita por dia: uma série (sem legenda), linha de 2px, grade discreta, tooltip e tabela alternativa. */
export function RevenueChart({ data }: { data: Point[] }) {
  const reduce = useReducedMotion();
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  const { points, ticks, max, path, area, peak } = useMemo(() => {
    const maxVal = niceMax(Math.max(...data.map((d) => d.cents), 1));
    const x = (i: number) => M.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = (v: number) => M.top + innerH - (v / maxVal) * innerH;
    const pts = data.map((d, i) => ({ ...d, x: x(i), y: y(d.cents) }));
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const base = M.top + innerH;
    const peakIdx = data.reduce((best, d, i) => (d.cents > data[best].cents ? i : best), 0);
    return {
      points: pts,
      max: maxVal,
      ticks: [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: maxVal * f, y: y(maxVal * f) })),
      path: line,
      area: `${line} L${pts.at(-1)!.x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`,
      peak: data[peakIdx].cents > 0 ? pts[peakIdx] : null,
    };
  }, [data]);

  const total = data.reduce((s, d) => s + d.cents, 0);
  const current = active !== null ? points[active] : null;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((px - M.left) / innerW) * (data.length - 1));
    setActive(Math.min(data.length - 1, Math.max(0, idx)));
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") setActive((a) => Math.min(data.length - 1, (a ?? -1) + 1));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? data.length) - 1));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  }

  const labelIdx = [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    <figure className="m-0">
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">Faturamento por dia</span>
        <button
          type="button"
          onClick={() => setTable((t) => !t)}
          aria-pressed={table}
          className="text-sm text-coffee/70 underline underline-offset-2 hover:text-coffee"
        >
          {table ? "Ver gráfico" : "Ver como tabela"}
        </button>
      </figcaption>

      {table ? (
        <div className="max-h-64 overflow-auto rounded-lg border border-beige">
          <table className="w-full text-sm">
            <caption className="sr-only">Faturamento e pedidos por dia</caption>
            <thead className="sticky top-0 bg-cream text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Dia</th>
                <th className="px-3 py-2 text-right font-medium">Pedidos</th>
                <th className="px-3 py-2 text-right font-medium">Faturamento</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.day} className="border-t border-beige">
                  <td className="px-3 py-1.5">{shortDay(d.day)}</td>
                  <td className="px-3 py-1.5 text-right">{d.orders}</td>
                  <td className="px-3 py-1.5 text-right">{formatBRL(d.cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full touch-pan-y select-none outline-offset-4"
            role="img"
            tabIndex={0}
            aria-label={`Faturamento por dia, total de ${formatBRL(total)} em ${data.length} dias. Use as setas para explorar.`}
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setActive(null)}
            onKeyDown={onKey}
            onBlur={() => setActive(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {ticks.map((t) => (
              <g key={t.v}>
                <line x1={M.left} x2={W - M.right} y1={t.y} y2={t.y} stroke="var(--chart-grid)" strokeWidth="1" />
                <text x={M.left - 8} y={t.y + 4} textAnchor="end" fontSize="11" fill="var(--chart-axis)">
                  {compactBRL(t.v)}
                </text>
              </g>
            ))}
            {labelIdx.map((i, k) => (
              <text
                key={i}
                x={points[i].x}
                y={H - 8}
                fontSize="11"
                fill="var(--chart-axis)"
                textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
              >
                {shortDay(data[i].day)}
              </text>
            ))}

            <motion.path
              d={area}
              fill={`url(#${gradientId})`}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
            <motion.path
              d={path}
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            />

            {peak && !current && (
              <g>
                <circle cx={peak.x} cy={peak.y} r="4" fill="var(--chart-1)" stroke="var(--chart-surface)" strokeWidth="2" />
                <text
                  x={Math.min(Math.max(peak.x, M.left + 40), W - M.right - 40)}
                  y={peak.y - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="var(--chart-ink)"
                >
                  {formatBRL(peak.cents)}
                </text>
              </g>
            )}

            {current && (
              <g>
                <line x1={current.x} x2={current.x} y1={M.top} y2={M.top + innerH} stroke="var(--chart-axis)" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx={current.x} cy={current.y} r="5" fill="var(--chart-1)" stroke="var(--chart-surface)" strokeWidth="2" />
              </g>
            )}
          </svg>

          {current && (
            <div
              role="status"
              className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 rounded-lg border border-beige bg-white px-3 py-2 text-sm shadow-soft"
              style={{
                left: `${Math.min(Math.max((current.x / W) * 100, 12), 88)}%`,
                top: `${(Math.max(current.y - 70, 0) / H) * 100}%`,
              }}
            >
              <p className="text-xs text-coffee/60">{shortDay(current.day)}</p>
              <p className="font-semibold">{formatBRL(current.cents)}</p>
              <p className="text-xs text-coffee/60">{current.orders} {current.orders === 1 ? "pedido" : "pedidos"}</p>
            </div>
          )}
        </div>
      )}
      <p className="sr-only">Escala até {formatBRL(max)}.</p>
    </figure>
  );
}
