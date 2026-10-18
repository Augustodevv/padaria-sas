import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, PageHeader, tableCls } from "@/components/admin/ui";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { requirePermission } from "@/server/auth/guards";
import { listCustomers } from "@/server/repositories/admin";

export const metadata: Metadata = { title: "Clientes" };

type Props = { searchParams: Promise<{ q?: string }> };
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

async function Customers({ searchParams }: Props) {
  await requirePermission("customer:read", "/admin/clientes");
  const { q = "" } = await searchParams;
  const rows = await listCustomers(q.slice(0, 80));

  return (
    <>
      <PageHeader title="Clientes" subtitle="Ordenados por quanto já compraram (pedidos confirmados em diante)." />
      <form action="/admin/clientes" className="mb-5 flex gap-2">
        <label htmlFor="q" className="sr-only">Buscar cliente</label>
        <input id="q" name="q" defaultValue={q} placeholder="Nome ou email" className="w-64 rounded-lg border border-beige bg-white px-3 py-2 text-sm" />
        <button className="rounded-lg border border-coffee/30 px-3 py-2 text-sm hover:bg-beige/50">Buscar</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState>Nenhum cliente encontrado.</EmptyState>
      ) : (
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <thead>
              <tr>
                <th className={tableCls.th}>Cliente</th>
                <th className={tableCls.th}>Cadastro</th>
                <th className={cn(tableCls.th, "text-right")}>Pedidos</th>
                <th className={cn(tableCls.th, "text-right")}>Total gasto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-cream/40">
                  <td className={tableCls.td}>
                    <Link href={`/admin/clientes/${c.id}`} className="font-medium hover:underline">{c.name}</Link>
                    <span className="block text-xs text-coffee/60">{c.email}</span>
                  </td>
                  <td className={tableCls.td}>{date.format(c.createdAt)}</td>
                  <td className={cn(tableCls.td, "text-right tabular-nums")}>{c.orders}</td>
                  <td className={cn(tableCls.td, "text-right tabular-nums")}>{formatBRL(Number(c.spent))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function ClientesPage(props: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-beige/50" aria-busy />}>
      <Customers {...props} />
    </Suspense>
  );
}
