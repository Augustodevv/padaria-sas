import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductCard } from "@/components/store/product-card";
import { ProductPurchase } from "@/components/store/product-purchase";
import { ProductVisual } from "@/components/store/product-visual";
import { JsonLd } from "@/components/seo/json-ld";
import { productJsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { getProductBySlug, listRelatedProducts } from "@/server/repositories/products";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  const image = product.images[0]?.url;
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/produto/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description: product.description,
      url: absoluteUrl(`/produto/${product.slug}`),
      ...(image && { images: [{ url: image, alt: product.name }] }),
    },
  };
}

async function Related({ categoryId, excludeId }: { categoryId: string; excludeId: string }) {
  const related = await listRelatedProducts(categoryId, excludeId);
  if (related.length === 0) return null;
  return (
    <section className="mt-24">
      <h2 className="font-display text-3xl">Você também pode gostar</h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

async function Detail({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <>
      <JsonLd
        data={productJsonLd({
          name: product.name,
          description: product.description,
          url: absoluteUrl(`/produto/${product.slug}`),
          priceCents: product.priceCents,
          available: product.isAvailable,
          category: product.category.name,
          images: product.images.map((i) => i.url),
        })}
      />
      <nav aria-label="Navegação estrutural" className="mb-8 text-sm text-coffee/70">
        <Link href="/cardapio" className="hover:text-caramel-deep">Cardápio</Link>
        {" / "}
        <Link href={`/cardapio?categoria=${product.category.slug}`} className="hover:text-caramel-deep">
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-12 lg:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-[2rem] shadow-lift">
          <ProductVisual
            categorySlug={product.category.slug}
            imageUrl={product.images[0]?.url}
            alt={product.images[0]?.alt ?? product.name}
            iconSize={120}
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
          />
        </div>

        <div className="space-y-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-olive">{product.category.name}</p>
            <h1 className="mt-2 font-display text-5xl leading-tight">{product.name}</h1>
            <p className="mt-4 text-lg text-coffee/75">{product.description}</p>
          </div>

          <ProductPurchase product={product} available={product.isAvailable} />

          <dl className="space-y-5 border-t border-beige pt-8">
            <div>
              <dt className="font-editorial text-xl italic text-caramel-deep">Ingredientes</dt>
              <dd className="mt-1 text-coffee/75">{product.ingredients.join(", ")}</dd>
            </div>
            <div>
              <dt className="font-editorial text-xl italic text-caramel-deep">Alergênicos</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {product.allergens.length === 0 ? (
                  <span className="text-coffee/75">Não contém alergênicos declarados.</span>
                ) : (
                  product.allergens.map((a) => (
                    <span key={a} className="rounded-full bg-beige px-3 py-1 text-sm">
                      Contém {a}
                    </span>
                  ))
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <Suspense>
        <Related categoryId={product.categoryId} excludeId={product.id} />
      </Suspense>
    </>
  );
}

export default function ProductPage({ params }: { params: Params }) {
  return (
    <div className="min-h-[100svh] mx-auto max-w-7xl px-6 pb-24 pt-32">
      <Suspense fallback={<div className="aspect-[2/1] animate-pulse rounded-card bg-beige/70" aria-busy />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}
