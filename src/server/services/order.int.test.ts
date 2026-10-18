/**
 * Testes de integração: exigem Postgres com migrations e seed aplicados
 * (npm run db:local, db:migrate, db:seed) e rodam com `npm run test:int`.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { recordPaymentEvent } from "@/server/repositories/orders";
import { getStoreConfig } from "@/server/repositories/store";
import { createOrder } from "./order";
import { OrderError } from "./order-errors";
import { availableSlots } from "./schedule";
import type { CheckoutInput } from "@/validators/checkout";

const run = randomUUID().slice(0, 8);
const userIds: string[] = [];
const couponCodes: string[] = [];
let croissantId = "";
let unavailableId = "";
let slot: Date;

async function newUser(tag: string) {
  const u = await db.user.create({
    data: { name: `Teste ${tag}`, email: `int-${run}-${tag}@example.com`, passwordHash: "x" },
  });
  userIds.push(u.id);
  return u.id;
}

async function newCoupon(extra: Partial<{ maxUses: number; minOrderCents: number }> = {}) {
  const code = `T${run}${couponCodes.length}`.toUpperCase();
  couponCodes.push(code);
  await db.coupon.create({ data: { code, discountType: "PERCENT", discountValue: 10, ...extra } });
  return code;
}

const input = (over: Partial<CheckoutInput> = {}): CheckoutInput => ({
  items: [{ productId: croissantId, quantity: 2 }],
  fulfillment: "PICKUP",
  scheduledFor: slot,
  idempotencyKey: randomUUID(),
  ...over,
});

beforeAll(async () => {
  const croissant = await db.product.findUniqueOrThrow({ where: { slug: "croissant-de-manteiga" } });
  const folhado = await db.product.findUniqueOrThrow({ where: { slug: "folhado-de-espinafre" } });
  croissantId = croissant.id;
  unavailableId = folhado.id;
  slot = availableSlots(new Date(), (await getStoreConfig()).hours)[0];
});

afterAll(async () => {
  const orders = await db.order.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
  const ids = orders.map((o) => o.id);
  await db.couponRedemption.deleteMany({ where: { orderId: { in: ids } } });
  await db.payment.deleteMany({ where: { orderId: { in: ids } } });
  await db.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  await db.order.deleteMany({ where: { id: { in: ids } } });
  await db.address.deleteMany({ where: { userId: { in: userIds } } });
  await db.coupon.deleteMany({ where: { code: { in: couponCodes } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
});

describe("createOrder", () => {
  it("usa o preço do banco, guarda o snapshot e cria pagamento pendente", async () => {
    const userId = await newUser("preco");
    const order = await createOrder(userId, input());
    const full = await db.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true, payments: true },
    });
    expect(full.subtotalCents).toBe(2 * 1290);
    expect(full.totalCents).toBe(2580);
    expect(full.status).toBe("PENDING_PAYMENT");
    expect(full.items[0]).toMatchObject({ productName: "Croissant de Manteiga", unitPriceCents: 1290, quantity: 2 });
    expect(full.payments).toHaveLength(1);
    expect(full.payments[0]).toMatchObject({ status: "PENDING", amountCents: 2580 });
  });

  it("mudar o preço do produto depois não altera o pedido já criado", async () => {
    const userId = await newUser("snapshot");
    const order = await createOrder(userId, input({ items: [{ productId: croissantId, quantity: 1 }] }));
    await db.product.update({ where: { id: croissantId }, data: { priceCents: 9999 } });
    try {
      const again = await db.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
      expect(again.unitPriceCents).toBe(1290);
    } finally {
      await db.product.update({ where: { id: croissantId }, data: { priceCents: 1290 } });
    }
  });

  it("é idempotente: a mesma chave devolve o mesmo pedido", async () => {
    const userId = await newUser("idem");
    const i = input();
    const [a, b] = await Promise.all([createOrder(userId, i), createOrder(userId, i)]);
    const c = await createOrder(userId, i);
    expect(new Set([a.id, b.id, c.id]).size).toBe(1);
    expect(await db.order.count({ where: { idempotencyKey: i.idempotencyKey } })).toBe(1);
  });

  it("não deixa outro usuário reaproveitar a chave de idempotência", async () => {
    const a = await newUser("ka");
    const b = await newUser("kb");
    const i = input();
    await createOrder(a, i);
    await expect(createOrder(b, i)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("aplica cupom e entrega calculados no servidor", async () => {
    const userId = await newUser("cupom");
    const code = await newCoupon();
    const order = await createOrder(
      userId,
      input({
        fulfillment: "DELIVERY",
        couponCode: code.toLowerCase(),
        address: { zipCode: "01310-100", street: "Rua A", number: "1", neighborhood: "Centro", city: "São Paulo", state: "SP" },
      }),
    );
    // 2 × 12,90 = 25,80; 10% = 2,58 (floor 258); entrega Centro = 8,00
    expect(order).toMatchObject({ subtotalCents: 2580, discountCents: 258, deliveryFeeCents: 800, totalCents: 3122 });
    expect(await db.coupon.findUniqueOrThrow({ where: { code } })).toMatchObject({ usedCount: 1 });
  });

  it("cada cliente usa o cupom uma vez", async () => {
    const userId = await newUser("uma-vez");
    const code = await newCoupon();
    await createOrder(userId, input({ couponCode: code }));
    await expect(createOrder(userId, input({ couponCode: code }))).rejects.toBeInstanceOf(OrderError);
  });

  it("respeita o limite de usos mesmo com pedidos simultâneos", async () => {
    const code = await newCoupon({ maxUses: 1 });
    const users = await Promise.all(["c1", "c2", "c3", "c4"].map(newUser));
    const results = await Promise.allSettled(users.map((u) => createOrder(u, input({ couponCode: code }))));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await db.coupon.findUniqueOrThrow({ where: { code } })).usedCount).toBe(1);
  });

  it("rejeita produto indisponível, bairro fora da área e horário inválido", async () => {
    const userId = await newUser("rejeita");
    await expect(
      createOrder(userId, input({ items: [{ productId: unavailableId, quantity: 1 }] })),
    ).rejects.toMatchObject({ code: "PRODUCT_UNAVAILABLE" });

    await expect(
      createOrder(
        userId,
        input({
          fulfillment: "DELIVERY",
          address: { zipCode: "01310-100", street: "Rua A", number: "1", neighborhood: "Moema", city: "São Paulo", state: "SP" },
        }),
      ),
    ).rejects.toMatchObject({ code: "OUT_OF_ZONE" });

    await expect(createOrder(userId, input({ scheduledFor: new Date(Date.now() + 60_000) }))).rejects.toMatchObject({
      code: "INVALID_SLOT",
    });
  });

  it("cupom abaixo do pedido mínimo é recusado", async () => {
    const userId = await newUser("minimo");
    const code = await newCoupon({ minOrderCents: 999_999 });
    await expect(createOrder(userId, input({ couponCode: code }))).rejects.toMatchObject({ code: "COUPON_INVALID" });
  });
});

describe("recordPaymentEvent", () => {
  async function pendingOrder(tag: string) {
    const userId = await newUser(tag);
    return createOrder(userId, input());
  }

  it("aprovação confirma o pedido e repetir o evento não faz nada", async () => {
    const order = await pendingOrder("pay1");
    const ev = { orderId: order.id, providerId: "999", eventKey: "999:approved", status: "APPROVED" as const, amountCents: order.totalCents };

    expect(await recordPaymentEvent(ev)).toBe("APPLIED");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CONFIRMED");
    expect(await recordPaymentEvent(ev)).toBe("DUPLICATE");
  });

  it("eventos simultâneos iguais aplicam uma única vez", async () => {
    const order = await pendingOrder("pay2");
    const ev = { orderId: order.id, providerId: "888", eventKey: "888:approved", status: "APPROVED" as const, amountCents: order.totalCents };
    const results = await Promise.all([recordPaymentEvent(ev), recordPaymentEvent(ev), recordPaymentEvent(ev)]);
    expect(results.filter((r) => r === "APPLIED")).toHaveLength(1);
    expect(results.filter((r) => r === "DUPLICATE")).toHaveLength(2);
  });

  it("valor divergente é ignorado e o pedido continua pendente", async () => {
    const order = await pendingOrder("pay3");
    const r = await recordPaymentEvent({ orderId: order.id, providerId: "777", eventKey: "777:approved", status: "APPROVED", amountCents: 1 });
    expect(r).toBe("AMOUNT_MISMATCH");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PENDING_PAYMENT");
  });

  it("evento atrasado (pending) depois da aprovação não regride o pagamento", async () => {
    const order = await pendingOrder("pay4");
    const base = { orderId: order.id, providerId: "666", amountCents: order.totalCents };
    await recordPaymentEvent({ ...base, eventKey: "666:approved", status: "APPROVED" });
    await recordPaymentEvent({ ...base, eventKey: "666:in_process", status: "PENDING" });
    const full = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
    expect(full.status).toBe("CONFIRMED");
    expect(full.payments[0].status).toBe("APPROVED");
  });

  it("estorno antes do preparo cancela o pedido", async () => {
    const order = await pendingOrder("pay5");
    const base = { orderId: order.id, providerId: "555", amountCents: order.totalCents };
    await recordPaymentEvent({ ...base, eventKey: "555:approved", status: "APPROVED" });
    await recordPaymentEvent({ ...base, eventKey: "555:refunded", status: "REFUNDED" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CANCELLED");
  });

  it("pedido inexistente é reconhecido sem erro", async () => {
    expect(await recordPaymentEvent({ orderId: "nao-existe", providerId: "1", eventKey: "1:approved", status: "APPROVED", amountCents: 100 })).toBe("ORDER_NOT_FOUND");
  });
});
