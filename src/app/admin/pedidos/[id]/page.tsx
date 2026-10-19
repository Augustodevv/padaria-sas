import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { Card, PageHeader, StatusBadge } from "@/components/admin/ui";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { updateOrderStatusAction } from "@/server/actions/admin";
import { requirePermission } from "@/server/auth/guards";
import { getAdminOrder, getOrderAudit } from "@/server/repositories/admin";
import { ACTION_LABEL, allowedTransitions, STATUS_LABEL } from "@/server/services/order-transitions";
import type { OrderStatus } from "@/server/services/payment-status";
import { formatSlot } from "@/server/services/schedule";

export const metadata: Metadata = { title: "Pedido" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> };

async function OrderDetail({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await requirePermission("order:read-any", `/admin/pedidos/${id}`);
  const [order, audit] = await Promise.all([getAdminOrder(id), getOrderAudit(id)]);
  if (!order) notFound();

  const next = allowedTransitions(order.status as OrderStatus).filter((s) => s !== "PENDING_PAYMENT");
  const payment = order.payments[0];

  return (
    <>
      <PageHeader
        title={`Pedido #${order.number}`}
        subtitle={`${order.fulfillment === "PICKUP" ? "Retirada" : "Entrega"}${order.scheduledFor ? ` · ${formatSlot(order.scheduledFor)}` : ""}`}
        actions={<StatusBadge status={order.status} />}
      />

      {sp.ok && <p role="status" className="mb-5 rounded-lg bg-olive/10 px-4 py-3 text-sm text-olive">Status atualizado.</p>}
      {sp.erro && <p role="alert" className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">Essa mudança de status não é permitida para o estado atual do pedido.</p>}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card title="Itens">
            <ul className="divide-y divide-beige text-sm">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-2.5">
                  <span>{i.quantity}× {i.productName}</span>
                  <span className="tabular-nums">{formatBRL(i.unitPriceCents * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-beige pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-coffee/70">Subtotal</dt><dd className="tabular-nums">{formatBRL(order.subtotalCents)}</dd></div>
              {order.discountCents > 0 && (
                <div className="flex justify-between text-olive"><dt>Desconto{order.coupon ? ` (${order.coupon.code})` : ""}</dt><dd className="tabular-nums">− {formatBRL(order.discountCents)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-coffee/70">Entrega</dt><dd className="tabular-nums">{formatBRL(order.deliveryFeeCents)}</dd></div>
              <div className="flex justify-between border-t border-beige pt-2 font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatBRL(order.totalCents)}</dd></div>
            </dl>
          </Card>

          <Card title="Histórico">
            {audit.length === 0 ? (
              <p className="text-sm text-coffee/70">Sem alterações feitas pela equipe.</p>
            ) : (
              <ol className="space-y-3 text-sm">
                {audit.map((a) => {
                  const m = (a.metadata ?? {}) as { from?: OrderStatus; to?: OrderStatus; manualConfirmation?: boolean; refundPending?: boolean; couponReleased?: boolean };
                  return (
                    <li key={a.id}>
                      <p>
                        <span className="font-medium">{a.user?.name ?? "Sistema"}</span>{" "}
                        {m.from && m.to ? <>mudou de {STATUS_LABEL[m.from]} para <strong>{STATUS_LABEL[m.to]}</strong></> : a.action}
                      </p>
                      <p className="text-xs text-coffee/70">
                        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(a.createdAt)}
                        {m.manualConfirmation && " · confirmação manual (sem pagamento online)"}
                        {m.couponReleased && " · cupom devolvido"}
                        {m.refundPending && " · pagamento aprovado: reembolso pendente no Mercado Pago"}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Ações">
            {next.length === 0 ? (
              <p className="text-sm text-coffee/70">Pedido finalizado: não há mais ações.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {next.map((to) => (
                  <form key={to} action={updateOrderStatusAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="to" value={to} />
                    <ConfirmSubmit
                      message={
                        to === "CANCELLED"
                          ? "Cancelar este pedido? O cupom usado será devolvido."
                          : to === "CONFIRMED"
                            ? "Confirmar sem pagamento online? Fica registrado em auditoria."
                            : `${ACTION_LABEL[to]}?`
                      }
                      className={cn(
                        "w-full rounded-lg px-4 py-2.5 text-sm font-medium transition",
                        to === "CANCELLED" ? "border border-red-300 text-red-800 hover:bg-red-50" : "bg-coffee text-cream hover:bg-coffee/90",
                      )}
                    >
                      {ACTION_LABEL[to]}
                    </ConfirmSubmit>
                  </form>
                ))}
              </div>
            )}
          </Card>

          <Card title="Cliente">
            <p className="font-medium">
              <Link href={`/admin/clientes/${order.user.id}`} className="hover:underline">{order.user.name}</Link>
            </p>
            <p className="text-sm text-coffee/70">{order.user.email}</p>
            {order.user.phone && <p className="text-sm text-coffee/70">{order.user.phone}</p>}
            {order.address && (
              <p className="mt-3 text-sm">
                {order.address.street}, {order.address.number}{order.address.complement ? ` — ${order.address.complement}` : ""}
                <br />
                {order.address.neighborhood}, {order.address.city}/{order.address.state} · {order.address.zipCode}
              </p>
            )}
            {order.notes && <p className="mt-3 rounded-lg bg-cream p-3 text-sm">“{order.notes}”</p>}
          </Card>

          <Card title="Pagamento">
            {payment ? (
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-coffee/70">Status</dt><dd>{payment.status}</dd></div>
                <div className="flex justify-between"><dt className="text-coffee/70">Valor</dt><dd className="tabular-nums">{formatBRL(payment.amountCents)}</dd></div>
                <div className="flex justify-between"><dt className="text-coffee/70">Provedor</dt><dd>{payment.provider}</dd></div>
                {payment.providerId && <div className="flex justify-between gap-3"><dt className="text-coffee/70">ID</dt><dd className="truncate">{payment.providerId}</dd></div>}
              </dl>
            ) : (
              <p className="text-sm text-coffee/70">Sem registro de pagamento.</p>
            )}
          </Card>
        </div>
      </div>

      <p className="mt-8"><Link href="/admin/pedidos" className="text-sm underline">← Voltar para pedidos</Link></p>
    </>
  );
}

export default function PedidoAdminPage(props: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-beige/50" aria-busy />}>
      <OrderDetail {...props} />
    </Suspense>
  );
}
