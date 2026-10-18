import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/server/auth/guards";
import { getAdminProduct, listCategoryOptions } from "@/server/repositories/admin";

export const metadata: Metadata = { title: "Editar produto" };

async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("product:manage", `/admin/produtos/${id}`);
  const [product, categories] = await Promise.all([getAdminProduct(id), listCategoryOptions()]);
  if (!product) notFound();

  return (
    <>
      <PageHeader title="Editar produto" subtitle={product.name} />
      <ProductForm
        categories={categories}
        initial={{
          id: product.id,
          name: product.name,
          categoryId: product.categoryId,
          description: product.description,
          priceCents: product.priceCents,
          ingredients: product.ingredients,
          allergens: product.allergens,
          images: product.images.map((i) => i.url),
          isAvailable: product.isAvailable,
          isFeatured: product.isFeatured,
        }}
      />
    </>
  );
}

export default function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-beige/50" aria-busy />}>
      <Edit params={params} />
    </Suspense>
  );
}
