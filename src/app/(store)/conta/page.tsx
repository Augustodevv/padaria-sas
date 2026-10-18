import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { logoutAction } from "@/server/actions/auth";
import { requireUser } from "@/server/auth/guards";
import { hasRole } from "@/server/auth/policies";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false } };

async function Account() {
  // A proteção é feita no servidor; o cliente nunca decide quem entra aqui.
  const user = await requireUser("/conta");
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
      <p className="mt-10 text-sm text-coffee/50">Pedidos, endereços e favoritos chegam na Fase 4.</p>
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
