"use client";

import { Loader2 } from "lucide-react";
import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/server/actions/auth";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "tel";
  autoComplete?: string;
  required?: boolean;
}

interface Props {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields: FieldDef[];
  submitLabel: string;
  hidden?: Record<string, string>;
  footer?: ReactNode;
}

export function AuthForm({ action, fields, submitLabel, hidden, footer }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      {state.error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="rounded-2xl bg-olive/10 px-4 py-3 text-sm text-olive">
          {state.message}
        </p>
      )}

      {fields.map((f) => {
        const errors = state.fieldErrors?.[f.name];
        const id = `f-${f.name}`;
        return (
          <div key={f.name}>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
              {f.label}
            </label>
            <input
              id={id}
              name={f.name}
              type={f.type ?? "text"}
              autoComplete={f.autoComplete}
              required={f.required ?? true}
              aria-invalid={!!errors}
              aria-describedby={errors ? `${id}-err` : undefined}
              className="w-full rounded-2xl border border-beige bg-white px-4 py-3 aria-[invalid=true]:border-red-500"
            />
            {errors && (
              <p id={`${id}-err`} className="mt-1.5 text-sm text-red-700">
                {errors[0]}
              </p>
            )}
          </div>
        );
      })}

      <button
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-coffee py-3.5 font-medium text-cream transition hover:bg-caramel disabled:opacity-60"
      >
        {pending && <Loader2 size={18} className="animate-spin" />}
        {submitLabel}
      </button>

      {footer && <div className="pt-2 text-center text-sm text-coffee/70">{footer}</div>}
    </form>
  );
}
