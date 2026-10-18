"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { formatBRL } from "@/lib/money";
import { AddToCartButton } from "./add-to-cart-button";

interface Props {
  product: { id: string; slug: string; name: string; priceCents: number };
  available: boolean;
}

export function ProductPurchase({ product, available }: Props) {
  const [qty, setQty] = useState(1);
  return (
    <div className="space-y-5">
      <p className="font-display text-4xl">{formatBRL(product.priceCents * qty)}</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center rounded-full border border-beige bg-white">
          <button
            aria-label="Diminuir quantidade"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="p-3.5 hover:text-caramel"
          >
            <Minus size={16} />
          </button>
          <span className="w-8 text-center" aria-live="polite">{qty}</span>
          <button
            aria-label="Aumentar quantidade"
            onClick={() => setQty((q) => Math.min(20, q + 1))}
            className="p-3.5 hover:text-caramel"
          >
            <Plus size={16} />
          </button>
        </div>
        <AddToCartButton product={product} quantity={qty} disabled={!available} className="flex-1 sm:flex-none" />
      </div>
      {!available && <p className="text-sm text-coffee/60">Este produto está indisponível no momento.</p>}
    </div>
  );
}
