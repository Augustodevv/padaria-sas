import { z } from "zod";
import { MAX_QTY_PER_ITEM } from "@/server/services/pricing";

export const addressSchema = z.object({
  zipCode: z.string().trim().regex(/^\d{5}-?\d{3}$/, "CEP inválido."),
  street: z.string().trim().min(2, "Informe a rua.").max(120),
  number: z.string().trim().min(1, "Informe o número.").max(10),
  complement: z.string().trim().max(60).optional(),
  neighborhood: z.string().trim().min(2, "Informe o bairro.").max(80),
  city: z.string().trim().min(2, "Informe a cidade.").max(80),
  state: z.string().trim().length(2, "Use a sigla do estado (ex.: SP).").toUpperCase(),
});

export const cartItemSchema = z.object({
  productId: z.string().min(1).max(40),
  quantity: z.number().int().min(1).max(MAX_QTY_PER_ITEM),
});

export const couponCodeSchema = z
  .string()
  .trim()
  .max(40)
  .regex(/^[A-Za-z0-9_-]*$/, "Cupom inválido.");

export const checkoutSchema = z
  .object({
    items: z.array(cartItemSchema).min(1, "O carrinho está vazio.").max(50),
    fulfillment: z.enum(["PICKUP", "DELIVERY"]),
    scheduledFor: z.coerce.date({ error: "Escolha um horário." }),
    notes: z.string().trim().max(300, "Observação muito longa.").optional(),
    couponCode: couponCodeSchema.optional(),
    idempotencyKey: z.string().min(16).max(64),
    address: addressSchema.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment === "DELIVERY" && !v.address) {
      ctx.addIssue({ code: "custom", path: ["address"], message: "Informe o endereço de entrega." });
    }
  });

/** Versão usada na prévia de totais (não exige horário nem chave de idempotência). */
export const previewSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(50),
  fulfillment: z.enum(["PICKUP", "DELIVERY"]),
  neighborhood: z.string().trim().max(80).optional(),
  couponCode: couponCodeSchema.optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type PreviewInput = z.infer<typeof previewSchema>;
