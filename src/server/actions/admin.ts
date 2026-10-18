"use server";

import { redirect } from "next/navigation";
import { authorize } from "@/server/auth/authorize";
import {
  changeOrderStatus,
  saveCoupon,
  saveProduct,
  saveSettings,
  setCouponActive,
  setProductArchived,
  setProductAvailable,
} from "@/server/repositories/admin";
import { isUniqueViolation } from "@/server/repositories/orders";
import { couponSchema, orderStatusSchema, productSchema, settingsSchema } from "@/validators/admin";
import type { FormState } from "./auth";

const DENIED: FormState = { error: "Você não tem permissão para esta ação." };

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

/** Reúne os campos do formulário em um objeto simples (inclui só strings). */
function fields(fd: FormData) {
  const o: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") o[k] = v;
  return o;
}

// ── Pedidos (equipe) ──

export async function updateOrderStatusAction(formData: FormData) {
  const user = await authorize("order:update-status");
  if (!user) redirect("/");

  const parsed = orderStatusSchema.safeParse(fields(formData));
  if (!parsed.success) redirect("/admin/pedidos");

  const result = await changeOrderStatus(parsed.data.orderId, parsed.data.to, user.id);
  redirect(`/admin/pedidos/${parsed.data.orderId}${result.ok ? "?ok=1" : "?erro=transicao"}`);
}

// ── Produtos (admin) ──

export async function saveProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await authorize("product:manage");
  if (!user) return DENIED;

  const parsed = productSchema.safeParse(fields(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Confira os campos destacados.", values: fields(formData) };

  const id = await saveProduct(parsed.data, user.id);
  if (!id) return { error: "Produto não encontrado." };
  redirect("/admin/produtos?salvo=1");
}

export async function toggleProductArchivedAction(formData: FormData) {
  const user = await authorize("product:manage");
  if (!user) redirect("/");
  await setProductArchived(str(formData, "id"), str(formData, "archive") === "1", user.id);
  redirect("/admin/produtos");
}

export async function toggleProductAvailableAction(formData: FormData) {
  const user = await authorize("product:manage");
  if (!user) redirect("/");
  await setProductAvailable(str(formData, "id"), str(formData, "available") === "1", user.id);
  redirect("/admin/produtos");
}

// ── Cupons (admin) ──

export async function saveCouponAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await authorize("coupon:manage");
  if (!user) return DENIED;

  const parsed = couponSchema.safeParse(fields(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Confira os campos destacados.", values: fields(formData) };

  try {
    await saveCoupon(parsed.data, user.id);
  } catch (err) {
    if (isUniqueViolation(err)) return { fieldErrors: { code: ["Já existe um cupom com esse código."] }, values: fields(formData) };
    throw err;
  }
  redirect("/admin/cupons?salvo=1");
}

export async function toggleCouponAction(formData: FormData) {
  const user = await authorize("coupon:manage");
  if (!user) redirect("/");
  await setCouponActive(str(formData, "id"), str(formData, "active") === "1", user.id);
  redirect("/admin/cupons");
}

// ── Configurações (admin) ──

export async function saveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await authorize("settings:manage");
  if (!user) return DENIED;

  const parsed = settingsSchema.safeParse(fields(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, error: "Confira os campos destacados.", values: fields(formData) };

  const { weekdays, saturday, sunday, zones, ...rest } = parsed.data;
  await saveSettings({ ...rest, hours: { weekdays, saturday, sunday }, zones }, user.id);
  return { message: "Configurações salvas.", values: fields(formData) };
}
