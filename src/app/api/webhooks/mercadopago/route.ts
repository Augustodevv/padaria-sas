import { log } from "@/lib/logger";
import { NextResponse, type NextRequest } from "next/server";
import { fetchPayment } from "@/server/integrations/mercadopago";
import { recordPaymentEvent } from "@/server/repositories/orders";
import { mapMercadoPagoStatus, verifyMercadoPagoSignature } from "@/server/services/payment-status";

/**
 * Webhook do Mercado Pago.
 * 1) valida a assinatura HMAC; 2) busca o pagamento na API (não confia no corpo);
 * 3) confere o valor; 4) aplica de forma idempotente.
 * 2xx = processado/ignorado de propósito; 5xx = o Mercado Pago tenta de novo.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "";
  const url = new URL(req.url);

  let body: { type?: string; data?: { id?: string | number } } = {};
  try {
    body = await req.json();
  } catch {
    /* corpo vazio é aceito: o id também vem na query */
  }

  const dataId = url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null);
  const type = url.searchParams.get("type") ?? body.type;

  const valid = verifyMercadoPagoSignature({
    secret,
    signatureHeader: req.headers.get("x-signature"),
    requestId: req.headers.get("x-request-id"),
    dataId: url.searchParams.get("data.id") ?? dataId,
  });
  if (!valid) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  // Outros tipos de evento (merchant_order etc.) são reconhecidos e ignorados.
  if (type !== "payment" || !dataId) return NextResponse.json({ ok: true, ignored: true });

  try {
    const payment = await fetchPayment(dataId);
    if (!payment.external_reference) return NextResponse.json({ ok: true, ignored: "no reference" });

    const status = mapMercadoPagoStatus(payment.status);
    const result = await recordPaymentEvent({
      orderId: payment.external_reference,
      providerId: String(payment.id),
      eventKey: `${payment.id}:${payment.status}`,
      status,
      amountCents: Math.round(payment.transaction_amount * 100),
    });

    if (result === "AMOUNT_MISMATCH") {
      log.error("mp.webhook.amount_mismatch", { orderId: payment.external_reference, paymentId: payment.id });
    }
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    log.error("mp.webhook.failed", { err });
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
