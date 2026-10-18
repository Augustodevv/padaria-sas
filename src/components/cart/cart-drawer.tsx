"use client";

import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { formatBRL } from "@/lib/money";
import { useCart } from "./cart-provider";

export function CartDrawer() {
  const { isOpen, close, lines, subtotalCents, setQuantity, remove } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            className="fixed inset-0 z-[60] bg-coffee/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            aria-hidden
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label="Carrinho de compras"
            className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col bg-cream shadow-lift"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
          >
            <header className="flex items-center justify-between border-b border-beige px-6 py-5">
              <h2 className="font-display text-2xl">Seu carrinho</h2>
              <button
                onClick={close}
                aria-label="Fechar carrinho"
                className="rounded-full p-2 transition hover:bg-beige"
              >
                <X size={20} />
              </button>
            </header>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <ShoppingBag size={40} className="text-caramel" />
                <p className="font-editorial text-2xl italic">Seu carrinho está vazio</p>
                <Link
                  href="/cardapio"
                  onClick={close}
                  className="rounded-full bg-coffee px-6 py-3 text-sm font-medium text-cream transition hover:bg-coffee/90"
                >
                  Explorar cardápio
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-beige overflow-y-auto px-6">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => (
                      <motion.li
                        key={l.productId}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex gap-4 py-5">
                          <div className="flex-1">
                            <Link
                              href={`/produto/${l.slug}`}
                              onClick={close}
                              className="font-medium hover:text-caramel"
                            >
                              {l.name}
                            </Link>
                            <p className="mt-1 text-sm text-coffee/60">{formatBRL(l.priceCents)}</p>
                            <div className="mt-3 flex items-center gap-3">
                              <div className="flex items-center rounded-full border border-beige">
                                <button
                                  aria-label={`Diminuir quantidade de ${l.name}`}
                                  onClick={() => setQuantity(l.productId, l.quantity - 1)}
                                  className="p-2 hover:text-caramel"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="w-6 text-center text-sm" aria-live="polite">
                                  {l.quantity}
                                </span>
                                <button
                                  aria-label={`Aumentar quantidade de ${l.name}`}
                                  onClick={() => setQuantity(l.productId, l.quantity + 1)}
                                  className="p-2 hover:text-caramel"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              <button
                                aria-label={`Remover ${l.name}`}
                                onClick={() => remove(l.productId)}
                                className="p-2 text-coffee/50 transition hover:text-red-700"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <p className="font-medium">{formatBRL(l.priceCents * l.quantity)}</p>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                <footer className="space-y-4 border-t border-beige px-6 py-5">
                  <div className="flex items-center justify-between">
                    <span className="text-coffee/70">Subtotal</span>
                    <span className="font-display text-2xl">{formatBRL(subtotalCents)}</span>
                  </div>
                  <p className="text-xs text-coffee/50">
                    Cupons, entrega e valor final são calculados no checkout.
                  </p>
                  <Link
                    href="/checkout"
                    onClick={close}
                    className="block rounded-full bg-coffee py-4 text-center font-medium text-cream transition hover:bg-caramel"
                  >
                    Finalizar pedido
                  </Link>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
