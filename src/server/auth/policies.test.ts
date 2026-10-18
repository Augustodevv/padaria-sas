import { describe, expect, it } from "vitest";
import { can, canCancelOrder, canViewOrder, hasRole, ownsResource, type Actor } from "./policies";

const customer: Actor = { id: "u1", role: "CUSTOMER" };
const other: Actor = { id: "u2", role: "CUSTOMER" };
const staff: Actor = { id: "s1", role: "STAFF" };
const admin: Actor = { id: "a1", role: "ADMIN" };

describe("hasRole", () => {
  it("respeita a hierarquia CUSTOMER < STAFF < ADMIN", () => {
    expect(hasRole(customer, "STAFF")).toBe(false);
    expect(hasRole(staff, "STAFF")).toBe(true);
    expect(hasRole(admin, "STAFF")).toBe(true);
    expect(hasRole(staff, "ADMIN")).toBe(false);
  });

  it("nega para usuário anônimo", () => {
    expect(hasRole(null, "CUSTOMER")).toBe(false);
    expect(hasRole(undefined, "CUSTOMER")).toBe(false);
  });
});

describe("can", () => {
  it("cliente não acessa o painel", () => {
    expect(can(customer, "admin:access")).toBe(false);
  });

  it("funcionário atualiza pedidos, mas não gerencia produtos, cupons ou configurações", () => {
    expect(can(staff, "order:update-status")).toBe(true);
    expect(can(staff, "product:manage")).toBe(false);
    expect(can(staff, "coupon:manage")).toBe(false);
    expect(can(staff, "settings:manage")).toBe(false);
  });

  it("admin pode tudo", () => {
    for (const p of ["product:manage", "coupon:manage", "settings:manage", "order:read-any"] as const) {
      expect(can(admin, p)).toBe(true);
    }
  });
});

describe("autorização por recurso", () => {
  const order = { userId: "u1", status: "PENDING_PAYMENT" };

  it("só o dono e a equipe veem o pedido", () => {
    expect(canViewOrder(customer, order)).toBe(true);
    expect(canViewOrder(other, order)).toBe(false);
    expect(canViewOrder(staff, order)).toBe(true);
    expect(canViewOrder(null, order)).toBe(false);
  });

  it("ownsResource compara o dono", () => {
    expect(ownsResource(customer, { userId: "u1" })).toBe(true);
    expect(ownsResource(other, { userId: "u1" })).toBe(false);
  });

  it("cliente cancela só antes do preparo; equipe cancela até a entrega", () => {
    expect(canCancelOrder(customer, { userId: "u1", status: "CONFIRMED" })).toBe(true);
    expect(canCancelOrder(customer, { userId: "u1", status: "PREPARING" })).toBe(false);
    expect(canCancelOrder(other, { userId: "u1", status: "CONFIRMED" })).toBe(false);
    expect(canCancelOrder(staff, { userId: "u1", status: "PREPARING" })).toBe(true);
    expect(canCancelOrder(admin, { userId: "u1", status: "DELIVERED" })).toBe(false);
    expect(canCancelOrder(staff, { userId: "u1", status: "CANCELLED" })).toBe(false);
  });
});
