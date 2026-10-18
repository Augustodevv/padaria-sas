import Link from "next/link";
import { formatBRL } from "@/lib/money";
import type { ProductWithRelations } from "@/server/repositories/products";
import { AddToCartButton } from "./add-to-cart-button";
import { ProductVisual } from "./product-visual";

export function ProductCard({ product }: { product: ProductWithRelations }) {
  const unavailable = !product.isAvailable;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card bg-white shadow-soft transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift">
      <Link href={`/produto/${product.slug}`} className="block" aria-label={`Ver detalhes de ${product.name}`}>
        <div className="relative aspect-[4/5] overflow-hidden">
          <div className="h-full w-full transition-transform duration-700 group-hover:scale-105">
            <ProductVisual
              categorySlug={product.category.slug}
              imageUrl={product.images[0]?.url}
              alt={product.images[0]?.alt ?? product.name}
            />
          </div>
          {unavailable && (
            <span className="absolute left-4 top-4 rounded-full bg-coffee/85 px-3 py-1 text-xs text-cream">
              Indisponível
            </span>
          )}
          {product.isFeatured && !unavailable && (
            <span className="absolute left-4 top-4 rounded-full bg-caramel px-3 py-1 text-xs font-medium text-white">
              Destaque
            </span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs uppercase tracking-widest text-olive">{product.category.name}</p>
        <h3 className="font-display text-xl leading-snug">{product.name}</h3>
        <p className="line-clamp-2 text-sm text-coffee/65">{product.description}</p>
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="font-display text-xl">{formatBRL(product.priceCents)}</span>
          <AddToCartButton product={product} variant="icon" disabled={unavailable} />
        </div>
      </div>
    </article>
  );
}
