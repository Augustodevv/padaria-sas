import { describe, expect, it } from "vitest";
import {
  mapMercadoPagoStatus,
  mergePaymentStatus,
  orderStatusAfterPayment,
  signMercadoPagoManifest,
  verifyMercadoPagoSignature,
} from "./payment-status";

describe("mapMercadoPagoStatus", () => {
  it.each([
    ["approved", "APPROVED"],
    ["rejected", "REJECTED"],
    ["cancelled", "CANCELLED"],
    ["expired", "CANCELLED"],
    ["refunded", "REFUNDED"],
    ["charged_back", "REFUNDED"],
    ["in_process", "PENDING"],
    ["pending", "PENDING"],
    ["algo_novo", "PENDING"],
  ])("%s → %s", (mp, expected) => {
    expect(mapMercadoPagoStatus(mp)).toBe(expected);
  });
});

describe("orderStatusAfterPayment", () => {
  it("aprovação confirma um pedido pendente", () => {
    expect(orderStatusAfterPayment("PENDING_PAYMENT", "APPROVED")).toBe("CONFIRMED");
  });

  it("evento atrasado ou duplicado não regride pedido em andamento", () => {
    for (const s of ["CONFIRMED", "PREPARING", "READY", "DELIVERED"] as const) {
      expect(orderStatusAfterPayment(s, "APPROVED")).toBe(s);
    }
    expect(orderStatusAfterPayment("PREPARING", "CANCELLED")).toBe("PREPARING");
    expect(orderStatusAfterPayment("DELIVERED", "REFUNDED")).toBe("DELIVERED");
  });

  it("cancelamento/estorno cancela só antes do preparo", () => {
    expect(orderStatusAfterPayment("PENDING_PAYMENT", "CANCELLED")).toBe("CANCELLED");
    expect(orderStatusAfterPayment("CONFIRMED", "REFUNDED")).toBe("CANCELLED");
  });

  it("recusa não muda o pedido (cliente pode tentar de novo)", () => {
    expect(orderStatusAfterPayment("PENDING_PAYMENT", "REJECTED")).toBe("PENDING_PAYMENT");
    expect(orderStatusAfterPayment("PENDING_PAYMENT", "PENDING")).toBe("PENDING_PAYMENT");
  });

  it("não ressuscita pedido cancelado", () => {
    expect(orderStatusAfterPayment("CANCELLED", "APPROVED")).toBe("CANCELLED");
  });
});

describe("mergePaymentStatus", () => {
  it("avança, mas nunca regride", () => {
    expect(mergePaymentStatus("PENDING", "APPROVED")).toBe("APPROVED");
    expect(mergePaymentStatus("APPROVED", "PENDING")).toBe("APPROVED");
    expect(mergePaymentStatus("APPROVED", "REJECTED")).toBe("APPROVED");
    expect(mergePaymentStatus("APPROVED", "REFUNDED")).toBe("REFUNDED");
    expect(mergePaymentStatus("REJECTED", "APPROVED")).toBe("APPROVED");
  });
});

describe("verifyMercadoPagoSignature", () => {
  const secret = "segredo-de-teste";
  const ts = "1760800000";
  const requestId = "req-123";
  const dataId = "ABC123";
  const v1 = signMercadoPagoManifest(secret, dataId, requestId, ts);
  const base = { secret, signatureHeader: `ts=${ts},v1=${v1}`, requestId, dataId };

  it("aceita assinatura válida (data.id é normalizado para minúsculas)", () => {
    expect(verifyMercadoPagoSignature(base)).toBe(true);
  });

  it("rejeita segredo errado, id alterado, ts alterado e request-id alterado", () => {
    expect(verifyMercadoPagoSignature({ ...base, secret: "outro" })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, dataId: "999" })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, signatureHeader: `ts=1,v1=${v1}` })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, requestId: "req-999" })).toBe(false);
  });

  it("rejeita cabeçalhos ausentes ou malformados", () => {
    expect(verifyMercadoPagoSignature({ ...base, signatureHeader: null })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, signatureHeader: "lixo" })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, signatureHeader: `ts=${ts},v1=curto` })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, dataId: null })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, secret: "" })).toBe(false);
  });
});
