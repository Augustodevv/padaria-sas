import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CouponForm } from "@/components/admin/coupon-form";
import { PageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/server/auth/guards";
import { getCoupon } from "@/server/repositories/admin";
import { spDay } from "@/server/services/reports";

export const metadata: Metadata = { title: "Editar cupom" };

async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("coupon:manage", `/admin/cupons/${id}`);
  const c = await getCoupon(id);
  if (!c) notFound();
  return (
    <>
      <PageHeader title="Editar cupom" subtitle={c.code} />
      <CouponForm
        initial={{
          id: c.id,
          code: c.code,
          discountType: c.discountType,
          discountValue: c.discountValue,
          minOrderCents: c.minOrderCents,
          maxUses: c.maxUses,
          validUntil: c.validUntil ? spDay(c.validUntil) : "",
          isActive: c.isActive,
        }}
      />
    </>
  );
}

export default function EditarCupomPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-beige/50" aria-busy />}>
      <Edit params={params} />
    </Suspense>
  );
}
