import "server-only";
import type { CheckoutInput, PreviewInput } from "@/validators/checkout";
import {
  createOrderTx,
  findOrderByIdempotencyKey,
  isUniqueViolation,
} from "@/server/repositories/orders";
import {
  countUserRedemptions,
  findCouponByCode,
  findProductsByIds,
  getStoreConfig,
} from "@/server/repositories/store";
import { evaluateCoupon, normalizeCouponCode } from "./coupon";
import { deliveryFeeFor } from "./delivery";
import { OrderError } from "./order-errors";
import { computeTotals, priceLines, type PricedLine, type Totals } from "./pricing";
import { isValidSlot } from "./schedule";

export interface Quote {
  lines: PricedLine[];
  totals: Totals;
  coupon: { id: string } | null;
  /** Mensagem amigável quando o cupom informado não pôde ser aplicado. */
  couponMessage?: string;
  /** Mensagem quando a entrega não é possível (bairro fora da área). */
  deliveryMessage?: string;
}

/**
 * Calcula preço, desconto e frete SEMPRE a partir do banco.
 * Com `strict`, problemas de cupom/entrega viram erro; sem ele (prévia), viram mensagens.
 */
export async function quoteOrder(
  userId: string,
  input: Pick<PreviewInput, "items" | "fulfillment" | "neighborhood" | "couponCode">,
  strict: boolean,
): Promise<Quote> {
  const [products, config] = await Promise.all([
    findProductsByIds([...new Set(input.items.map((i) => i.productId))]),
    getStoreConfig(),
  ]);
  const lines = priceLines(input.items, products);
  const subtotal = lines.reduce((s, l) => s + l.lineTotalCents, 0);

  let deliveryFeeCents = 0;
  let deliveryMessage: string | undefined;
  if (input.fulfillment === "DELIVERY") {
    const fee = input.neighborhood ? deliveryFeeFor(input.neighborhood, config.zones) : null;
    if (fee === null) {
      deliveryMessage = input.neighborhood
        ? "Ainda não entregamos nesse bairro. Escolha retirada na loja."
        : "Informe o bairro para calcular a entrega.";
      if (strict) throw new OrderError("OUT_OF_ZONE", deliveryMessage);
    } else {
      deliveryFeeCents = fee;
    }
  }

  let discountCents = 0;
  let coupon: Quote["coupon"] = null;
  let couponMessage: string | undefined;
  const code = input.couponCode ? normalizeCouponCode(input.couponCode) : "";
  if (code) {
    const record = await findCouponByCode(code);
    if (!record) {
      couponMessage = "Cupom não encontrado.";
    } else {
      const result = evaluateCoupon(record, {
        subtotalCents: subtotal,
        userAlreadyRedeemed: (await countUserRedemptions(record.id, userId)) > 0,
      });
      if (result.ok) {
        discountCents = result.discountCents;
        coupon = { id: record.id };
      } else {
        couponMessage = result.message;
      }
    }
    if (couponMessage && strict) throw new OrderError("COUPON_INVALID", couponMessage);
  }

  return {
    lines,
    totals: computeTotals({ lines, discountCents, deliveryFeeCents }),
    coupon,
    couponMessage,
    deliveryMessage,
  };
}

export async function createOrder(userId: string, input: CheckoutInput, now = new Date()) {
  // Reenvio do mesmo checkout (duplo clique, retry) devolve o pedido já criado.
  const existing = await findOrderByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    if (existing.userId !== userId) throw new OrderError("IDEMPOTENCY_CONFLICT", "Requisição inválida.");
    return existing;
  }

  const config = await getStoreConfig();
  if (!isValidSlot(input.scheduledFor, now, config.hours)) {
    throw new OrderError("INVALID_SLOT", "Esse horário não está mais disponível. Escolha outro.");
  }

  const quote = await quoteOrder(
    userId,
    {
      items: input.items,
      fulfillment: input.fulfillment,
      neighborhood: input.address?.neighborhood,
      couponCode: input.couponCode,
    },
    true,
  );

  try {
    return await createOrderTx({
      userId,
      idempotencyKey: input.idempotencyKey,
      fulfillment: input.fulfillment,
      scheduledFor: input.scheduledFor,
      notes: input.notes || undefined,
      lines: quote.lines,
      totals: quote.totals,
      coupon: quote.coupon,
      address: input.fulfillment === "DELIVERY" && input.address ? input.address : null,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      // corrida entre duas requisições com a mesma chave
      const again = await findOrderByIdempotencyKey(input.idempotencyKey);
      if (again && again.userId === userId) return again;
    }
    throw err;
  }
}
