import { describe, expect, it } from "vitest";
import { allowedTransitions, canTransition, REVENUE_STATUSES } from "./order-transitions";
import type { OrderStatus } from "./payment-status";

describe("order transitions", () => {
  it("avança um passo por vez", () => {
    expect(canTransition("CONFIRMED", "PREPARING")).toBe(true);
    expect(canTransition("PREPARING", "READY")).toBe(true);
    expect(canTransition("READY", "DELIVERED")).toBe(true);
  });

  it("não permite pular etapas nem voltar", () => {
    expect(canTransition("CONFIRMED", "READY")).toBe(false);
    expect(canTransition("CONFIRMED", "DELIVERED")).toBe(false);
    expect(canTransition("READY", "PREPARING")).toBe(false);
    expect(canTransition("PENDING_PAYMENT", "PREPARING")).toBe(false);
  });

  it("entregue e cancelado são finais", () => {
    expect(allowedTransitions("DELIVERED")).toEqual([]);
    expect(allowedTransitions("CANCELLED")).toEqual([]);
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
  });

  it("qualquer pedido em andamento pode ser cancelado", () => {
    for (const s of ["PENDING_PAYMENT", "CONFIRMED", "PREPARING", "READY"] as OrderStatus[]) {
      expect(canTransition(s, "CANCELLED")).toBe(true);
    }
  });

  it("pedido pendente de pagamento não conta como venda", () => {
    expect(REVENUE_STATUSES).not.toContain("PENDING_PAYMENT");
    expect(REVENUE_STATUSES).not.toContain("CANCELLED");
  });
});
