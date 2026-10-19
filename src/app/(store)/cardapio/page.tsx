import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogFilters } from "@/components/store/catalog-filters";
import { ProductCard } from "@/components/store/product-card";
import { listCategories, listProducts, type SortKey } from "@/server/repositories/products";

export const metadata: Metadata = {
  title: "Cardápio",
  description: "Pães artesanais, croissants, bolos, doces, cafés e combos da Maison du Pain.",
  alternates: { canonical: "/cardapio" },
};

const SORTS: SortKey[] = ["popular", "price-asc", "price-desc", "name"];

type SearchParams = Promise<{ q?: string; categoria?: string; ordem?: string }>;

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const { q, categoria, ordem } = await searchParams;
  const sort = SORTS.includes(ordem as SortKey) ? (ordem as SortKey) : "popular";
  const products = await listProducts({ q: q?.slice(0, 80), category: categoria, sort });

  if (products.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="font-editorial text-3xl italic">Nada encontrado por aqui</p>
        <p className="mt-2 text-coffee/70">Tente outra busca ou escolha outra categoria.</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-coffee/70" role="status">
        {products.length} {products.length === 1 ? "produto" : "produtos"}
      </p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </>
  );
}

async function Filters() {
  const categories = await listCategories();
  return <CatalogFilters categories={categories} />;
}

function GridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-busy>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-[27rem] animate-pulse rounded-card bg-beige/70" />
      ))}
    </div>
  );
}

export default function CardapioPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="min-h-[100svh] mx-auto max-w-7xl px-6 pb-24 pt-32">
      <header className="mb-10 max-w-2xl">
        <p className="font-editorial text-xl italic text-caramel-deep">Feito hoje, para você</p>
        <h1 className="mt-2 font-display text-5xl">Cardápio</h1>
      </header>
      <Suspense fallback={<div className="h-[9.25rem] md:h-[8.25rem]" aria-hidden />}>
        <Filters />
      </Suspense>
      <div className="mt-10">
        <Suspense fallback={<GridSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
