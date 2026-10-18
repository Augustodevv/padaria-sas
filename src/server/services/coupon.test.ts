import { describe, expect, it } from "vitest";
import { evaluateCoupon, normalizeCouponCode, type CouponRecord } from "./coupon";

const now = new Date("2026-10-18T12:00:00Z");

const base: CouponRecord = {
  code: "BEMVINDO10",
  discountType: "PERCENT",
  discountValue: 10,
  minOrderCents: 0,
  maxUses: null,
  usedCount: 0,
  validFrom: new Date("2026-01-01"),
  validUntil: null,
  isActive: true,
};

const run = (c: Partial<CouponRecord>, ctx: { subtotalCents?: number; userAlreadyRedeemed?: boolean } = {}) =>
  evaluateCoupon({ ...base, ...c }, { subtotalCents: 10000, now, ...ctx });

describe("evaluateCoupon", () => {
  it("aplica percentual arredondando para baixo", () => {
    expect(run({}, { subtotalCents: 3333 })).toEqual({ ok: true, discountCents: 333 });
  });

  it("aplica valor fixo limitado ao subtotal", () => {
    expect(run({ discountType: "FIXED", discountValue: 2000 })).toEqual({ ok: true, discountCents: 2000 });
    expect(run({ discountType: "FIXED", discountValue: 2000 }, { subtotalCents: 1500 })).toEqual({
      ok: true,
      discountCents: 1500,
    });
  });

  it("limita percentual a 100%", () => {
    expect(run({ discountValue: 150 })).toEqual({ ok: true, discountCents: 10000 });
  });

  it.each([
    ["INACTIVE", { isActive: false }, {}],
    ["NOT_STARTED", { validFrom: new Date("2027-01-01") }, {}],
    ["EXPIRED", { validUntil: new Date("2026-10-01") }, {}],
    ["EXHAUSTED", { maxUses: 5, usedCount: 5 }, {}],
    ["MIN_ORDER", { minOrderCents: 20000 }, {}],
    ["ALREADY_USED", {}, { userAlreadyRedeemed: true }],
  ] as const)("rejeita: %s", (reason, coupon, ctx) => {
    const r = run(coupon, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(reason);
  });

  it("ainda vale no último uso disponível", () => {
    expect(run({ maxUses: 5, usedCount: 4 }).ok).toBe(true);
  });
});

describe("normalizeCouponCode", () => {
  it("remove espaços e padroniza em maiúsculas", () => {
    expect(normalizeCouponCode("  bemvindo10 ")).toBe("BEMVINDO10");
  });
});
