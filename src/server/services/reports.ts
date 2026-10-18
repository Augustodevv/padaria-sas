/** Cálculos de relatório — funções puras (a consulta SQL fica no repositório). */

export interface DayRow {
  /** YYYY-MM-DD no fuso de São Paulo */
  day: string;
  cents: number;
  orders: number;
}

/** Data "de parede" de São Paulo (UTC-3) como YYYY-MM-DD. */
export function spDay(d: Date): string {
  return new Date(d.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
}

/** Preenche com zero os dias sem venda, do mais antigo ao mais recente (inclui hoje). */
export function fillDailySeries(rows: DayRow[], days: number, now: Date): DayRow[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: DayRow[] = [];
  const todayMs = Date.parse(`${spDay(now)}T00:00:00Z`);
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(todayMs - i * 86_400_000).toISOString().slice(0, 10);
    out.push(byDay.get(day) ?? { day, cents: 0, orders: 0 });
  }
  return out;
}

/** Variação percentual; null quando não há base de comparação. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function averageTicket(revenueCents: number, orders: number): number {
  return orders === 0 ? 0 : Math.round(revenueCents / orders);
}

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

export function parsePeriod(raw: string | undefined): Period {
  const n = Number(raw);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : 30;
}
