import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";

export type SortKey = "popular" | "price-asc" | "price-desc" | "name";

export interface ProductFilters {
  category?: string;
  q?: string;
  sort?: SortKey;
  featured?: boolean;
}

const include = {
  category: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof include }>;

const orderBy: Record<SortKey, Prisma.ProductOrderByWithRelationInput[]> = {
  popular: [{ popularity: "desc" }, { name: "asc" }],
  "price-asc": [{ priceCents: "asc" }],
  "price-desc": [{ priceCents: "desc" }],
  name: [{ name: "asc" }],
};

export function listProducts(filters: ProductFilters = {}) {
  const where: Prisma.ProductWhereInput = {
    archivedAt: null,
    ...(filters.category && { category: { slug: filters.category } }),
    ...(filters.featured && { isFeatured: true }),
    ...(filters.q && {
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
      ],
    }),
  };
  return db.product.findMany({ where, include, orderBy: orderBy[filters.sort ?? "popular"] });
}

export function getProductBySlug(slug: string) {
  return db.product.findFirst({ where: { slug, archivedAt: null }, include });
}

export function listRelatedProducts(categoryId: string, excludeId: string, take = 4) {
  return db.product.findMany({
    where: { categoryId, id: { not: excludeId }, archivedAt: null },
    include,
    orderBy: { popularity: "desc" },
    take,
  });
}

export function listCategories() {
  return db.category.findMany({ orderBy: { sortOrder: "asc" } });
}
