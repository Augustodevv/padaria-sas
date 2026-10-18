import { describe, expect, it } from "vitest";
import { checkoutSchema } from "./checkout";

const base = {
  items: [{ productId: "p1", quantity: 2 }],
  fulfillment: "PICKUP",
  scheduledFor: "2026-10-20T12:00:00.000Z",
  idempotencyKey: "0123456789abcdef0123",
};

const address = {
  zipCode: "01310-100",
  street: "Av. Paulista",
  number: "1000",
  neighborhood: "Bela Vista",
  city: "São Paulo",
  state: "sp",
};

describe("checkoutSchema", () => {
  it("aceita retirada sem endereço e converte a data", () => {
    const r = checkoutSchema.parse(base);
    expect(r.scheduledFor).toBeInstanceOf(Date);
  });

  it("exige endereço na entrega e normaliza o estado", () => {
    expect(checkoutSchema.safeParse({ ...base, fulfillment: "DELIVERY" }).success).toBe(false);
    const r = checkoutSchema.parse({ ...base, fulfillment: "DELIVERY", address });
    expect(r.address?.state).toBe("SP");
  });

  it.each([
    ["carrinho vazio", { items: [] }],
    ["quantidade zero", { items: [{ productId: "p1", quantity: 0 }] }],
    ["quantidade acima do limite", { items: [{ productId: "p1", quantity: 21 }] }],
    ["fulfillment inválido", { fulfillment: "DRONE" }],
    ["data inválida", { scheduledFor: "amanhã" }],
    ["chave de idempotência curta", { idempotencyKey: "abc" }],
    ["observação longa", { notes: "x".repeat(301) }],
    ["cupom com caracteres estranhos", { couponCode: "<script>" }],
  ])("rejeita: %s", (_, patch) => {
    expect(checkoutSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  });

  it("rejeita CEP inválido", () => {
    expect(
      checkoutSchema.safeParse({ ...base, fulfillment: "DELIVERY", address: { ...address, zipCode: "123" } }).success,
    ).toBe(false);
  });
});
