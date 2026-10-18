import type { Metadata } from "next";
import { Suspense } from "react";
import { CouponForm } from "@/components/admin/coupon-form";
import { PageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Novo cupom" };

async function Gate() {
  await requirePermission("coupon:manage", "/admin/cupons/novo");
  return <CouponForm />;
}

export default function NovoCupomPage() {
  return (
    <>
      <PageHeader title="Novo cupom" />
      <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-beige/50" aria-busy />}>
        <Gate />
      </Suspense>
    </>
  );
}
