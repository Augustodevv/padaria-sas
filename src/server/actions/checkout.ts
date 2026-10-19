"use server";

import { log } from "@/lib/logger";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { canViewOrder } from "@/server/auth/policies";
import { rateLimit } from "@/server/auth/rate-limit";
import { createPreference, paymentMode } from "@/server/integrations/mercadopago";
import { getOrderById, recordPaymentEvent } from "@/server/repositories/orders";
import { createOrder, quoteOrder } from "@/server/services/order";
import { OrderError } from "@/server/services/order-errors";
import { PricingError } from "@/server/services/pricing";
import { checkoutSchema, previewSchema } from "@/validators/checkout";

export interface PreviewResult {
  ok: boolean;
  error?: string;
  subtotalCents?: number;
  discountCents?: number;
  deliveryFeeCents?: number;
  totalCents?: number;
  couponMessage?: string;
  deliveryMessage?: string;
}

export interface PlaceOrderResult {
  /** Destino após criar o pedido: página do pedido (interno) ou URL do Mercado Pago (externo). */
  redirectTo?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

function friendly(err: unknown): string {
  if (err instanceof OrderError || err instanceof PricingError) return err.message;
  log.error("checkout.failed", { err });
  return "Não foi possível concluir agora. Tente novamente em instantes.";
}

/** Prévia de totais: tudo recalculado no servidor a partir do banco. */
export async function previewCheckoutAction(input: unknown): Promise<PreviewResult> {
  const user = await requireUser("/checkout");
  if (!rateLimit(`preview:${user.id}`, 60, 60_000).ok) return { ok: false, error: "Muitas consultas. Aguarde um instante." };

  const parsed = previewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados do carrinho inválidos." };

  try {
    const q = await quoteOrder(user.id, parsed.data, false);
    return {
      ok: true,
      ...q.totals,
      couponMessage: q.couponMessage,
      deliveryMessage: q.deliveryMessage,
    };
  } catch (err) {
    return { ok: false, error: friendly(err) };
  }
}

/** Inicia o pagamento do pedido e devolve a URL para onde o cliente deve ir. */
async function paymentUrlFor(order: { id: string; number: number; totalCents: number }, email: string) {
  if (paymentMode() === "mock") return `/pedido/${order.id}`;
  const pref = await createPreference({
    orderId: order.id,
    orderNumber: order.number,
    totalCents: order.totalCents,
    payerEmail: email,
  });
  return pref.url;
}

export async function placeOrderAction(input: unknown): Promise<PlaceOrderResult> {
  const user = await requireUser("/checkout");
  if (!rateLimit(`order:${user.id}`, 10, 60 * 60_000).ok) {
    return { error: "Muitos pedidos em pouco tempo. Tente novamente mais tarde." };
  }

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return { error: flat.formErrors[0] ?? "Confira os campos do formulário.", fieldErrors: flat.fieldErrors };
  }

  let order: Awaited<ReturnType<typeof createOrder>>;
  try {
    order = await createOrder(user.id, parsed.data);
  } catch (err) {
    return { error: friendly(err) };
  }

  // O pedido já existe. Se iniciar o pagamento falhar, o cliente tenta de novo pela página do pedido.
  const orderPage = `/pedido/${order.id}`;
  if (order.status !== "PENDING_PAYMENT") return { redirectTo: orderPage };
  try {
    return { redirectTo: await paymentUrlFor(order, user.email) };
  } catch (err) {
    log.error("checkout.payment_start.failed", { err });
    return { redirectTo: `${orderPage}?erro=pagamento` };
  }
}

/** "Pagar agora" na página do pedido (também usado para tentar de novo após recusa). */
export async function payOrderAction(orderId: string) {
  const user = await requireUser(`/pedido/${orderId}`);
  const order = await getOrderById(orderId);
  if (!order || !canViewOrder(user, order) || order.userId !== user.id) redirect("/conta");
  if (order.status !== "PENDING_PAYMENT") redirect(`/pedido/${order.id}`);

  let url: string;
  try {
    url = await paymentUrlFor(order, user.email);
  } catch (err) {
    log.error("checkout.payment_start.failed", { err });
    redirect(`/pedido/${order.id}?erro=pagamento`);
  }
  redirect(url);
}

/** Apenas desenvolvimento, sem token do Mercado Pago: simula a aprovação do pagamento. */
export async function simulatePaymentAction(orderId: string) {
  if (process.env.NODE_ENV === "production" || paymentMode() !== "mock") redirect("/");
  const user = await requireUser(`/pedido/${orderId}`);
  const order = await getOrderById(orderId);
  if (!order || order.userId !== user.id) redirect("/conta");

  await recordPaymentEvent({
    orderId: order.id,
    providerId: `mock-${order.id}`,
    eventKey: `mock-${order.id}:approved`,
    status: "APPROVED",
    amountCents: order.totalCents,
  });
  redirect(`/pedido/${order.id}`);
}
