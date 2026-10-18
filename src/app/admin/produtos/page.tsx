import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { EmptyState, LinkButton, PageHeader, tableCls } from "@/components/admin/ui";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toggleProductArchivedAction, toggleProductAvailableAction } from "@/server/actions/admin";
import { requirePermission } from "@/server/auth/guards";
import { can } from "@/server/auth/policies";
import { listAdminProducts } from "@/server/repositories/admin";

export const metadata: Metadata = { title: "Produtos" };

type Props = { searchParams: Promise<{ q?: string; status?: string; salvo?: string }> };
const TABS = [["active", "Ativos"], ["archived", "Arquivados"], ["all", "Todos"]] as const;

const pill = (tone: "olive" | "amber" | "muted" | "caramel") =>
  cn(
    "rounded-full px-2 py-0.5 text-xs font-medium",
    tone === "olive" && "bg-olive/10 text-olive",
    tone === "amber" && "bg-amber-50 text-amber-900",
    tone === "muted" && "bg-beige/70 text-coffee/70",
    tone === "caramel" && "bg-[#f3e4d3] text-[#7a4a22]",
  );

async function Products({ searchParams }: Props) {
  const user = await requirePermission("admin:access", "/admin/produtos");
  const sp = await searchParams;
  const status = TABS.some(([k]) => k === sp.status) ? (sp.status as "active" | "archived" | "all") : "active";
  const products = await listAdminProducts({ q: sp.q?.slice(0, 80), status });
  const canManage = can(user, "product:manage");

  return (
    <>
      <PageHeader
        title="Produtos"
        subtitle={`${products.length} ${products.length === 1 ? "produto" : "produtos"}`}
        actions={canManage ? <LinkButton href="/admin/produtos/novo">Novo produto</LinkButton> : undefined}
      />

      {sp.salvo && <p role="status" className="mb-5 rounded-lg bg-olive/10 px-4 py-3 text-sm text-olive">Produto salvo.</p>}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Filtrar" className="flex gap-2">
          {TABS.map(([k, label]) => (
            <Link
              key={k}
              href={`/admin/produtos?status=${k}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}
              aria-current={k === status ? "true" : undefined}
              className={cn("rounded-full border px-3.5 py-1.5 text-sm", k === status ? "border-coffee bg-coffee text-cream" : "border-beige bg-white hover:border-caramel")}
            >
              {label}
            </Link>
          ))}
        </div>
        <form action="/admin/produtos" className="flex gap-2">
          <input type="hidden" name="status" value={status} />
          <label htmlFor="q" className="sr-only">Buscar produto</label>
          <input id="q" name="q" defaultValue={sp.q} placeholder="Buscar por nome" className="w-48 rounded-lg border border-beige bg-white px-3 py-2 text-sm" />
          <button className="rounded-lg border border-coffee/30 px-3 py-2 text-sm hover:bg-beige/50">Buscar</button>
        </form>
      </div>

      {products.length === 0 ? (
        <EmptyState>Nenhum produto encontrado.</EmptyState>
      ) : (
        <div className={tableCls.wrap}>
          <table className={tableCls.table}>
            <thead>
              <tr>
                <th className={tableCls.th}>Produto</th>
                <th className={tableCls.th}>Categoria</th>
                <th className={cn(tableCls.th, "text-right")}>Preço</th>
                <th className={tableCls.th}>Situação</th>
                {canManage && <th className={tableCls.th}><span className="sr-only">Ações</span></th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={cn("hover:bg-cream/40", p.archivedAt && "opacity-60")}>
                  <td className={tableCls.td}>
                    <span className="font-medium">{p.name}</span>
                  </td>
                  <td className={tableCls.td}>{p.category.name}</td>
                  <td className={cn(tableCls.td, "text-right tabular-nums")}>{formatBRL(p.priceCents)}</td>
                  <td className={tableCls.td}>
                    <div className="flex flex-wrap gap-1.5">
                      {p.archivedAt ? <span className={pill("muted")}>Arquivado</span> : p.isAvailable ? <span className={pill("olive")}>Disponível</span> : <span className={pill("amber")}>Indisponível</span>}
                      {p.isFeatured && !p.archivedAt && <span className={pill("caramel")}>Destaque</span>}
                    </div>
                  </td>
                  {canManage && (
                    <td className={cn(tableCls.td, "whitespace-nowrap text-right")}>
                      <div className="flex items-center justify-end gap-3 text-sm">
                        {!p.archivedAt && <Link href={`/admin/produtos/${p.id}`} className="underline">Editar</Link>}
                        {!p.archivedAt && (
                          <form action={toggleProductAvailableAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="available" value={p.isAvailable ? "0" : "1"} />
                            <button className="underline">{p.isAvailable ? "Pausar" : "Reativar"}</button>
                          </form>
                        )}
                        <form action={toggleProductArchivedAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="archive" value={p.archivedAt ? "0" : "1"} />
                          <ConfirmSubmit message={p.archivedAt ? "Restaurar este produto?" : "Arquivar este produto? Ele some da loja, mas os pedidos antigos continuam intactos."} className="underline">
                            {p.archivedAt ? "Restaurar" : "Arquivar"}
                          </ConfirmSubmit>
                        </form>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function ProdutosPage(props: Props) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-beige/50" aria-busy />}>
      <Products {...props} />
    </Suspense>
  );
}
