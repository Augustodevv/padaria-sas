import type { OrderStatus } from "./payment-status";

/**
 * Máquina de estados do pedido no painel. A equipe só avança um passo por vez
 * (ou cancela); entregue e cancelado são finais.
 * "PENDING_PAYMENT → CONFIRMED" é a confirmação manual (ex.: pago no balcão) e fica registrada em auditoria.
 */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const allowedTransitions = (from: OrderStatus): OrderStatus[] => NEXT[from];

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean => NEXT[from].includes(to);

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparo",
  READY: "Pronto",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

/** Texto do botão que leva ao status indicado. */
export const ACTION_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Voltar para aguardando pagamento",
  CONFIRMED: "Confirmar manualmente",
  PREPARING: "Iniciar preparo",
  READY: "Marcar como pronto",
  DELIVERED: "Marcar como entregue",
  CANCELLED: "Cancelar pedido",
};

/** Pedidos que contam como venda (faturamento, ticket médio, ranking). */
export const REVENUE_STATUSES: OrderStatus[] = ["CONFIRMED", "PREPARING", "READY", "DELIVERED"];
