import Link from "next/link";
import { Suspense } from "react";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { TopProducts } from "@/components/admin/top-products";
import { Card, PageHeader, StatCard, StatusBadge, tableCls } from "@/components/admin/ui";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { requirePermission } from "@/server/auth/guards";
import { getDashboard } from "@/server/repositories/admin";
import { averageTicket, parsePeriod, percentChange, PERIODS } from "@/server/services/reports";

type Props = { searchParams: Promise<{ dias?: string }> };

async function Dashboard({ searchParams }: Props) {
  await requirePermission("report:read", "/admin");
  const days = parsePeriod((await searchParams).dias);
  const d = await getDashboard(days);

  const ticket = averageTicket(d.revenueCents, d.orders);
  const prevTicket = averageTicket(d.prevRevenueCents, d.prevOrders);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Últimos ${days} dias · só pedidos confirmados em diante contam como venda`}
        actions={
          <div role="group" aria-label="Período" className="inline-flex rounded-lg border border-beige bg-white p-1 text-sm">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/admin?dias=${p}`}
                aria-current={p === days ? "true" : undefined}
                className={cn("rounded-md px-3 py-1.5", p === days ? "bg-coffee text-cream" : "hover:bg-beige/50")}
              >
                {p} dias
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Faturamento" value={formatBRL(d.revenueCents)} delta={percentChange(d.revenueCents, d.prevRevenueCents)} hint={`vs ${days} dias anteriores`} />
        <StatCard label="Pedidos" value={d.orders.toLocaleString("pt-BR")} delta={percentChange(d.orders, d.prevOrders)} />
        <StatCard label="Ticket médio" value={formatBRL(ticket)} delta={percentChange(ticket, prevTicket)} />
        <StatCard label="Na fila" value={`${d.toPrepare}`} hint={`${d.pendingPayment} aguardando pagamento`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <RevenueChart data={d.series} />
        </Card>
        <Card title="Mais vendidos">
          <TopProducts rows={d.top} />
        </Card>
      </div>

      <Card title="Pedidos recentes" className="mt-6" action={<Link href="/admin/pedidos" className="text-sm underline">Ver todos</Link>}>
        {d.recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-coffee/60">Ainda não há pedidos.</p>
        ) : (
          <div className={tableCls.wrap}>
            <table className={tableCls.table}>
              <thead>
                <tr>
                  <th className={tableCls.th}>Pedido</th>
                  <th className={tableCls.th}>Cliente</th>
                  <th className={tableCls.th}>Status</th>
                  <th className={cn(tableCls.th, "text-right")}>Total</th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map((o) => (
                  <tr key={o.id} className="hover:bg-cream/40">
                    <td className={tableCls.td}>
                      <Link href={`/admin/pedidos/${o.id}`} className="font-medium underline-offset-2 hover:underline">#{o.number}</Link>
                    </td>
                    <td className={tableCls.td}>{o.user.name}</td>
                    <td className={tableCls.td}><StatusBadge status={o.status} /></td>
                    <td className={cn(tableCls.td, "text-right tabular-nums")}>{formatBRL(o.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

export default function AdminHome(props: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-beige/50" aria-busy />}>
      <Dashboard {...props} />
    </Suspense>
  );
}
