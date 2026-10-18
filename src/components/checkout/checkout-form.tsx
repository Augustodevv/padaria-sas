"use client";

import { Loader2, Store, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  placeOrderAction,
  previewCheckoutAction,
  type PlaceOrderResult,
  type PreviewResult,
} from "@/server/actions/checkout";
import { formatSlot } from "@/server/services/schedule";

interface Props {
  slots: string[]; // ISO UTC
  zones: { neighborhood: string; feeCents: number }[];
  customer: { name: string; email: string };
}

const input =
  "w-full rounded-2xl border border-beige bg-white px-4 py-3 aria-[invalid=true]:border-red-500";

export function CheckoutForm({ slots, zones, customer }: Props) {
  const cart = useCart();
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [slot, setSlot] = useState(slots[0] ?? "");
  const [notes, setNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [address, setAddress] = useState({
    zipCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: zones[0]?.neighborhood ?? "",
    city: "São Paulo",
    state: "SP",
  });
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<PlaceOrderResult>({});
  const [pending, startTransition] = useTransition();
  // Mesma chave em reenvios do mesmo checkout (duplo clique, retry de rede).
  const idempotencyKey = useRef(typeof crypto !== "undefined" ? crypto.randomUUID() : "");

  const items = useMemo(
    () => cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    [cart.lines],
  );
  const neighborhood = fulfillment === "DELIVERY" ? address.neighborhood : undefined;

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await previewCheckoutAction({
        items,
        fulfillment,
        neighborhood,
        couponCode: appliedCoupon || undefined,
      });
      if (!cancelled) setPreview(r);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [items, fulfillment, neighborhood, appliedCoupon]);

  if (cart.lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-editorial text-3xl italic">Seu carrinho está vazio</p>
        <Link href="/cardapio" className="mt-6 inline-block rounded-full bg-coffee px-8 py-3 text-cream hover:bg-caramel">
          Explorar cardápio
        </Link>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult({});
    startTransition(async () => {
      const r = await placeOrderAction({
        items,
        fulfillment,
        scheduledFor: slot,
        notes: notes || undefined,
        couponCode: appliedCoupon || undefined,
        idempotencyKey: idempotencyKey.current,
        address: fulfillment === "DELIVERY" ? address : undefined,
      });
      if (r.redirectTo) {
        cart.clear();
        // Interno: navegação completa (pedido); externo: Mercado Pago.
        window.location.assign(r.redirectTo);
        return;
      }
      setResult(r);
    });
  }

  const fe = (name: string) => result.fieldErrors?.[name]?.[0];
  const blocked = pending || !preview?.ok || (fulfillment === "DELIVERY" && !!preview?.deliveryMessage);

  return (
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_24rem]" noValidate>
      <div className="space-y-10">
        {result.error && (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {result.error}
          </p>
        )}

        <section aria-labelledby="h-contato">
          <h2 id="h-contato" className="font-display text-2xl">1. Seus dados</h2>
          <p className="mt-2 text-coffee/70">
            {customer.name} · {customer.email}
          </p>
        </section>

        <section aria-labelledby="h-entrega">
          <h2 id="h-entrega" className="font-display text-2xl">2. Retirada ou entrega</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-labelledby="h-entrega">
            {(
              [
                ["PICKUP", "Retirar na loja", "Sem taxa", Store],
                ["DELIVERY", "Receber em casa", "Taxa por bairro", Truck],
              ] as const
            ).map(([value, title, sub, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={fulfillment === value}
                onClick={() => setFulfillment(value)}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border p-4 text-left transition",
                  fulfillment === value ? "border-coffee bg-white shadow-soft" : "border-beige hover:border-caramel",
                )}
              >
                <Icon className="text-caramel" />
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="text-sm text-coffee/60">{sub}</span>
                </span>
              </button>
            ))}
          </div>

          {fulfillment === "DELIVERY" && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="CEP">
                <input className={input} value={address.zipCode} inputMode="numeric" autoComplete="postal-code"
                  onChange={(e) => setAddress({ ...address, zipCode: e.target.value })} placeholder="00000-000" />
              </Field>
              <Field label="Bairro (área de entrega)">
                <select className={input} value={address.neighborhood}
                  onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}>
                  {zones.map((z) => (
                    <option key={z.neighborhood} value={z.neighborhood}>
                      {z.neighborhood} — {formatBRL(z.feeCents)}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Rua">
                  <input className={input} value={address.street} autoComplete="address-line1"
                    onChange={(e) => setAddress({ ...address, street: e.target.value })} />
                </Field>
              </div>
              <Field label="Número">
                <input className={input} value={address.number}
                  onChange={(e) => setAddress({ ...address, number: e.target.value })} />
              </Field>
              <Field label="Complemento (opcional)">
                <input className={input} value={address.complement} autoComplete="address-line2"
                  onChange={(e) => setAddress({ ...address, complement: e.target.value })} />
              </Field>
              <Field label="Cidade">
                <input className={input} value={address.city} autoComplete="address-level2"
                  onChange={(e) => setAddress({ ...address, city: e.target.value })} />
              </Field>
              <Field label="UF">
                <input className={input} value={address.state} maxLength={2} autoComplete="address-level1"
                  onChange={(e) => setAddress({ ...address, state: e.target.value })} />
              </Field>
              {result.fieldErrors?.address && (
                <p className="text-sm text-red-700 sm:col-span-2">Confira o endereço de entrega.</p>
              )}
            </div>
          )}
        </section>

        <section aria-labelledby="h-horario">
          <h2 id="h-horario" className="font-display text-2xl">3. Horário</h2>
          <label htmlFor="slot" className="sr-only">Horário escolhido</label>
          <select id="slot" value={slot} onChange={(e) => setSlot(e.target.value)} className={cn(input, "mt-4")}>
            {slots.map((s) => (
              <option key={s} value={s}>{formatSlot(new Date(s))}</option>
            ))}
          </select>
          {fe("scheduledFor") && <p className="mt-1.5 text-sm text-red-700">{fe("scheduledFor")}</p>}
        </section>

        <section aria-labelledby="h-obs">
          <h2 id="h-obs" className="font-display text-2xl">4. Observações</h2>
          <label htmlFor="notes" className="sr-only">Observações do pedido</label>
          <textarea id="notes" rows={3} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: sem açúcar de confeiteiro, escrever “Parabéns” no bolo…" className={cn(input, "mt-4")} />
        </section>
      </div>

      <aside className="h-fit space-y-5 rounded-[2rem] bg-white p-6 shadow-soft lg:sticky lg:top-28" aria-label="Resumo do pedido">
        <h2 className="font-display text-2xl">Resumo</h2>
        <ul className="divide-y divide-beige text-sm">
          {cart.lines.map((l) => (
            <li key={l.productId} className="flex justify-between gap-3 py-2">
              <span>{l.quantity}× {l.name}</span>
              <span>{formatBRL(l.priceCents * l.quantity)}</span>
            </li>
          ))}
        </ul>

        <div>
          <label htmlFor="coupon" className="mb-1.5 block text-sm font-medium">Cupom</label>
          <div className="flex gap-2">
            <input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              className={cn(input, "py-2.5 uppercase")} placeholder="BEMVINDO10" />
            <button type="button" onClick={() => setAppliedCoupon(coupon.trim())}
              className="rounded-full border border-coffee px-5 text-sm font-medium hover:bg-coffee hover:text-cream">
              Aplicar
            </button>
          </div>
          {preview?.couponMessage && <p role="status" className="mt-1.5 text-sm text-red-700">{preview.couponMessage}</p>}
          {appliedCoupon && !preview?.couponMessage && preview?.ok && (
            <p role="status" className="mt-1.5 text-sm text-olive">Cupom aplicado.</p>
          )}
        </div>

        {preview?.ok ? (
          <dl className="space-y-2 border-t border-beige pt-4 text-sm">
            <Row label="Subtotal" value={formatBRL(preview.subtotalCents ?? 0)} />
            {!!preview.discountCents && <Row label="Desconto" value={`− ${formatBRL(preview.discountCents)}`} tone="olive" />}
            <Row label="Entrega" value={fulfillment === "PICKUP" ? "Grátis" : formatBRL(preview.deliveryFeeCents ?? 0)} />
            <div className="flex items-baseline justify-between border-t border-beige pt-3">
              <dt className="font-medium">Total</dt>
              <dd className="font-display text-3xl" data-testid="total">{formatBRL(preview.totalCents ?? 0)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-coffee/60">{preview?.error ?? "Calculando…"}</p>
        )}
        {preview?.deliveryMessage && <p className="text-sm text-red-700">{preview.deliveryMessage}</p>}

        <button disabled={blocked}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-coffee py-4 font-medium text-cream transition hover:bg-caramel disabled:opacity-50">
          {pending && <Loader2 size={18} className="animate-spin" />}
          {pending ? "Criando pedido…" : "Confirmar e pagar"}
        </button>
        <p className="text-center text-xs text-coffee/50">
          O valor final é calculado e conferido no servidor. Pagamento seguro pelo Mercado Pago.
        </p>
      </aside>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      <span className="mb-1.5 block">{label}</span>
      {children}
      {error && <span className="mt-1 block text-red-700">{error}</span>}
    </label>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "olive" }) {
  return (
    <div className="flex justify-between">
      <dt className="text-coffee/70">{label}</dt>
      <dd className={tone === "olive" ? "text-olive" : undefined}>{value}</dd>
    </div>
  );
}
