import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { formatBRL } from "@/lib/money";
import { logoutAction } from "@/server/actions/auth";
import { requireUser } from "@/server/auth/guards";
import { hasRole } from "@/server/auth/policies";
import { listOrdersByUser } from "@/server/repositories/orders";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false } };

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  CONFIRMED: "Confirmado",
  PREPARING: "Em preparo",
  READY: "Pronto",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

async function Account() {
  // A proteção é feita no servidor; o cliente nunca decide quem entra aqui.
  const user = await requireUser("/conta");
  const orders = await listOrdersByUser(user.id);
  return (
    <>
      <h1 className="font-display text-4xl">Olá, {user.name.split(" ")[0]}</h1>
      <p className="mt-2 text-coffee/70">{user.email}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        {hasRole(user, "STAFF") && (
          <Link href="/admin" className="rounded-full bg-coffee px-6 py-3 text-sm font-medium text-cream hover:bg-caramel">
            Abrir painel
          </Link>
        )}
        <form action={logoutAction}>
          <button className="rounded-full border border-coffee px-6 py-3 text-sm font-medium hover:bg-coffee hover:text-cream">
            Sair
          </button>
        </form>
      </div>
      <section className="mt-12" aria-labelledby="h-pedidos">
        <h2 id="h-pedidos" className="font-display text-2xl">Meus pedidos</h2>
        {orders.length === 0 ? (
          <p className="mt-3 text-coffee/60">
            Você ainda não fez pedidos.{" "}
            <Link href="/cardapio" className="underline hover:text-caramel">Ver cardápio</Link>
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-beige rounded-2xl bg-white shadow-soft">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/pedido/${o.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-beige/40">
                  <span>
                    <span className="font-medium">Pedido #{o.number}</span>
                    <span className="block text-sm text-coffee/60">
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(o.createdAt)}
                      {" · "}
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </span>
                  <span className="font-display text-lg">{formatBRL(o.totalCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function ContaPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-32">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-card bg-beige/70" aria-busy />}>
        <Account />
      </Suspense>
    </div>
  );
}
