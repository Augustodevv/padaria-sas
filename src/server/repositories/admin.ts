import { Prisma, type OrderStatus } from "@prisma/client";
import { db } from "@/server/db";
import { slugify } from "@/lib/slug";
import { canTransition, REVENUE_STATUSES } from "@/server/services/order-transitions";
import { fillDailySeries, spDay, type DayRow } from "@/server/services/reports";

const REVENUE = REVENUE_STATUSES as string[];
const DAY_MS = 86_400_000;

/** Início (UTC) do primeiro dia do período, contando em dias de São Paulo. */
export function periodStart(days: number, now: Date): Date {
  return new Date(Date.parse(`${spDay(now)}T00:00:00Z`) + 3 * 3_600_000 - (days - 1) * DAY_MS);
}

// ───────────────────────────── Dashboard ─────────────────────────────

export async function getDashboard(days: number, now = new Date()) {
  const start = periodStart(days, now);
  const prevStart = new Date(start.getTime() - days * DAY_MS);
  const inRevenue = { in: REVENUE_STATUSES as OrderStatus[] };

  const [cur, prev, daily, top, recent, pendingPayment, toPrepare] = await Promise.all([
    db.order.aggregate({ where: { status: inRevenue, createdAt: { gte: start } }, _sum: { totalCents: true }, _count: true }),
    db.order.aggregate({ where: { status: inRevenue, createdAt: { gte: prevStart, lt: start } }, _sum: { totalCents: true }, _count: true }),
    db.$queryRaw<{ day: string; cents: bigint; orders: bigint }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS day,
             SUM("totalCents")::bigint AS cents, COUNT(*)::bigint AS orders
      FROM "Order" WHERE status::text = ANY(${REVENUE}) AND "createdAt" >= ${start}
      GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ name: string; units: bigint; cents: bigint }[]>`
      SELECT oi."productName" AS name, SUM(oi.quantity)::bigint AS units,
             SUM(oi.quantity * oi."unitPriceCents")::bigint AS cents
      FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
      WHERE o.status::text = ANY(${REVENUE}) AND o."createdAt" >= ${start}
      GROUP BY oi."productId", oi."productName" ORDER BY units DESC, cents DESC LIMIT 6`,
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, number: true, status: true, totalCents: true, createdAt: true, user: { select: { name: true } } },
    }),
    db.order.count({ where: { status: "PENDING_PAYMENT" } }),
    db.order.count({ where: { status: { in: ["CONFIRMED", "PREPARING"] } } }),
  ]);

  const series: DayRow[] = fillDailySeries(
    daily.map((r) => ({ day: r.day, cents: Number(r.cents), orders: Number(r.orders) })),
    days,
    now,
  );

  return {
    revenueCents: cur._sum.totalCents ?? 0,
    orders: cur._count,
    prevRevenueCents: prev._sum.totalCents ?? 0,
    prevOrders: prev._count,
    series,
    top: top.map((t) => ({ name: t.name, units: Number(t.units), cents: Number(t.cents) })),
    recent,
    pendingPayment,
    toPrepare,
  };
}

// ───────────────────────────── Pedidos ─────────────────────────────

export const ORDERS_PAGE_SIZE = 20;

export async function listOrders(filter: { status?: OrderStatus; number?: number; page: number }) {
  const where: Prisma.OrderWhereInput = {
    ...(filter.status && { status: filter.status }),
    ...(filter.number && { number: filter.number }),
  };
  const [rows, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: ORDERS_PAGE_SIZE,
      skip: (filter.page - 1) * ORDERS_PAGE_SIZE,
      select: {
        id: true, number: true, status: true, totalCents: true, createdAt: true, fulfillment: true, scheduledFor: true,
        user: { select: { name: true } },
      },
    }),
    db.order.count({ where }),
  ]);
  return { rows, total, pages: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)) };
}

export const getAdminOrder = (id: string) =>
  db.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      address: true,
      coupon: { select: { code: true } },
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

export const getOrderAudit = (orderId: string) =>
  db.auditLog.findMany({
    where: { entity: "Order", entityId: orderId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, action: true, metadata: true, createdAt: true, user: { select: { name: true } } },
  });

export function writeAudit(
  tx: Prisma.TransactionClient | typeof db,
  e: { userId: string; action: string; entity: string; entityId?: string; metadata?: Prisma.InputJsonValue },
) {
  return tx.auditLog.create({ data: e });
}

export type ChangeStatusResult = { ok: true; from: OrderStatus } | { ok: false; reason: "NOT_FOUND" | "INVALID_TRANSITION" };

/** Muda o status validando a transição com a linha travada; cancelar devolve o cupom. */
export function changeOrderStatus(orderId: string, to: OrderStatus, actorId: string): Promise<ChangeStatusResult> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { payments: { select: { status: true }, take: 1, orderBy: { createdAt: "asc" } } },
    });
    if (!order) return { ok: false, reason: "NOT_FOUND" } as const;
    if (!canTransition(order.status, to)) return { ok: false, reason: "INVALID_TRANSITION" } as const;

    await tx.order.update({ where: { id: orderId }, data: { status: to } });

    let couponReleased = false;
    if (to === "CANCELLED" && order.couponId) {
      const del = await tx.couponRedemption.deleteMany({ where: { orderId } });
      if (del.count > 0) {
        await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = GREATEST("usedCount" - 1, 0) WHERE "id" = ${order.couponId}`;
        couponReleased = true;
      }
    }

    const paid = order.payments[0]?.status === "APPROVED";
    await writeAudit(tx, {
      userId: actorId,
      action: `order.status.${to.toLowerCase()}`,
      entity: "Order",
      entityId: orderId,
      metadata: {
        from: order.status,
        to,
        manualConfirmation: order.status === "PENDING_PAYMENT" && to === "CONFIRMED",
        couponReleased,
        // Reembolso no provedor ainda é manual.
        refundPending: to === "CANCELLED" && paid,
      },
    });
    return { ok: true, from: order.status } as const;
  });
}

// ───────────────────────────── Produtos ─────────────────────────────

export function listAdminProducts(filter: { q?: string; status: "active" | "archived" | "all" }) {
  return db.product.findMany({
    where: {
      ...(filter.status === "active" && { archivedAt: null }),
      ...(filter.status === "archived" && { archivedAt: { not: null } }),
      ...(filter.q && { name: { contains: filter.q, mode: "insensitive" } }),
    },
    orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { name: "asc" }],
    include: { category: { select: { name: true } } },
  });
}

export const getAdminProduct = (id: string) =>
  db.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } } } });

export const listCategoryOptions = () => db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });

export interface ProductInput {
  id?: string;
  name: string;
  categoryId: string;
  description: string;
  price: number;
  ingredients: string[];
  allergens: string[];
  images: string[];
  isAvailable: boolean;
  isFeatured: boolean;
}

async function uniqueSlug(tx: Prisma.TransactionClient, name: string) {
  const base = slugify(name) || "produto";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await tx.product.findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export function saveProduct(input: ProductInput, actorId: string) {
  return db.$transaction(async (tx) => {
    const data = {
      name: input.name,
      categoryId: input.categoryId,
      description: input.description,
      priceCents: input.price,
      ingredients: input.ingredients,
      allergens: input.allergens,
      isAvailable: input.isAvailable,
      isFeatured: input.isFeatured,
    };
    const images = input.images.map((url, sortOrder) => ({ url, alt: input.name, sortOrder }));

    let id: string;
    if (input.id) {
      const before = await tx.product.findUnique({ where: { id: input.id }, select: { priceCents: true } });
      if (!before) return null;
      await tx.product.update({ where: { id: input.id }, data });
      await tx.productImage.deleteMany({ where: { productId: input.id } });
      await writeAudit(tx, {
        userId: actorId, action: "product.update", entity: "Product", entityId: input.id,
        metadata: { priceFrom: before.priceCents, priceTo: input.price },
      });
      id = input.id;
    } else {
      const created = await tx.product.create({ data: { ...data, slug: await uniqueSlug(tx, input.name) } });
      await writeAudit(tx, { userId: actorId, action: "product.create", entity: "Product", entityId: created.id });
      id = created.id;
    }
    if (images.length) await tx.productImage.createMany({ data: images.map((i) => ({ ...i, productId: id })) });
    return id;
  });
}

export function setProductArchived(id: string, archived: boolean, actorId: string) {
  return db.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
    await writeAudit(tx, { userId: actorId, action: archived ? "product.archive" : "product.restore", entity: "Product", entityId: id });
  });
}

export function setProductAvailable(id: string, available: boolean, actorId: string) {
  return db.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: { isAvailable: available } });
    await writeAudit(tx, { userId: actorId, action: "product.availability", entity: "Product", entityId: id, metadata: { available } });
  });
}

// ───────────────────────────── Clientes ─────────────────────────────

export function listCustomers(q: string) {
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  return db.$queryRaw<{ id: string; name: string; email: string; phone: string | null; createdAt: Date; orders: number; spent: bigint }[]>`
    SELECT u.id, u.name, u.email, u.phone, u."createdAt",
           COUNT(o.id) FILTER (WHERE o.status::text = ANY(${REVENUE}))::int AS orders,
           COALESCE(SUM(o."totalCents") FILTER (WHERE o.status::text = ANY(${REVENUE})), 0)::bigint AS spent
    FROM "User" u LEFT JOIN "Order" o ON o."userId" = u.id
    WHERE u.role = 'CUSTOMER' AND (u.name ILIKE ${like} OR u.email ILIKE ${like})
    GROUP BY u.id ORDER BY spent DESC, u."createdAt" DESC LIMIT 100`;
}

export const getCustomer = (id: string) =>
  db.user.findFirst({
    where: { id, role: "CUSTOMER" },
    select: {
      id: true, name: true, email: true, phone: true, createdAt: true,
      orders: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, number: true, status: true, totalCents: true, createdAt: true },
      },
    },
  });

// ───────────────────────────── Cupons ─────────────────────────────

export const listCoupons = () => db.coupon.findMany({ orderBy: [{ isActive: "desc" }, { validFrom: "desc" }] });

export const getCoupon = (id: string) => db.coupon.findUnique({ where: { id } });

export interface CouponInput {
  id?: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  minOrder: number;
  maxUses: number | null;
  validUntil: Date | null;
  isActive: boolean;
}

export function saveCoupon(input: CouponInput, actorId: string) {
  return db.$transaction(async (tx) => {
    const data = {
      code: input.code,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderCents: input.minOrder,
      maxUses: input.maxUses,
      validUntil: input.validUntil,
      isActive: input.isActive,
    };
    const coupon = input.id
      ? await tx.coupon.update({ where: { id: input.id }, data })
      : await tx.coupon.create({ data });
    await writeAudit(tx, { userId: actorId, action: input.id ? "coupon.update" : "coupon.create", entity: "Coupon", entityId: coupon.id });
    return coupon.id;
  });
}

export function setCouponActive(id: string, active: boolean, actorId: string) {
  return db.$transaction(async (tx) => {
    await tx.coupon.update({ where: { id }, data: { isActive: active } });
    await writeAudit(tx, { userId: actorId, action: "coupon.active", entity: "Coupon", entityId: id, metadata: { active } });
  });
}

// ───────────────────────────── Configurações ─────────────────────────────

export const getAdminSettings = () => db.storeSettings.findUnique({ where: { id: 1 } });

export interface SettingsInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  hours: { weekdays: string; saturday: string; sunday: string };
  zones: { neighborhood: string; feeCents: number }[];
}

export function saveSettings(input: SettingsInput, actorId: string) {
  return db.$transaction(async (tx) => {
    const data = {
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      openingHours: input.hours,
      deliveryZones: input.zones,
    };
    await tx.storeSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
    await writeAudit(tx, { userId: actorId, action: "settings.update", entity: "StoreSettings", entityId: "1" });
  });
}
