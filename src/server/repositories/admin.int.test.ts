/**
 * Integração do painel: exige Postgres com migrations + seed (npm run test:int).
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { createOrder } from "@/server/services/order";
import { availableSlots } from "@/server/services/schedule";
import { getStoreConfig } from "@/server/repositories/store";
import { recordPaymentEvent } from "@/server/repositories/orders";
import type { CheckoutInput } from "@/validators/checkout";
import { changeOrderStatus, getDashboard, getOrderAudit, saveProduct, setProductArchived } from "./admin";

const run = randomUUID().slice(0, 8);
const userIds: string[] = [];
const couponCodes: string[] = [];
const productIds: string[] = [];
let actorId = "";
let croissantId = "";
let categoryId = "";
let slot: Date;

async function newUser(tag: string) {
  const u = await db.user.create({ data: { name: `Adm ${tag}`, email: `adm-${run}-${tag}@example.com`, passwordHash: "x" } });
  userIds.push(u.id);
  return u.id;
}

async function confirmedOrder(userId: string, couponCode?: string) {
  const input: CheckoutInput = {
    items: [{ productId: croissantId, quantity: 2 }],
    fulfillment: "PICKUP",
    scheduledFor: slot,
    idempotencyKey: randomUUID(),
    couponCode,
  };
  const order = await createOrder(userId, input);
  await recordPaymentEvent({
    orderId: order.id,
    providerId: `p-${order.id}`,
    eventKey: `p-${order.id}:approved`,
    status: "APPROVED",
    amountCents: order.totalCents,
  });
  return order;
}

beforeAll(async () => {
  croissantId = (await db.product.findUniqueOrThrow({ where: { slug: "croissant-de-manteiga" } })).id;
  categoryId = (await db.category.findFirstOrThrow()).id;
  slot = availableSlots(new Date(), (await getStoreConfig()).hours)[0];
  actorId = await newUser("staff");
});

afterAll(async () => {
  const orders = await db.order.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
  const ids = orders.map((o) => o.id);
  await db.auditLog.deleteMany({ where: { OR: [{ entityId: { in: [...ids, ...productIds] } }, { userId: { in: userIds } }] } });
  await db.couponRedemption.deleteMany({ where: { orderId: { in: ids } } });
  await db.payment.deleteMany({ where: { orderId: { in: ids } } });
  await db.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  await db.order.deleteMany({ where: { id: { in: ids } } });
  await db.coupon.deleteMany({ where: { code: { in: couponCodes } } });
  await db.productImage.deleteMany({ where: { productId: { in: productIds } } });
  await db.product.deleteMany({ where: { id: { in: productIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
});

describe("changeOrderStatus", () => {
  it("percorre o fluxo completo e registra auditoria de cada passo", async () => {
    const order = await confirmedOrder(await newUser("fluxo"));
    for (const to of ["PREPARING", "READY", "DELIVERED"] as const) {
      expect(await changeOrderStatus(order.id, to, actorId)).toMatchObject({ ok: true });
    }
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("DELIVERED");
    const audit = await getOrderAudit(order.id);
    expect(audit).toHaveLength(3);
    expect(audit.every((a) => a.user?.name === "Adm staff")).toBe(true);
  });

  it("rejeita pular etapa e mudar pedido finalizado, sem alterar nada", async () => {
    const order = await confirmedOrder(await newUser("invalida"));
    expect(await changeOrderStatus(order.id, "DELIVERED", actorId)).toEqual({ ok: false, reason: "INVALID_TRANSITION" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CONFIRMED");
    await changeOrderStatus(order.id, "CANCELLED", actorId);
    expect(await changeOrderStatus(order.id, "PREPARING", actorId)).toEqual({ ok: false, reason: "INVALID_TRANSITION" });
    expect(await changeOrderStatus("nao-existe", "PREPARING", actorId)).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("duas mudanças simultâneas iguais: só uma vale", async () => {
    const order = await confirmedOrder(await newUser("corrida"));
    const results = await Promise.all([
      changeOrderStatus(order.id, "PREPARING", actorId),
      changeOrderStatus(order.id, "PREPARING", actorId),
      changeOrderStatus(order.id, "PREPARING", actorId),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await getOrderAudit(order.id)).toHaveLength(1);
  });

  it("cancelar devolve o cupom e permite usá-lo de novo", async () => {
    const code = `A${run}`.toUpperCase();
    couponCodes.push(code);
    await db.coupon.create({ data: { code, discountType: "PERCENT", discountValue: 10, maxUses: 1 } });
    const userId = await newUser("cupom");

    const order = await confirmedOrder(userId, code);
    expect((await db.coupon.findUniqueOrThrow({ where: { code } })).usedCount).toBe(1);

    await changeOrderStatus(order.id, "CANCELLED", actorId);
    expect((await db.coupon.findUniqueOrThrow({ where: { code } })).usedCount).toBe(0);
    expect(await db.couponRedemption.count({ where: { orderId: order.id } })).toBe(0);

    // o limite de 1 uso foi liberado
    await expect(confirmedOrder(userId, code)).resolves.toBeDefined();
    const [log] = await getOrderAudit(order.id);
    expect(log.metadata).toMatchObject({ couponReleased: true, refundPending: true });
  });

  it("confirmação manual de pedido sem pagamento fica marcada na auditoria", async () => {
    const userId = await newUser("manual");
    const order = await createOrder(userId, {
      items: [{ productId: croissantId, quantity: 1 }],
      fulfillment: "PICKUP",
      scheduledFor: slot,
      idempotencyKey: randomUUID(),
    });
    expect(await changeOrderStatus(order.id, "CONFIRMED", actorId)).toMatchObject({ ok: true });
    const [log] = await getOrderAudit(order.id);
    expect(log.metadata).toMatchObject({ manualConfirmation: true });
  });
});

describe("getDashboard", () => {
  it("conta só pedidos confirmados em diante no faturamento", async () => {
    const before = await getDashboard(7);
    const userId = await newUser("dash");
    const paid = await confirmedOrder(userId);
    // pedido pendente e pedido cancelado não entram
    await createOrder(userId, { items: [{ productId: croissantId, quantity: 5 }], fulfillment: "PICKUP", scheduledFor: slot, idempotencyKey: randomUUID() });
    const cancelled = await confirmedOrder(userId);
    await changeOrderStatus(cancelled.id, "CANCELLED", actorId);

    const after = await getDashboard(7);
    expect(after.revenueCents - before.revenueCents).toBe(paid.totalCents);
    expect(after.orders - before.orders).toBe(1);
    expect(after.pendingPayment).toBeGreaterThan(before.pendingPayment);
    expect(after.series).toHaveLength(7);
    expect(after.series.reduce((s, d) => s + d.cents, 0)).toBe(after.revenueCents);
  });
});

describe("saveProduct", () => {
  const base = { categoryId: "", description: "Descrição do produto de teste.", price: 1500, ingredients: ["a"], allergens: [], images: [], isAvailable: true, isFeatured: false };

  it("gera slug único e atualiza imagens e preço com auditoria", async () => {
    const name = `Produto Teste ${run}`;
    const a = (await saveProduct({ ...base, categoryId, name }, actorId))!;
    const b = (await saveProduct({ ...base, categoryId, name }, actorId))!;
    productIds.push(a, b);
    const [pa, pb] = await Promise.all([a, b].map((id) => db.product.findUniqueOrThrow({ where: { id } })));
    expect(pa.slug).not.toBe(pb.slug);
    expect(pb.slug).toMatch(/-2$/);

    await saveProduct({ ...base, categoryId, name, id: a, price: 2000, images: ["https://example.com/1.jpg", "https://example.com/2.jpg"] }, actorId);
    const updated = await db.product.findUniqueOrThrow({ where: { id: a }, include: { images: { orderBy: { sortOrder: "asc" } } } });
    expect(updated.priceCents).toBe(2000);
    expect(updated.images.map((i) => i.url)).toEqual(["https://example.com/1.jpg", "https://example.com/2.jpg"]);
    expect(updated.slug).toBe(pa.slug); // slug estável na edição

    const log = await db.auditLog.findFirstOrThrow({ where: { entityId: a, action: "product.update" } });
    expect(log.metadata).toMatchObject({ priceFrom: 1500, priceTo: 2000 });
  });

  it("arquivar tira o produto da loja sem apagar histórico", async () => {
    const id = (await saveProduct({ ...base, categoryId, name: `Arquivável ${run}` }, actorId))!;
    productIds.push(id);
    await setProductArchived(id, true, actorId);
    expect((await db.product.findUniqueOrThrow({ where: { id } })).archivedAt).not.toBeNull();
    await setProductArchived(id, false, actorId);
    expect((await db.product.findUniqueOrThrow({ where: { id } })).archivedAt).toBeNull();
  });
});
