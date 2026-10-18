"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/cart/cart-provider";

interface Props {
  product: { id: string; slug: string; name: string; priceCents: number };
  quantity?: number;
  disabled?: boolean;
  variant?: "icon" | "full";
  className?: string;
}

export function AddToCartButton({ product, quantity = 1, disabled, variant = "full", className }: Props) {
  const { add } = useCart();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1400);
    return () => clearTimeout(t);
  }, [done]);

  function handle() {
    add({ productId: product.id, slug: product.slug, name: product.name, priceCents: product.priceCents }, quantity);
    setDone(true);
  }

  const label = disabled ? "Indisponível" : done ? "Adicionado" : "Adicionar ao carrinho";

  return (
    <motion.button
      type="button"
      onClick={handle}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      aria-label={variant === "icon" ? `Adicionar ${product.name} ao carrinho` : undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        done ? "bg-olive text-white" : "bg-coffee text-cream hover:bg-caramel",
        variant === "icon" ? "h-11 w-11" : "px-6 py-3.5 text-sm",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={done ? "ok" : "add"}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2"
        >
          {done ? <Check size={18} /> : <Plus size={18} />}
          {variant === "full" && label}
        </motion.span>
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">{done ? `${product.name} adicionado ao carrinho` : ""}</span>
    </motion.button>
  );
}
