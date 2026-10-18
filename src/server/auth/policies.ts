/**
 * Regras de autorização puras (sem I/O), para serem testadas e reutilizadas
 * em Server Actions, Route Handlers e layouts. O frontend nunca é a fonte
 * de verdade: toda ação sensível chama uma dessas funções no servidor.
 */
export type Role = "CUSTOMER" | "STAFF" | "ADMIN";

export interface Actor {
  id: string;
  role: Role;
}

const RANK: Record<Role, number> = { CUSTOMER: 0, STAFF: 1, ADMIN: 2 };

export function hasRole(actor: Actor | null | undefined, min: Role): boolean {
  return !!actor && RANK[actor.role] >= RANK[min];
}

export type Permission =
  | "admin:access"
  | "order:read-any"
  | "order:update-status"
  | "product:manage"
  | "coupon:manage"
  | "customer:read"
  | "settings:manage"
  | "report:read";

const REQUIRED_ROLE: Record<Permission, Role> = {
  "admin:access": "STAFF",
  "order:read-any": "STAFF",
  "order:update-status": "STAFF",
  "customer:read": "STAFF",
  "report:read": "STAFF",
  "product:manage": "ADMIN",
  "coupon:manage": "ADMIN",
  "settings:manage": "ADMIN",
};

export function can(actor: Actor | null | undefined, permission: Permission): boolean {
  return hasRole(actor, REQUIRED_ROLE[permission]);
}

/** Autorização por recurso: o dono ou a equipe podem ver o pedido. */
export function canViewOrder(actor: Actor | null | undefined, order: { userId: string }): boolean {
  if (!actor) return false;
  return order.userId === actor.id || can(actor, "order:read-any");
}

/** Apenas o dono altera os próprios endereços/favoritos. */
export function ownsResource(actor: Actor | null | undefined, resource: { userId: string }): boolean {
  return !!actor && resource.userId === actor.id;
}

/** Cliente só cancela pedido que ainda não entrou em preparo. */
export function canCancelOrder(
  actor: Actor | null | undefined,
  order: { userId: string; status: string },
): boolean {
  if (!actor) return false;
  if (order.status === "DELIVERED" || order.status === "CANCELLED") return false;
  if (can(actor, "order:update-status")) return true;
  return order.userId === actor.id && (order.status === "PENDING_PAYMENT" || order.status === "CONFIRMED");
}
