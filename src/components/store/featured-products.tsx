"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { ProductWithRelations } from "@/server/repositories/products";
import { ProductCard } from "./product-card";

export function FeaturedProducts({ products }: { products: ProductWithRelations[] }) {
  const [active, setActive] = useState("todos");

  const tabs = useMemo(() => {
    const seen = new Map<string, string>();
    products.forEach((p) => seen.set(p.category.slug, p.category.name));
    return [["todos", "Todos"], ...seen.entries()] as [string, string][];
  }, [products]);

  const visible = (active === "todos" ? products : products.filter((p) => p.category.slug === active)).slice(0, 4);

  return (
    <div>
      <div role="tablist" aria-label="Categorias" className="flex flex-wrap justify-center gap-2">
        {tabs.map(([slug, name]) => (
          <button
            key={slug}
            role="tab"
            aria-selected={active === slug}
            onClick={() => setActive(slug)}
            className={cn(
              "relative rounded-full px-5 py-2 text-sm font-medium transition-colors",
              active === slug ? "text-cream" : "text-coffee/70 hover:text-coffee",
            )}
          >
            {active === slug && (
              <motion.span layoutId="featured-tab" className="absolute inset-0 -z-10 rounded-full bg-coffee" />
            )}
            {name}
          </button>
        ))}
      </div>

      <div className="mt-12 min-h-[28rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-12 text-center">
        <Link
          href={active === "todos" ? "/cardapio" : `/cardapio?categoria=${active}`}
          className="inline-block rounded-full border border-coffee px-8 py-3 text-sm font-medium transition hover:bg-coffee hover:text-cream"
        >
          Ver tudo no cardápio
        </Link>
      </div>
    </div>
  );
}
