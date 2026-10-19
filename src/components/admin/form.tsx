"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormState } from "@/server/actions/auth";

export const inputCls =
  "w-full rounded-lg border border-beige bg-white px-3 py-2.5 text-sm aria-[invalid=true]:border-red-500";

export function Field({
  label,
  name,
  state,
  hint,
  children,
}: {
  label: string;
  name: string;
  state: FormState;
  hint?: string;
  children: (p: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode;
}) {
  const error = state.fieldErrors?.[name]?.[0];
  const id = `f-${name}`;
  const describedBy = [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-coffee/70">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2.5 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[var(--chart-1)]" />
      {label}
    </label>
  );
}

export function FormMessages({ state }: { state: FormState }) {
  return (
    <>
      {state.error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</p>}
      {state.message && <p role="status" className="rounded-lg bg-olive/10 px-4 py-3 text-sm text-olive">{state.message}</p>}
    </>
  );
}

export function SubmitButton({ pending, children, className }: { pending: boolean; children: React.ReactNode; className?: string }) {
  return (
    <button
      disabled={pending}
      className={cn("inline-flex items-center gap-2 rounded-lg bg-coffee px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-coffee/90 disabled:opacity-60", className)}
    >
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
