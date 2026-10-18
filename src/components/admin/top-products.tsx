"use client";

import { motion, useReducedMotion } from "motion/react";
import { formatBRL } from "@/lib/money";

interface Row {
  name: string;
  units: number;
  cents: number;
}

/** Ranking por unidades vendidas: barras horizontais de um matiz, valor rotulado no fim de cada barra. */
export function TopProducts({ rows }: { rows: Row[] }) {
  const reduce = useReducedMotion();
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-coffee/60">Nenhuma venda no período.</p>;
  }
  const max = Math.max(...rows.map((r) => r.units));

  return (
    <ol className="space-y-3" aria-label="Produtos mais vendidos">
      {rows.map((r, i) => (
        <li
          key={r.name}
          tabIndex={0}
          className="group relative rounded-md outline-offset-2"
          title={`${r.name}: ${r.units} un. · ${formatBRL(r.cents)}`}
        >
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{r.name}</span>
            <span className="shrink-0 font-semibold tabular-nums">{r.units} un.</span>
          </div>
          <div className="h-2.5 rounded-full bg-beige/60">
            <motion.div
              className="h-full rounded-full bg-[var(--chart-1)]"
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${(r.units / max) * 100}%` }}
              transition={{ duration: 0.7, delay: 0.08 * i, ease: "easeOut" }}
            />
          </div>
          <p className="mt-1 text-xs text-coffee/60 opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">
            {formatBRL(r.cents)} em vendas
          </p>
        </li>
      ))}
    </ol>
  );
}
