import { Prisma, type FulfillmentType } from "@prisma/client";
import { db } from "@/server/db";
import { OrderError } from "@/server/services/order-errors";
import {
  mergePaymentStatus,
  orderStatusAfterPayment,
  type PaymentStatus,
} from "@/server/services/payment-status";
import type { PricedLine, Totals } from "@/server/services/pricing";

const orderInclude = {
  items: true,
  payments: { orderBy: { createdAt: "desc" } },
  address: true,
  coupon: { select: { code: true } },
} satisfies Prisma.OrderInclude;

export type OrderWithDetails = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export const findOrderByIdempotencyKey = (key: string) =>
  db.order.findUnique({ where: { idempotencyKey: key }, include: orderInclude });

export const getOrderById = (id: string) => db.order.findUnique({ where: { id }, include: orderInclude });

export const listOrdersByUser = (userId: string, take = 20) =>
  db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, number: true, status: true, totalCents: true, createdAt: true, fulfillment: true },
  });

export interface CreateOrderData {
  userId: string;
  idempotencyKey: string;
  fulfillment: FulfillmentType;
  scheduledFor: Date;
  notes?: string;
  lines: PricedLine[];
  totals: Totals;
  coupon: { id: string } | null;
  address: {
    zipCode: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  } | null;
}

/** Cria pedido + itens (snapshot de preço) + pagamento pendente + uso do cupom, tudo numa transação. */
export function createOrderTx(data: CreateOrderData) {
  return db.$transaction(async (tx) => {
    if (data.coupon) {
      // Uma utilização por cliente e respeito ao limite de usos, de forma atômica.
      const already = await tx.couponRedemption.count({
        where: { couponId: data.coupon.id, userId: data.userId },
      });
      if (already > 0) throw new OrderError("COUPON_INVALID", "Você já usou este cupom.");

      const updated = await tx.$executeRaw`
        UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
        WHERE "id" = ${data.coupon.id} AND "isActive" = true
          AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
      if (updated === 0) throw new OrderError("COUPON_INVALID", "Este cupom atingiu o limite de usos.");
    }

    const address = data.address
      ? await tx.address.create({ data: { userId: data.userId, ...data.address } })
      : null;

    const order = await tx.order.create({
      data: {
        userId: data.userId,
        idempotencyKey: data.idempotencyKey,
        fulfillment: data.fulfillment,
        scheduledFor: data.scheduledFor,
        notes: data.notes,
        addressId: address?.id,
        couponId: data.coupon?.id,
        subtotalCents: data.totals.subtotalCents,
        discountCents: data.totals.discountCents,
        deliveryFeeCents: data.totals.deliveryFeeCents,
        totalCents: data.totals.totalCents,
        items: {
          create: data.lines.map((l) => ({
            productId: l.productId,
            productName: l.productName,
            unitPriceCents: l.unitPriceCents,
            quantity: l.quantity,
          })),
        },
        payments: { create: { amountCents: data.totals.totalCents, status: "PENDING" } },
      },
    });

    if (data.coupon) {
      await tx.couponRedemption.create({
        data: { couponId: data.coupon.id, userId: data.userId, orderId: order.id },
      });
    }
    return order;
  });
}

export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export type PaymentEventResult = "APPLIED" | "DUPLICATE" | "ORDER_NOT_FOUND" | "AMOUNT_MISMATCH";

/**
 * Aplica um evento de pagamento de forma idempotente.
 * `eventKey` identifica o evento (ex.: "<paymentId>:<status>"); repetir o mesmo evento não faz nada.
 */
export async function recordPaymentEvent(input: {
  orderId: string;
  providerId: string;
  eventKey: string;
  status: PaymentStatus;
  amountCents: number;
}): Promise<PaymentEventResult> {
  try {
    return await db.$transaction(async (tx) => {
      // Trava a linha do pedido: eventos simultâneos do mesmo pedido são processados em fila,
      // então o segundo enxerga o resultado do primeiro (e vira DUPLICATE).
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${input.orderId} FOR UPDATE`;

      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: { payments: { orderBy: { createdAt: "asc" }, take: 1 } },
      });
      const payment = order?.payments[0];
      if (!order || !payment) return "ORDER_NOT_FOUND";

      // O valor pago precisa bater com o total oficial do pedido.
      if (input.amountCents !== order.totalCents) return "AMOUNT_MISMATCH";
      if (payment.providerEventId === input.eventKey) return "DUPLICATE";

      const merged = mergePaymentStatus(payment.status, input.status);
      await tx.payment.update({
        where: { id: payment.id },
        data: { providerId: input.providerId, providerEventId: input.eventKey, status: merged },
      });

      const next = orderStatusAfterPayment(order.status, merged);
      if (next !== order.status) await tx.order.update({ where: { id: order.id }, data: { status: next } });
      return "APPLIED";
    });
  } catch (err) {
    if (isUniqueViolation(err)) return "DUPLICATE"; // mesmo evento processado em paralelo
    throw err;
  }
}
