import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/server/auth/guards";
import { listCategoryOptions } from "@/server/repositories/admin";

export const metadata: Metadata = { title: "Novo produto" };

async function New() {
  await requirePermission("product:manage", "/admin/produtos/novo");
  return <ProductForm categories={await listCategoryOptions()} />;
}

export default function NovoProdutoPage() {
  return (
    <>
      <PageHeader title="Novo produto" />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-beige/50" aria-busy />}>
        <New />
      </Suspense>
    </>
  );
}
