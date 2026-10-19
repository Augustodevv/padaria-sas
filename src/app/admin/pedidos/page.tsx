import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHeader, StatusBadge, tableCls } from "@/components/admin/ui";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { requirePermission } from "@/server/auth/guards";
import { listOrders } from "@/server/repositories/admin";
import { STATUS_LABEL } from "@/server/services/order-transitions";
import type { OrderStatus } from "@/server/services/payment-status";
import { formatSlot } from "@/server/services/schedule";

export const metadata: Metadata = { title: "Pedidos" };

type Props = { searchParams: Promise<{ status?: string; n?: string; page?: string }> };

const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];

function href(p: { status?: string; n?: string; page?: number }) {
  const sp = new URLSearchParams();
  if (p.status) sp.set("status", p.status);
  if (p.n) sp.set("n", p.n);
  if (p.page && p.page > 1) sp.set("page", String(p.page));
  const qs = sp.toString();
  return `/admin/pedidos${qs ? `?${qs}` : ""}`;
}

async function Orders({ searchParams }: Props) {
  await requirePermission("order:read-any", "/admin/pedidos");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const number = /^\d{1,9}$/.test(sp.n ?? "") ? Number(sp.n) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, pages } = await listOrders({ status, number, page });

  return (
    <>
      <PageHeader title="Pedidos" subtitle={`${total} ${total === 1 ? "pedido" : "pedidos"}`} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-2">
          {[undefined, ...STATUSES].map((s) => (
            <Link
              key={s ?? "todos"}
              href={href({ status: s, n: sp.n })}
              aria-current={s === status ? "true" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition",
                s === status ? "border-coffee bg-coffee text-cream" : "border-beige bg-white hover:border-caramel",
              )}
            >
              {s ? STATUS_LABEL[s] : "Todos"}
            </Link>
          ))}
        </div>
        <form action="/admin/pedidos" className="flex gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="n" className="sr-only">Número do pedido</label>
          <input id="n" name="n" defaultValue={sp.n} inputMode="numeric" placeholder="Nº do pedido" className="w-36 rounded-lg border border-beige bg-white px-3 py-2 text-sm" />
          <button className="rounded-lg border border-coffee/30 px-3 py-2 text-sm hover:bg-beige/50">Buscar</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState>Nenhum pedido encontrado com esses filtros.</EmptyState>
      ) : (
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <thead>
              <tr>
                <th className={tableCls.th}>Pedido</th>
                <th className={tableCls.th}>Cliente</th>
                <th className={tableCls.th}>Status</th>
                <th className={tableCls.th}>Retirada / entrega</th>
                <th className={cn(tableCls.th, "text-right")}>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-cream/40">
                  <td className={tableCls.td}>
                    <Link href={`/admin/pedidos/${o.id}`} className="font-medium hover:underline">#{o.number}</Link>
                  </td>
                  <td className={tableCls.td}>{o.user.name}</td>
                  <td className={tableCls.td}><StatusBadge status={o.status} /></td>
                  <td className={tableCls.td}>
                    {o.fulfillment === "PICKUP" ? "Retirada" : "Entrega"}
                    {o.scheduledFor && <span className="text-coffee/70"> · {formatSlot(o.scheduledFor)}</span>}
                  </td>
                  <td className={cn(tableCls.td, "text-right tabular-nums")}>{formatBRL(o.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Paginação" className="mt-5 flex items-center justify-center gap-4 text-sm">
          {page > 1 ? <Link href={href({ status, n: sp.n, page: page - 1 })} className="underline">← Anterior</Link> : <span />}
          <span className="text-coffee/70">Página {page} de {pages}</span>
          {page < pages ? <Link href={href({ status, n: sp.n, page: page + 1 })} className="underline">Próxima →</Link> : <span />}
        </nav>
      )}
    </>
  );
}

export default function PedidosPage(props: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-beige/50" aria-busy />}>
      <Orders {...props} />
    </Suspense>
  );
}
