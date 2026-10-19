import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { db } from "@/server/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/cardapio"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/privacidade"), changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const [products, categories] = await Promise.all([
      db.product.findMany({ where: { archivedAt: null }, select: { slug: true, updatedAt: true } }),
      db.category.findMany({ select: { slug: true } }),
    ]);
    return [
      ...staticRoutes,
      ...categories.map((c) => ({ url: absoluteUrl(`/cardapio?categoria=${c.slug}`), changeFrequency: "daily" as const, priority: 0.7 })),
      ...products.map((p) => ({ url: absoluteUrl(`/produto/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ];
  } catch {
    // Sem banco (ex.: build em CI), publica só as rotas estáticas em vez de quebrar o build.
    return staticRoutes;
  }
}
