import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, LinkButton, PageHeader, tableCls } from "@/components/admin/ui";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toggleCouponAction } from "@/server/actions/admin";
import { requirePermission } from "@/server/auth/guards";
import { listCoupons } from "@/server/repositories/admin";

export const metadata: Metadata = { title: "Cupons" };

const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

async function Coupons({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  await requirePermission("coupon:manage", "/admin/cupons");
  const [coupons, sp] = await Promise.all([listCoupons(), searchParams]);
  const now = new Date();

  return (
    <>
      <PageHeader title="Cupons" actions={<LinkButton href="/admin/cupons/novo">Novo cupom</LinkButton>} />
      {sp.salvo && <p role="status" className="mb-5 rounded-lg bg-olive/10 px-4 py-3 text-sm text-olive">Cupom salvo.</p>}

      {coupons.length === 0 ? (
        <EmptyState>Nenhum cupom criado.</EmptyState>
      ) : (
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <thead>
              <tr>
                <th className={tableCls.th}>Código</th>
                <th className={tableCls.th}>Desconto</th>
                <th className={tableCls.th}>Mínimo</th>
                <th className={tableCls.th}>Usos</th>
                <th className={tableCls.th}>Validade</th>
                <th className={tableCls.th}>Situação</th>
                <th className={tableCls.th}><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const expired = !!c.validUntil && c.validUntil < now;
                const exhausted = c.maxUses !== null && c.usedCount >= c.maxUses;
                const label = !c.isActive ? "Inativo" : expired ? "Expirado" : exhausted ? "Esgotado" : "Ativo";
                return (
                  <tr key={c.id} className="hover:bg-cream/40">
                    <td className={cn(tableCls.td, "font-mono font-medium")}>{c.code}</td>
                    <td className={tableCls.td}>{c.discountType === "PERCENT" ? `${c.discountValue}%` : formatBRL(c.discountValue)}</td>
                    <td className={tableCls.td}>{c.minOrderCents ? formatBRL(c.minOrderCents) : "—"}</td>
                    <td className={cn(tableCls.td, "tabular-nums")}>{c.usedCount}{c.maxUses !== null ? ` / ${c.maxUses}` : ""}</td>
                    <td className={tableCls.td}>{c.validUntil ? date.format(c.validUntil) : "Sem prazo"}</td>
                    <td className={tableCls.td}>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", label === "Ativo" ? "bg-olive/10 text-olive" : "bg-beige/70 text-coffee/70")}>{label}</span>
                    </td>
                    <td className={cn(tableCls.td, "whitespace-nowrap text-right text-sm")}>
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/admin/cupons/${c.id}`} className="underline">Editar</Link>
                        <form action={toggleCouponAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="active" value={c.isActive ? "0" : "1"} />
                          <button className="underline">{c.isActive ? "Desativar" : "Ativar"}</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function CuponsPage(props: { searchParams: Promise<{ salvo?: string }> }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-beige/50" aria-busy />}>
      <Coupons {...props} />
    </Suspense>
  );
}
