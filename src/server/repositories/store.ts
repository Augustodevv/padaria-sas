import { db } from "@/server/db";
import { DEFAULT_HOURS, type OpeningHours } from "@/server/services/schedule";
import { parseZones, type DeliveryZone } from "@/server/services/delivery";

export interface StoreConfig {
  name: string;
  phone: string | null;
  address: string | null;
  hours: OpeningHours;
  zones: DeliveryZone[];
}

export async function getStoreConfig(): Promise<StoreConfig> {
  const s = await db.storeSettings.findUnique({ where: { id: 1 } });
  const h = s?.openingHours as Partial<OpeningHours> | null | undefined;
  return {
    name: s?.name ?? "Maison du Pain",
    phone: s?.phone ?? null,
    address: s?.address ?? null,
    hours: {
      weekdays: h?.weekdays ?? DEFAULT_HOURS.weekdays,
      saturday: h?.saturday ?? DEFAULT_HOURS.saturday,
      sunday: h?.sunday ?? DEFAULT_HOURS.sunday,
    },
    zones: parseZones(s?.deliveryZones),
  };
}

export function findCouponByCode(code: string) {
  return db.coupon.findUnique({ where: { code } });
}

export function countUserRedemptions(couponId: string, userId: string) {
  return db.couponRedemption.count({ where: { couponId, userId } });
}

export function findProductsByIds(ids: string[]) {
  return db.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, priceCents: true, isAvailable: true, archivedAt: true },
  });
}
