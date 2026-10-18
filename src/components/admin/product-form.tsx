"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveProductAction } from "@/server/actions/admin";
import type { FormState } from "@/server/actions/auth";
import { Checkbox, Field, FormMessages, inputCls, SubmitButton } from "./form";

export interface ProductFormValues {
  id?: string;
  name: string;
  categoryId: string;
  description: string;
  priceCents: number;
  ingredients: string[];
  allergens: string[];
  images: string[];
  isAvailable: boolean;
  isFeatured: boolean;
}

const reais = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function ProductForm({
  categories,
  initial,
}: {
  categories: { id: string; name: string }[];
  initial?: ProductFormValues;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProductAction, {});

  return (
    <form action={action} className="max-w-3xl space-y-5" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <FormMessages state={state} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nome" name="name" state={state}>
          {(p) => <input {...p} name="name" defaultValue={state.values?.name ?? initial?.name} className={inputCls} />}
        </Field>
        <Field label="Categoria" name="categoryId" state={state}>
          {(p) => (
            <select {...p} name="categoryId" defaultValue={state.values?.categoryId ?? initial?.categoryId ?? ""} className={inputCls}>
              <option value="">Escolha…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <Field label="Descrição" name="description" state={state}>
        {(p) => <textarea {...p} name="description" rows={3} defaultValue={state.values?.description ?? initial?.description} className={inputCls} />}
      </Field>

      <Field label="Preço (R$)" name="price" state={state} hint="Ex.: 12,90. Alterar o preço não muda pedidos já feitos.">
        {(p) => (
          <input {...p} name="price" inputMode="decimal" defaultValue={state.values?.price ?? (initial ? reais(initial.priceCents) : "")} className={`${inputCls} sm:w-48`} />
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Ingredientes" name="ingredients" state={state} hint="Separe por vírgula ou linha.">
          {(p) => <textarea {...p} name="ingredients" rows={3} defaultValue={state.values?.ingredients ?? initial?.ingredients.join(", ")} className={inputCls} />}
        </Field>
        <Field label="Alergênicos" name="allergens" state={state} hint="Ex.: glúten, leite, ovos. Vazio = nenhum declarado.">
          {(p) => <textarea {...p} name="allergens" rows={3} defaultValue={state.values?.allergens ?? initial?.allergens.join(", ")} className={inputCls} />}
        </Field>
      </div>

      <Field label="Imagens (URLs https, uma por linha)" name="images" state={state} hint="A primeira é a imagem principal. O upload direto (Cloudinary) entra quando as credenciais forem configuradas.">
        {(p) => <textarea {...p} name="images" rows={3} defaultValue={state.values?.images ?? initial?.images.join("\n")} className={inputCls} />}
      </Field>

      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <Checkbox name="isAvailable" label="Disponível para compra" defaultChecked={state.values ? state.values.isAvailable === "on" : (initial?.isAvailable ?? true)} />
        <Checkbox name="isFeatured" label="Produto em destaque" defaultChecked={state.values ? state.values.isFeatured === "on" : (initial?.isFeatured ?? false)} />
      </div>

      <div className="flex items-center gap-4 pt-2">
        <SubmitButton pending={pending}>{initial?.id ? "Salvar alterações" : "Criar produto"}</SubmitButton>
        <Link href="/admin/produtos" className="text-sm underline">Cancelar</Link>
      </div>
    </form>
  );
}
