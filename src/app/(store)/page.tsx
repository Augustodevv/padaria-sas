import { Suspense } from "react";
import { FeaturedProducts } from "@/components/store/featured-products";
import { Hero } from "@/components/store/hero";
import { BestSellers, Combos, Gallery, Newsletter, SectionTitle, Testimonials, Visit } from "@/components/store/home-sections";
import { StorySection } from "@/components/store/story-section";
import { JsonLd } from "@/components/seo/json-ld";
import { bakeryJsonLd } from "@/lib/seo";
import { SITE_DESCRIPTION, absoluteUrl } from "@/lib/site";
import { getStoreConfig } from "@/server/repositories/store";
import { listProducts } from "@/server/repositories/products";

function ProductsSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-6 py-28 sm:grid-cols-2 lg:grid-cols-4" aria-busy>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="aspect-[3/4] animate-pulse rounded-card bg-beige/70" />
      ))}
    </div>
  );
}

async function HomeProducts() {
  const [all, config] = await Promise.all([listProducts({ sort: "popular" }), getStoreConfig()]);
  const available = all.filter((p) => p.isAvailable);
  const featured = all.filter((p) => p.isFeatured);
  const combos = all.filter((p) => p.category.slug === "combos");
  const best = available.filter((p) => p.category.slug !== "combos").slice(0, 4);

  return (
    <>
      <JsonLd
        data={bakeryJsonLd({
          name: config.name,
          url: absoluteUrl("/"),
          description: SITE_DESCRIPTION,
          phone: config.phone,
          address: config.address,
          hours: config.hours,
        })}
      />
      <section id="destaques" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-28">
        <SectionTitle eyebrow="Saindo do forno" title="Produtos em destaque" />
        <FeaturedProducts products={featured.length ? featured : available} />
      </section>
      <StorySection />
      <BestSellers products={best} />
      <Combos products={combos} />
      <Testimonials />
      <Gallery products={available} />
      <Newsletter />
      <Visit />
    </>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <Suspense fallback={<ProductsSkeleton />}>
        <HomeProducts />
      </Suspense>
    </>
  );
}
