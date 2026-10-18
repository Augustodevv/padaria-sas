/** Menor "número bonito" (1, 2, 2.5, 5 × 10^k) maior ou igual ao valor — para o teto do eixo. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = 10 ** exp;
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * base >= value) return m * base;
  }
  return 10 * base;
}

/** "R$ 1,2 mil" / "R$ 350" — rótulo curto para eixo (valor em centavos). */
export function compactBRL(cents: number): string {
  const reais = cents / 100;
  if (reais >= 1000) return `R$ ${(reais / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${reais.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

/** "2026-10-19" → "19/10" */
export function shortDay(day: string): string {
  return `${day.slice(8, 10)}/${day.slice(5, 7)}`;
}
