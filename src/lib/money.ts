/** Todos os valores monetários da aplicação são inteiros em centavos. */
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

export function toCents(reais: number): number {
  return Math.round(reais * 100);
}
