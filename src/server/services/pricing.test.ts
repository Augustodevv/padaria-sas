import { describe, expect, it } from "vitest";
import { computeTotals, priceLines, PricingError, type CatalogProduct } from "./pricing";

const catalog: CatalogProduct[] = [
  { id: "p1", name: "Croissant", priceCents: 1290, isAvailable: true, archivedAt: null },
  { id: "p2", name: "Baguete", priceCents: 1400, isAvailable: true, archivedAt: null },
  { id: "p3", name: "Folhado", priceCents: 1700, isAvailable: false, archivedAt: null },
  { id: "p4", name: "Antigo", priceCents: 500, isAvailable: true, archivedAt: new Date("2025-01-01") },
];

describe("priceLines", () => {
  it("usa o preço do catálogo e calcula o total da linha", () => {
    const [line] = priceLines([{ productId: "p1", quantity: 3 }], catalog);
    expect(line).toMatchObject({ unitPriceCents: 1290, quantity: 3, lineTotalCents: 3870 });
  });

  it("junta linhas repetidas do mesmo produto", () => {
    const lines = priceLines(
      [
        { productId: "p1", quantity: 2 },
        { productId: "p1", quantity: 1 },
      ],
      catalog,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(3);
  });

  it.each([0, -1, 1.5, 21, Number.NaN])("rejeita quantidade inválida (%s)", (quantity) => {
    expect(() => priceLines([{ productId: "p1", quantity }], catalog)).toThrow(PricingError);
  });

  it("rejeita quando a soma de linhas repetidas passa do limite", () => {
    expect(() =>
      priceLines(
        [
          { productId: "p1", quantity: 15 },
          { productId: "p1", quantity: 10 },
        ],
        catalog,
      ),
    ).toThrow(/quantidade/i);
  });

  it("rejeita carrinho vazio, produto inexistente, arquivado ou indisponível", () => {
    const code = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return (e as PricingError).code;
      }
    };
    expect(code(() => priceLines([], catalog))).toBe("EMPTY_CART");
    expect(code(() => priceLines([{ productId: "x", quantity: 1 }], catalog))).toBe("PRODUCT_NOT_FOUND");
    expect(code(() => priceLines([{ productId: "p4", quantity: 1 }], catalog))).toBe("PRODUCT_NOT_FOUND");
    expect(code(() => priceLines([{ productId: "p3", quantity: 1 }], catalog))).toBe("PRODUCT_UNAVAILABLE");
  });
});

describe("computeTotals", () => {
  const lines = priceLines(
    [
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 1 },
    ],
    catalog,
  );

  it("soma subtotal, desconto e entrega em centavos inteiros", () => {
    expect(computeTotals({ lines, discountCents: 500, deliveryFeeCents: 800 })).toEqual({
      subtotalCents: 3980,
      discountCents: 500,
      deliveryFeeCents: 800,
      totalCents: 4280,
    });
  });

  it("não deixa o desconto passar do subtotal nem ser negativo", () => {
    expect(computeTotals({ lines, discountCents: 99999 }).totalCents).toBe(0);
    expect(computeTotals({ lines, discountCents: -100 }).discountCents).toBe(0);
  });
});
