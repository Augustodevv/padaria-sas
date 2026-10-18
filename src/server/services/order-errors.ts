export type OrderErrorCode =
  | "INVALID_SLOT"
  | "OUT_OF_ZONE"
  | "COUPON_INVALID"
  | "IDEMPOTENCY_CONFLICT"
  | "NOT_FOUND";

/** Erro de regra de negócio com mensagem segura para exibir ao cliente. */
export class OrderError extends Error {
  constructor(
    public code: OrderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OrderError";
  }
}
