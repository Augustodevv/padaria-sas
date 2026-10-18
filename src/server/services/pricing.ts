/**
 * Cálculo de preços — funções puras. O servidor sempre recalcula o total a
 * partir dos preços oficiais do banco; valores vindos do cliente são ignorados.
 */
export const MAX_QTY_PER_ITEM = 20;

export interface RequestedLine {
  productId: string;
  quantity: number;
}

export interface CatalogProduct {
  id: string;
  name: string;
  priceCents: number;
  isAvailable: boolean;
  archivedAt: Date | null;
}

export interface PricedLine {
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export class PricingError extends Error {
  constructor(
    public code: "EMPTY_CART" | "INVALID_QUANTITY" | "PRODUCT_NOT_FOUND" | "PRODUCT_UNAVAILABLE",
    message: string,
  ) {
    super(message);
    this.name = "PricingError";
  }
}

/** Junta as linhas pedidas ao catálogo oficial, validando existência e disponibilidade. */
export function priceLines(requested: RequestedLine[], catalog: CatalogProduct[]): PricedLine[] {
  if (requested.length === 0) throw new PricingError("EMPTY_CART", "O carrinho está vazio.");

  const byId = new Map(catalog.map((p) => [p.id, p]));
  const merged = new Map<string, number>();

  for (const line of requested) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QTY_PER_ITEM) {
      throw new PricingError("INVALID_QUANTITY", `Quantidade inválida (1 a ${MAX_QTY_PER_ITEM}).`);
    }
    merged.set(line.productId, (merged.get(line.productId) ?? 0) + line.quantity);
  }

  return [...merged].map(([productId, quantity]) => {
    const p = byId.get(productId);
    if (!p || p.archivedAt) throw new PricingError("PRODUCT_NOT_FOUND", "Produto não encontrado.");
    if (!p.isAvailable) throw new PricingError("PRODUCT_UNAVAILABLE", `${p.name} está indisponível.`);
    if (quantity > MAX_QTY_PER_ITEM) {
      throw new PricingError("INVALID_QUANTITY", `Quantidade inválida (1 a ${MAX_QTY_PER_ITEM}).`);
    }
    return {
      productId,
      productName: p.name,
      unitPriceCents: p.priceCents,
      quantity,
      lineTotalCents: p.priceCents * quantity,
    };
  });
}

export interface Totals {
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
}

export function computeTotals(input: {
  lines: PricedLine[];
  discountCents?: number;
  deliveryFeeCents?: number;
}): Totals {
  const subtotalCents = input.lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const discountCents = Math.min(Math.max(input.discountCents ?? 0, 0), subtotalCents);
  const deliveryFeeCents = Math.max(input.deliveryFeeCents ?? 0, 0);
  return {
    subtotalCents,
    discountCents,
    deliveryFeeCents,
    totalCents: subtotalCents - discountCents + deliveryFeeCents,
  };
}
