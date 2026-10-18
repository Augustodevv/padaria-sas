"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveCouponAction } from "@/server/actions/admin";
import type { FormState } from "@/server/actions/auth";
import { Checkbox, Field, FormMessages, inputCls, SubmitButton } from "./form";

export interface CouponFormValues {
  id?: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  minOrderCents: number;
  maxUses: number | null;
  validUntil: string; // YYYY-MM-DD ou ""
  isActive: boolean;
}

const reais = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function CouponForm({ initial }: { initial?: CouponFormValues }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCouponAction, {});
  const [type, setType] = useState<"PERCENT" | "FIXED">(initial?.discountType ?? "PERCENT");

  return (
    <form action={action} className="max-w-2xl space-y-5" noValidate>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <FormMessages state={state} />

      <Field label="Código" name="code" state={state} hint="Letras, números, - ou _. Clientes digitam em qualquer caixa.">
        {(p) => <input {...p} name="code" defaultValue={state.values?.code ?? initial?.code} className={`${inputCls} uppercase sm:w-64`} />}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tipo de desconto" name="discountType" state={state}>
          {(p) => (
            <select {...p} name="discountType" value={type} onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")} className={inputCls}>
              <option value="PERCENT">Percentual (%)</option>
              <option value="FIXED">Valor fixo (R$)</option>
            </select>
          )}
        </Field>
        <Field label={type === "PERCENT" ? "Percentual (1 a 100)" : "Valor do desconto (R$)"} name="discountValue" state={state}>
          {(p) => (
            <input
              {...p}
              name="discountValue"
              inputMode="decimal"
              defaultValue={state.values?.discountValue ?? (initial ? (initial.discountType === "PERCENT" ? String(initial.discountValue) : reais(initial.discountValue)) : "")}
              className={inputCls}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Pedido mínimo (R$)" name="minOrder" state={state} hint="Vazio = sem mínimo.">
          {(p) => <input {...p} name="minOrder" inputMode="decimal" defaultValue={state.values?.minOrder ?? (initial?.minOrderCents ? reais(initial.minOrderCents) : "")} className={inputCls} />}
        </Field>
        <Field label="Limite de usos" name="maxUses" state={state} hint="Vazio = ilimitado.">
          {(p) => <input {...p} name="maxUses" inputMode="numeric" defaultValue={state.values?.maxUses ?? initial?.maxUses ?? ""} className={inputCls} />}
        </Field>
        <Field label="Válido até" name="validUntil" state={state} hint="Vale até o fim do dia.">
          {(p) => <input {...p} type="date" name="validUntil" defaultValue={state.values?.validUntil ?? initial?.validUntil} className={inputCls} />}
        </Field>
      </div>

      <Checkbox name="isActive" label="Cupom ativo" defaultChecked={state.values ? state.values.isActive === "on" : (initial?.isActive ?? true)} />
      <p className="text-xs text-coffee/55">Cada cliente pode usar o mesmo cupom uma vez.</p>

      <div className="flex items-center gap-4 pt-2">
        <SubmitButton pending={pending}>{initial?.id ? "Salvar cupom" : "Criar cupom"}</SubmitButton>
        <Link href="/admin/cupons" className="text-sm underline">Cancelar</Link>
      </div>
    </form>
  );
}
