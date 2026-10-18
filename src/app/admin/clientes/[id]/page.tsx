import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, PageHeader, StatusBadge, tableCls } from "@/components/admin/ui";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { requirePermission } from "@/server/auth/guards";
import { getCustomer } from "@/server/repositories/admin";
import { REVENUE_STATUSES } from "@/server/services/order-transitions";

export const metadata: Metadata = { title: "Cliente" };

const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

async function Customer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("customer:read", `/admin/clientes/${id}`);
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const valid = customer.orders.filter((o) => REVENUE_STATUSES.includes(o.status));
  const spent = valid.reduce((s, o) => s + o.totalCents, 0);

  return (
    <>
      <PageHeader title={customer.name} subtitle={`Cliente desde ${date.format(customer.createdAt)}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card title="Contato">
          <p className="text-sm">{customer.email}</p>
          {customer.phone && <p className="text-sm text-coffee/70">{customer.phone}</p>}
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-beige pt-4 text-sm">
            <div><dt className="text-coffee/60">Pedidos</dt><dd className="font-display text-2xl">{valid.length}</dd></div>
            <div><dt className="text-coffee/60">Total gasto</dt><dd className="font-display text-2xl">{formatBRL(spent)}</dd></div>
          </dl>
        </Card>

        <Card title="Histórico de pedidos">
          {customer.orders.length === 0 ? (
            <p className="text-sm text-coffee/60">Este cliente ainda não fez pedidos.</p>
          ) : (
            <div className={tableCls.wrap}>
              <table className={tableCls.table}>
                <thead>
                  <tr>
                    <th className={tableCls.th}>Pedido</th>
                    <th className={tableCls.th}>Data</th>
                    <th className={tableCls.th}>Status</th>
                    <th className={cn(tableCls.th, "text-right")}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((o) => (
                    <tr key={o.id} className="hover:bg-cream/40">
                      <td className={tableCls.td}><Link href={`/admin/pedidos/${o.id}`} className="font-medium hover:underline">#{o.number}</Link></td>
                      <td className={tableCls.td}>{date.format(o.createdAt)}</td>
                      <td className={tableCls.td}><StatusBadge status={o.status} /></td>
                      <td className={cn(tableCls.td, "text-right tabular-nums")}>{formatBRL(o.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      <p className="mt-8"><Link href="/admin/clientes" className="text-sm underline">← Voltar para clientes</Link></p>
    </>
  );
}

export default function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-beige/50" aria-busy />}>
      <Customer params={params} />
    </Suspense>
  );
}
