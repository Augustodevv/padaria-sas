"use client";

import { BarChart3, Package, Receipt, Settings, Tag, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Dashboard", icon: BarChart3, exact: true },
  { href: "/admin/pedidos", label: "Pedidos", icon: Receipt },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/cupons", label: "Cupons", icon: Tag, admin: true },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, admin: true },
];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Painel" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {items
        .filter((i) => !i.admin || isAdmin)
        .map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-cream text-coffee" : "text-cream/75 hover:bg-cream/10 hover:text-cream",
              )}
            >
              <Icon size={18} aria-hidden />
              {label}
            </Link>
          );
        })}
    </nav>
  );
}
