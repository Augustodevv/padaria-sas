import { Clock, MapPin, Phone, Quote, Star } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import type { ProductWithRelations } from "@/server/repositories/products";
import { NewsletterForm } from "./newsletter-form";
import { ProductCard } from "./product-card";
import { ProductVisual } from "./product-visual";

export function SectionTitle({ eyebrow, title, light }: { eyebrow: string; title: string; light?: boolean }) {
  return (
    <Reveal className="mx-auto mb-14 max-w-2xl text-center">
      <p className="font-editorial text-xl italic text-caramel">{eyebrow}</p>
      <h2 className={`mt-2 font-display text-4xl sm:text-5xl ${light ? "text-cream" : ""}`}>{title}</h2>
    </Reveal>
  );
}

export function BestSellers({ products }: { products: ProductWithRelations[] }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-28">
      <SectionTitle eyebrow="Queridinhos da casa" title="Os mais vendidos" />
      <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <StaggerItem key={p.id}>
            <ProductCard product={p} />
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function Combos({ products }: { products: ProductWithRelations[] }) {
  if (products.length === 0) return null;
  return (
    <section id="combos" className="scroll-mt-20 bg-olive py-28 text-cream">
      <div className="mx-auto max-w-7xl px-6">
        <SectionTitle eyebrow="Para dividir (ou não)" title="Combos especiais" light />
        <div className="grid gap-8 md:grid-cols-2">
          {products.slice(0, 2).map((p, i) => (
            <Reveal key={p.id} delay={i * 0.12}>
              <Link
                href={`/produto/${p.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-card bg-cream text-coffee shadow-lift transition hover:-translate-y-1 sm:flex-row"
              >
                <div className="aspect-square shrink-0 overflow-hidden sm:w-2/5">
                  <div className="h-full w-full transition-transform duration-700 group-hover:scale-105">
                    <ProductVisual categorySlug="combos" imageUrl={p.images[0]?.url} alt={p.name} />
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-3 p-8">
                  <h3 className="font-display text-3xl">{p.name}</h3>
                  <p className="text-coffee/70">{p.description}</p>
                  <p className="font-display text-2xl text-caramel">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.priceCents / 100)}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const reviews = [
  { name: "Mariana S.", text: "O melhor croissant que já comi fora de Paris. Chego às 7h e já tem fila — vale cada minuto." },
  { name: "Carlos E.", text: "O pão de fermentação natural mudou meus finais de semana. Casca perfeita." },
  { name: "Joana P.", text: "Encomendei o bolo de morango para o aniversário da minha mãe. Todo mundo pediu a receita." },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-28">
      <SectionTitle eyebrow="Quem já provou" title="Depoimentos" />
      <Stagger className="grid gap-6 md:grid-cols-3">
        {reviews.map((r) => (
          <StaggerItem key={r.name}>
            <figure className="h-full rounded-card bg-white p-8 shadow-soft">
              <Quote className="text-caramel" size={28} />
              <blockquote className="mt-4 font-editorial text-2xl italic leading-snug">{r.text}</blockquote>
              <figcaption className="mt-6 flex items-center justify-between text-sm">
                <span className="font-medium">{r.name}</span>
                <span className="flex text-caramel" aria-label="5 de 5 estrelas">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </span>
              </figcaption>
            </figure>
          </StaggerItem>
        ))}
      </Stagger>
      <p className="mt-6 text-center text-xs text-coffee/40">Depoimentos ilustrativos (dados de demonstração).</p>
    </section>
  );
}

export function Gallery({ products }: { products: ProductWithRelations[] }) {
  return (
    <section className="bg-beige/50 py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionTitle eyebrow="Nos bastidores" title="Galeria" />
        <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.slice(0, 8).map((p, i) => (
            <StaggerItem key={p.id} className={i % 5 === 0 ? "row-span-2" : ""}>
              <div className={`overflow-hidden rounded-2xl ${i % 5 === 0 ? "aspect-[3/5]" : "aspect-square"}`}>
                <div className="h-full w-full transition-transform duration-700 hover:scale-110">
                  <ProductVisual categorySlug={p.category.slug} imageUrl={p.images[0]?.url} alt={p.name} iconSize={48} />
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function Newsletter() {
  return (
    <section className="bg-coffee py-24 text-center">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal>
          <h2 className="font-display text-4xl text-cream sm:text-5xl">Fornada nova, aviso no ar</h2>
          <p className="mb-8 mt-4 text-cream/70">Receba novidades do cardápio e ofertas da semana.</p>
          <NewsletterForm />
        </Reveal>
      </div>
    </section>
  );
}

export function Visit() {
  const rows = [
    ["Segunda a sexta", "07:00 – 19:00"],
    ["Sábado", "07:00 – 17:00"],
    ["Domingo", "08:00 – 13:00"],
  ];
  return (
    <section id="visite" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-28">
      <SectionTitle eyebrow="Venha tomar um café" title="Visite a padaria" />
      <div className="grid gap-8 md:grid-cols-3">
        <Reveal className="rounded-card bg-white p-8 shadow-soft">
          <MapPin className="text-caramel" />
          <h3 className="mt-4 font-display text-xl">Endereço</h3>
          <p className="mt-2 text-coffee/70">Rua das Padarias, 123<br />São Paulo, SP</p>
        </Reveal>
        <Reveal delay={0.1} className="rounded-card bg-white p-8 shadow-soft">
          <Clock className="text-caramel" />
          <h3 className="mt-4 font-display text-xl">Horários</h3>
          <dl className="mt-2 space-y-1 text-coffee/70">
            {rows.map(([d, h]) => (
              <div key={d} className="flex justify-between gap-4">
                <dt>{d}</dt>
                <dd>{h}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
        <Reveal delay={0.2} className="rounded-card bg-white p-8 shadow-soft">
          <Phone className="text-caramel" />
          <h3 className="mt-4 font-display text-xl">Contato</h3>
          <p className="mt-2 text-coffee/70">(11) 99999-0000<br />ola@maisondupain.example</p>
        </Reveal>
      </div>
    </section>
  );
}
