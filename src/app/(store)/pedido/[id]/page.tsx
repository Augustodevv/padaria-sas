import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AutoRefresh, ConfirmedCheck } from "@/components/checkout/order-widgets";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { payOrderAction, simulatePaymentAction } from "@/server/actions/checkout";
import { requireUser } from "@/server/auth/guards";
import { canViewOrder } from "@/server/auth/policies";
import { paymentMode } from "@/server/integrations/mercadopago";
import { getOrderById } from "@/server/repositories/orders";
import { formatSlot } from "@/server/services/schedule";

export const metadata: Metadata = { title: "Seu pedido", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> };

const STEPS = [
  ["PENDING_PAYMENT", "Aguardando pagamento"],
  ["CONFIRMED", "Confirmado"],
  ["PREPARING", "Em preparo"],
  ["READY", "Pronto"],
  ["DELIVERED", "Entregue"],
] as const;

function safeMode() {
  try {
    return paymentMode();
  } catch {
    return null;
  }
}

async function Order({ params, searchParams }: Props) {
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/pedido/${id}`);
  const order = await getOrderById(id);
  // Sem permissão, a resposta é igual à de pedido inexistente (não revela que o id existe).
  if (!order || !canViewOrder(user, order)) notFound();

  const pending = order.status === "PENDING_PAYMENT";
  const cancelled = order.status === "CANCELLED";
  const stepIndex = STEPS.findIndex(([s]) => s === order.status);
  const isOwner = order.userId === user.id;
  const mock = safeMode() === "mock";

  return (
    <>
      <AutoRefresh active={pending && isOwner} />

      <header className="text-center">
        {!pending && !cancelled && <ConfirmedCheck />}
        <p className="mt-6 font-editorial text-xl italic text-caramel-deep">Pedido #{order.number}</p>
        <h1 className="mt-1 font-display text-4xl sm:text-5xl">
          {cancelled ? "Pedido cancelado" : pending ? "Falta o pagamento" : "Pedido confirmado!"}
        </h1>
        {order.scheduledFor && !cancelled && (
          <p className="mt-3 text-coffee/70">
            {order.fulfillment === "PICKUP" ? "Retirada" : "Entrega"}: {formatSlot(order.scheduledFor)}
          </p>
        )}
      </header>

      {erro === "pagamento" && (
        <p role="alert" className="mt-8 rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-800">
          Não conseguimos abrir o pagamento agora. Seu pedido está salvo: tente novamente abaixo.
        </p>
      )}

      {pending && isOwner && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <form action={payOrderAction.bind(null, order.id)}>
            <button className="rounded-full bg-coffee px-10 py-4 font-medium text-cream transition hover:bg-caramel-deep">
              Pagar {formatBRL(order.totalCents)}
            </button>
          </form>
          {mock && (
            <form action={simulatePaymentAction.bind(null, order.id)}>
              <button className="rounded-full border border-dashed border-coffee/40 px-6 py-2 text-sm text-coffee/70 hover:bg-beige">
                Modo desenvolvimento: simular pagamento aprovado
              </button>
            </form>
          )}
        </div>
      )}

      {!cancelled && (
        <ol className="mt-12 grid grid-cols-5 gap-2 text-center text-xs sm:text-sm" aria-label="Andamento do pedido">
          {STEPS.map(([key, label], i) => (
            <li key={key} aria-current={i === stepIndex ? "step" : undefined}>
              <div className={cn("mx-auto h-2 rounded-full", i <= stepIndex ? "bg-olive" : "bg-beige")} />
              <span className={cn("mt-2 block", i <= stepIndex ? "font-medium" : "text-coffee/70")}>{label}</span>
            </li>
          ))}
        </ol>
      )}

      <section className="mt-12 rounded-[2rem] bg-white p-6 shadow-soft sm:p-8" aria-label="Itens do pedido">
        <ul className="divide-y divide-beige">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-3">
              <span>{i.quantity}× {i.productName}</span>
              <span>{formatBRL(i.unitPriceCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-beige pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-coffee/70">Subtotal</dt><dd>{formatBRL(order.subtotalCents)}</dd></div>
          {order.discountCents > 0 && (
            <div className="flex justify-between text-olive"><dt>Desconto{order.coupon ? ` (${order.coupon.code})` : ""}</dt><dd>− {formatBRL(order.discountCents)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-coffee/70">Entrega</dt><dd>{order.deliveryFeeCents ? formatBRL(order.deliveryFeeCents) : "Grátis"}</dd></div>
          <div className="flex items-baseline justify-between border-t border-beige pt-3"><dt className="font-medium">Total</dt><dd className="font-display text-2xl">{formatBRL(order.totalCents)}</dd></div>
        </dl>
        {order.address && (
          <p className="mt-6 text-sm text-coffee/70">
            Entrega em {order.address.street}, {order.address.number} — {order.address.neighborhood}, {order.address.city}/{order.address.state}
          </p>
        )}
        {order.notes && <p className="mt-3 text-sm text-coffee/70">Observações: {order.notes}</p>}
      </section>

      <p className="mt-8 text-center">
        <Link href="/conta" className="underline hover:text-caramel-deep">Ver todos os meus pedidos</Link>
      </p>
    </>
  );
}

export default function PedidoPage(props: Props) {
  return (
    <div className="min-h-[100svh] mx-auto max-w-2xl px-6 pb-24 pt-32">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-beige/70" aria-busy />}>
        <Order {...props} />
      </Suspense>
    </div>
  );
}
