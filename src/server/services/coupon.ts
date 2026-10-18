export interface CouponRecord {
  code: string;
  discountType: "PERCENT" | "FIXED";
  /** PERCENT: 1–100. FIXED: centavos. */
  discountValue: number;
  minOrderCents: number;
  maxUses: number | null;
  usedCount: number;
  validFrom: Date;
  validUntil: Date | null;
  isActive: boolean;
}

export type CouponRejection =
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "EXHAUSTED"
  | "MIN_ORDER"
  | "ALREADY_USED";

export type CouponResult =
  | { ok: true; discountCents: number }
  | { ok: false; reason: CouponRejection; message: string };

const MESSAGES: Record<CouponRejection, string> = {
  INACTIVE: "Este cupom não está ativo.",
  NOT_STARTED: "Este cupom ainda não é válido.",
  EXPIRED: "Este cupom expirou.",
  EXHAUSTED: "Este cupom atingiu o limite de usos.",
  MIN_ORDER: "O pedido não atinge o valor mínimo deste cupom.",
  ALREADY_USED: "Você já usou este cupom.",
};

const fail = (reason: CouponRejection): CouponResult => ({ ok: false, reason, message: MESSAGES[reason] });

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function evaluateCoupon(
  coupon: CouponRecord,
  ctx: { subtotalCents: number; now?: Date; userAlreadyRedeemed?: boolean },
): CouponResult {
  const now = ctx.now ?? new Date();

  if (!coupon.isActive) return fail("INACTIVE");
  if (coupon.validFrom > now) return fail("NOT_STARTED");
  if (coupon.validUntil && coupon.validUntil < now) return fail("EXPIRED");
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return fail("EXHAUSTED");
  if (ctx.subtotalCents < coupon.minOrderCents) return fail("MIN_ORDER");
  if (ctx.userAlreadyRedeemed) return fail("ALREADY_USED");

  const raw =
    coupon.discountType === "PERCENT"
      ? Math.floor((ctx.subtotalCents * Math.min(Math.max(coupon.discountValue, 0), 100)) / 100)
      : coupon.discountValue;

  return { ok: true, discountCents: Math.min(Math.max(raw, 0), ctx.subtotalCents) };
}
