import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { logoutAction } from "@/server/actions/auth";
import { requireRole } from "@/server/auth/guards";
import { hasRole } from "@/server/auth/policies";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s | Painel Maison du Pain" },
  robots: { index: false, follow: false },
};

async function Shell({ children }: { children: React.ReactNode }) {
  // Primeira barreira; cada página e cada Server Action conferem a permissão de novo.
  const user = await requireRole("STAFF", "/admin");
  return (
    <div className="min-h-screen bg-[#fbf8f3] lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="bg-coffee px-4 py-4 text-cream lg:sticky lg:top-0 lg:h-screen lg:py-6">
        <div className="mb-4 flex items-center justify-between lg:mb-8 lg:block">
          <Link href="/admin" className="font-display text-xl">
            Maison <span className="font-editorial italic text-caramel">du</span> Pain
            <span className="mt-0.5 hidden text-xs font-sans uppercase tracking-widest text-cream/60 lg:block">Painel</span>
          </Link>
          <div className="flex items-center gap-4 text-xs lg:hidden">
            <Link href="/" className="underline">Ver loja</Link>
            <form action={logoutAction}>
              <button className="underline">Sair</button>
            </form>
          </div>
        </div>
        <AdminNav isAdmin={hasRole(user, "ADMIN")} />
        <div className="mt-8 hidden border-t border-cream/10 pt-4 text-sm lg:block">
          <p className="truncate font-medium">{user.name}</p>
          <p className="text-xs text-cream/60">{user.role === "ADMIN" ? "Administrador" : "Funcionário"}</p>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <Link href="/" className="underline hover:text-caramel">Ver loja</Link>
            <form action={logoutAction}>
              <button className="underline hover:text-caramel">Sair</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 lg:py-10">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbf8f3]" aria-busy />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
