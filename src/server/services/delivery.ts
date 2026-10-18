export interface DeliveryZone {
  neighborhood: string;
  feeCents: number;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

/** Retorna a taxa do bairro ou `null` se o bairro não é atendido. */
export function deliveryFeeFor(neighborhood: string, zones: DeliveryZone[]): number | null {
  const zone = zones.find((z) => norm(z.neighborhood) === norm(neighborhood));
  return zone ? zone.feeCents : null;
}

export function parseZones(raw: unknown): DeliveryZone[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((z) =>
    z && typeof z.neighborhood === "string" && Number.isInteger(z.feeCents) && z.feeCents >= 0
      ? [{ neighborhood: z.neighborhood, feeCents: z.feeCents as number }]
      : [],
  );
}
