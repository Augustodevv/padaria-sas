import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { requireUser } from "@/server/auth/guards";
import { getStoreConfig } from "@/server/repositories/store";
import { availableSlots } from "@/server/services/schedule";

export const metadata: Metadata = { title: "Finalizar pedido", robots: { index: false } };

async function Checkout() {
  const user = await requireUser("/checkout");
  const config = await getStoreConfig();
  const slots = availableSlots(new Date(), config.hours).map((d) => d.toISOString());

  return <CheckoutForm slots={slots} zones={config.zones} customer={{ name: user.name, email: user.email }} />;
}

export default function CheckoutPage() {
  return (
    <div className="min-h-[100svh] mx-auto max-w-6xl px-6 pb-24 pt-32">
      <h1 className="mb-10 font-display text-5xl">Finalizar pedido</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-beige/70" aria-busy />}>
        <Checkout />
      </Suspense>
    </div>
  );
}
