import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsForm } from "@/components/admin/settings-form";
import { PageHeader } from "@/components/admin/ui";
import { requirePermission } from "@/server/auth/guards";
import { getAdminSettings } from "@/server/repositories/admin";
import { parseZones } from "@/server/services/delivery";
import { DEFAULT_HOURS } from "@/server/services/schedule";

export const metadata: Metadata = { title: "Configurações" };

const reais = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

async function Settings() {
  await requirePermission("settings:manage", "/admin/configuracoes");
  const s = await getAdminSettings();
  const hours = { ...DEFAULT_HOURS, ...((s?.openingHours as object | null) ?? {}) };

  return (
    <SettingsForm
      initial={{
        name: s?.name ?? "Maison du Pain",
        phone: s?.phone ?? "",
        email: s?.email ?? "",
        address: s?.address ?? "",
        weekdays: hours.weekdays,
        saturday: hours.saturday,
        sunday: hours.sunday,
        zones: parseZones(s?.deliveryZones)
          .map((z) => `${z.neighborhood}; ${reais(z.feeCents)}`)
          .join("\n"),
      }}
    />
  );
}

export default function ConfiguracoesPage() {
  return (
    <>
      <PageHeader title="Configurações" subtitle="Dados da loja, horários e área de entrega." />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-beige/50" aria-busy />}>
        <Settings />
      </Suspense>
    </>
  );
}
