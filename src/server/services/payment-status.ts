import { createHmac, timingSafeEqual } from "node:crypto";

export type PaymentStatus = "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED" | "CANCELLED";
export type OrderStatus = "PENDING_PAYMENT" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";

/** Mapeia o status do Mercado Pago para o status interno. Desconhecido → PENDING. */
export function mapMercadoPagoStatus(status: string): PaymentStatus {
  switch (status) {
    case "approved":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    case "cancelled":
    case "expired":
      return "CANCELLED";
    case "refunded":
    case "charged_back":
      return "REFUNDED";
    default:
      return "PENDING"; // pending, in_process, authorized, in_mediation...
  }
}

/**
 * Efeito de um pagamento no pedido. Nunca "volta" um pedido já em preparo,
 * pronto ou entregue por causa de um evento atrasado/duplicado.
 */
export function orderStatusAfterPayment(current: OrderStatus, payment: PaymentStatus): OrderStatus {
  if (payment === "APPROVED" && current === "PENDING_PAYMENT") return "CONFIRMED";
  if ((payment === "CANCELLED" || payment === "REFUNDED") && (current === "PENDING_PAYMENT" || current === "CONFIRMED")) {
    return "CANCELLED";
  }
  return current;
}

const PAYMENT_RANK: Record<PaymentStatus, number> = {
  PENDING: 0,
  REJECTED: 1,
  CANCELLED: 2,
  APPROVED: 3,
  REFUNDED: 4,
};

/** Evento atrasado/repetido nunca faz um pagamento "andar para trás" (ex.: APPROVED → PENDING). */
export function mergePaymentStatus(current: PaymentStatus, incoming: PaymentStatus): PaymentStatus {
  return PAYMENT_RANK[incoming] >= PAYMENT_RANK[current] ? incoming : current;
}

export interface SignatureInput {
  secret: string;
  /** Header `x-signature`: "ts=...,v1=..." */
  signatureHeader: string | null;
  /** Header `x-request-id` */
  requestId: string | null;
  /** `data.id` da query string */
  dataId: string | null;
}

/** Valida a assinatura HMAC-SHA256 dos webhooks do Mercado Pago. */
export function verifyMercadoPagoSignature({ secret, signatureHeader, requestId, dataId }: SignatureInput): boolean {
  if (!secret || !signatureHeader || !dataId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false;

  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${id};${requestId ? `request-id:${requestId};` : ""}ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest();
  const received = Buffer.from(v1, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Usado em testes e no modo de simulação local. */
export function signMercadoPagoManifest(secret: string, dataId: string, requestId: string, ts: string): string {
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  return createHmac("sha256", secret).update(`id:${id};request-id:${requestId};ts:${ts};`).digest("hex");
}
