"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/server/actions/admin";
import type { FormState } from "@/server/actions/auth";
import { Field, FormMessages, inputCls, SubmitButton } from "./form";

export interface SettingsValues {
  name: string;
  phone: string;
  email: string;
  address: string;
  weekdays: string;
  saturday: string;
  sunday: string;
  zones: string; // "Bairro; 8,00" por linha
}

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettingsAction, {});

  return (
    <form action={action} className="max-w-3xl space-y-8" noValidate>
      <FormMessages state={state} />

      <fieldset className="space-y-5">
        <legend className="mb-1 font-display text-xl">Loja</legend>
        <Field label="Nome da padaria" name="name" state={state}>
          {(p) => <input {...p} name="name" defaultValue={state.values?.name ?? initial.name} className={inputCls} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Telefone" name="phone" state={state}>
            {(p) => <input {...p} name="phone" defaultValue={state.values?.phone ?? initial.phone} className={inputCls} />}
          </Field>
          <Field label="Email de contato" name="email" state={state}>
            {(p) => <input {...p} type="email" name="email" defaultValue={state.values?.email ?? initial.email} className={inputCls} />}
          </Field>
        </div>
        <Field label="Endereço" name="address" state={state}>
          {(p) => <input {...p} name="address" defaultValue={state.values?.address ?? initial.address} className={inputCls} />}
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-1 font-display text-xl">Horário de funcionamento</legend>
        <p className="text-sm text-coffee/60">Define os horários de retirada e entrega oferecidos no checkout (blocos de 30 min). Formato 07:00–19:00.</p>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Segunda a sexta" name="weekdays" state={state}>
            {(p) => <input {...p} name="weekdays" defaultValue={state.values?.weekdays ?? initial.weekdays} className={inputCls} />}
          </Field>
          <Field label="Sábado" name="saturday" state={state}>
            {(p) => <input {...p} name="saturday" defaultValue={state.values?.saturday ?? initial.saturday} className={inputCls} />}
          </Field>
          <Field label="Domingo" name="sunday" state={state}>
            {(p) => <input {...p} name="sunday" defaultValue={state.values?.sunday ?? initial.sunday} className={inputCls} />}
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 font-display text-xl">Entrega: bairros atendidos e taxas</legend>
        <Field label="Um bairro por linha, no formato “Nome; valor”" name="zones" state={state} hint="Ex.: Centro; 8,00. Bairros que não estiverem na lista não recebem entrega (só retirada).">
          {(p) => <textarea {...p} name="zones" rows={7} defaultValue={state.values?.zones ?? initial.zones} className={`${inputCls} font-mono`} />}
        </Field>
      </fieldset>

      <fieldset>
        <legend className="mb-1 font-display text-xl">Pagamento</legend>
        <p className="text-sm text-coffee/70">
          Mercado Pago (cartão, Pix e boleto no Checkout Pro). As credenciais ficam em variáveis de ambiente do servidor, nunca aqui.
        </p>
      </fieldset>

      <SubmitButton pending={pending}>Salvar configurações</SubmitButton>
    </form>
  );
}
