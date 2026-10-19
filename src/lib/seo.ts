/** Construtores de dados estruturados (schema.org). Funções puras, para testar sem Next. */

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export interface HoursInput {
  weekdays: string;
  saturday: string;
  sunday: string;
}

function range(raw: string): { opens: string; closes: string } | null {
  const m = raw.match(/^(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})$/);
  return m ? { opens: m[1], closes: m[2] } : null;
}

export function openingHoursSpec(hours: HoursInput) {
  const groups: [string[], string][] = [
    [["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], hours.weekdays],
    [[DAY_NAMES[6]], hours.saturday],
    [[DAY_NAMES[0]], hours.sunday],
  ];
  return groups.flatMap(([dayOfWeek, raw]) => {
    const r = range(raw);
    return r ? [{ "@type": "OpeningHoursSpecification", dayOfWeek, ...r }] : [];
  });
}

export function bakeryJsonLd(input: {
  name: string;
  url: string;
  description: string;
  phone?: string | null;
  address?: string | null;
  hours: HoursInput;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: input.name,
    url: input.url,
    description: input.description,
    servesCuisine: "Padaria francesa",
    priceRange: "$$",
    ...(input.phone && { telephone: input.phone }),
    ...(input.address && { address: { "@type": "PostalAddress", streetAddress: input.address, addressCountry: "BR" } }),
    openingHoursSpecification: openingHoursSpec(input.hours),
  };
}

export function productJsonLd(input: {
  name: string;
  description: string;
  url: string;
  priceCents: number;
  available: boolean;
  category: string;
  images: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    category: input.category,
    ...(input.images.length > 0 && { image: input.images }),
    offers: {
      "@type": "Offer",
      url: input.url,
      priceCurrency: "BRL",
      price: (input.priceCents / 100).toFixed(2),
      availability: input.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
}

/** Serializa para <script type="application/ld+json">, escapando "<" e os separadores de linha (U+2028/2029). */
const BACKSLASH = String.fromCharCode(92);
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, `${BACKSLASH}u003c`)
    .split(LINE_SEPARATOR)
    .join(`${BACKSLASH}u2028`)
    .split(PARAGRAPH_SEPARATOR)
    .join(`${BACKSLASH}u2029`);
}
