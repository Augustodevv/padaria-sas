import "server-only";

const API = "https://api.mercadopago.com";

/**
 * "mercadopago": usa a API real (credenciais de TESTE geram o ambiente sandbox).
 * "mock": só em desenvolvimento, sem token; permite exercitar o fluxo sem rede.
 * Em produção, a ausência do token é erro — nunca cai no modo simulado.
 */
export type PaymentMode = "mercadopago" | "mock";

export function paymentMode(): PaymentMode {
  if (process.env.MERCADOPAGO_ACCESS_TOKEN) return "mercadopago";
  if (process.env.NODE_ENV === "production") throw new Error("MERCADOPAGO_ACCESS_TOKEN ausente em produção.");
  return "mock";
}

function token() {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  return t;
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export interface PreferenceInput {
  orderId: string;
  orderNumber: number;
  totalCents: number;
  payerEmail: string;
}

/** Cria a preferência do Checkout Pro e devolve a URL de pagamento. */
export async function createPreference(input: PreferenceInput): Promise<{ id: string; url: string }> {
  const base = siteUrl();
  const https = base.startsWith("https://");
  const back = `${base}/pedido/${input.orderId}`;

  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `${input.orderId}:${input.totalCents}`,
    },
    body: JSON.stringify({
      // O valor é o total oficial calculado no servidor (já com desconto e frete).
      items: [
        {
          id: input.orderId,
          title: `Pedido #${input.orderNumber} — Maison du Pain`,
          quantity: 1,
          unit_price: input.totalCents / 100,
          currency_id: "BRL",
        },
      ],
      external_reference: input.orderId,
      payer: { email: input.payerEmail },
      back_urls: { success: back, failure: back, pending: back },
      // O Mercado Pago só aceita URLs públicas em https para retorno automático e notificações.
      ...(https && { auto_return: "approved", notification_url: `${base}/api/webhooks/mercadopago` }),
      statement_descriptor: "MAISONDUPAIN",
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`Mercado Pago respondeu ${res.status} ao criar a preferência.`);
  const data = (await res.json()) as { id: string; init_point: string; sandbox_init_point?: string };
  const sandbox = token().startsWith("TEST-");
  return { id: data.id, url: sandbox && data.sandbox_init_point ? data.sandbox_init_point : data.init_point };
}

export interface MercadoPagoPayment {
  id: number | string;
  status: string;
  external_reference: string | null;
  transaction_amount: number;
}

/** Fonte da verdade: o corpo do webhook nunca é confiado, o pagamento é buscado na API. */
export async function fetchPayment(paymentId: string): Promise<MercadoPagoPayment> {
  const res = await fetch(`${API}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token()}` },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Mercado Pago respondeu ${res.status} ao buscar o pagamento.`);
  return (await res.json()) as MercadoPagoPayment;
}
