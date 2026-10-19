"use client";

import { AnimatePresence, motion } from "motion/react";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/cart/cart-provider";

const links = [
  { href: "/cardapio", label: "Cardápio" },
  { href: "/#historia", label: "Nossa história" },
  { href: "/#combos", label: "Combos" },
  { href: "/#visite", label: "Visite" },
];

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { count, pulse, open } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || !isHome || menuOpen;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        solid ? "bg-cream/90 text-coffee shadow-soft backdrop-blur-md" : "bg-transparent text-white",
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-baseline gap-2" aria-label="Maison du Pain — início">
          <motion.span
            className="font-display text-2xl tracking-tight"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Maison <span className={cn("font-editorial italic", solid ? "text-caramel-deep" : "text-caramel")}>du</span> Pain
          </motion.span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group relative text-sm font-medium tracking-wide"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-caramel transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/entrar"
            className="hidden rounded-full p-3 transition hover:bg-caramel/20 sm:block"
            aria-label="Entrar na sua conta"
          >
            <User size={20} />
          </Link>
          <button
            onClick={open}
            className="relative rounded-full p-3 transition hover:bg-caramel/20"
            aria-label={`Abrir carrinho, ${count} ${count === 1 ? "item" : "itens"}`}
          >
            <motion.span
              key={pulse}
              className="block"
              animate={pulse ? { scale: [1, 1.3, 1], rotate: [0, -10, 0] } : undefined}
              transition={{ duration: 0.4 }}
            >
              <ShoppingBag size={20} />
            </motion.span>
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-caramel-deep px-1 text-[11px] font-semibold text-white"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            className="rounded-full p-3 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            aria-label="Menu móvel"
            className="overflow-hidden border-t border-beige bg-cream md:hidden"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <ul className="space-y-1 px-6 py-6">
              {[...links, { href: "/entrar", label: "Entrar" }].map((l, i) => (
                <motion.li
                  key={l.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-3 font-display text-2xl text-coffee"
                  >
                    {l.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
