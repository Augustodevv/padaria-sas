import { z } from "zod";
import { ALLOWED_IMAGE_HOSTS, isAllowedImageUrl } from "@/lib/images";

/** "12,90" → 1290 · "1.290,50" → 129050 · "12.90" → 1290. Inválido → null. */
export function parseBRLToCents(input: string): number | null {
  const s = input.trim().replace(/^R\$\s*/i, "");
  if (!s) return null;
  let normalized: string;
  if (s.includes(",")) normalized = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) normalized = s.replace(/\./g, "");
  else normalized = s;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** Lista separada por vírgula, ponto e vírgula ou quebra de linha, sem vazios nem repetidos. */
export function parseList(input: string | undefined, max = 30): string[] {
  if (!input) return [];
  const items = input
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(items)].slice(0, max);
}

const money = (label: string, { min = 0, max = 1_000_000_00, allowEmpty = false } = {}) =>
  z
    .string()
    .default("")
    .transform((v, ctx) => {
      if (allowEmpty && v.trim() === "") return 0;
      const cents = parseBRLToCents(v);
      if (cents === null) ctx.addIssue({ code: "custom", message: `${label} inválido (ex.: 12,90).` });
      return cents ?? 0;
    })
    .refine((c) => c >= min && c <= max, `${label} fora do intervalo permitido.`);

const checkbox = z
  .string()
  .default("")
  .transform((v) => v === "on" || v === "true");

const httpsUrl = z
  .string()
  .refine(isAllowedImageUrl, `Use URLs https de: ${ALLOWED_IMAGE_HOSTS.join(", ")}.`);

export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Informe o nome.").max(100),
  categoryId: z.string({ error: "Escolha a categoria." }).min(1, "Escolha a categoria."),
  description: z.string().trim().min(5, "Descreva o produto.").max(500),
  price: money("Preço", { min: 1 }),
  ingredients: z.string().default("").transform((v) => parseList(v)),
  allergens: z.string().default("").transform((v) => parseList(v)),
  images: z
    .string()
    .default("")
    .transform((v) => parseList(v, 8))
    .pipe(z.array(httpsUrl).max(8)),
  isAvailable: checkbox,
  isFeatured: checkbox,
});

export const couponSchema = z
  .object({
    id: z.string().optional(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/, "Use 3 a 30 letras, números, - ou _."),
    discountType: z.enum(["PERCENT", "FIXED"]),
    discountValue: z.string(),
    minOrder: money("Pedido mínimo", { allowEmpty: true }),
    maxUses: z
      .string()
      .default("")
      .transform((v) => (v.trim() ? Number(v) : null))
      .pipe(z.number().int().min(1).max(1_000_000).nullable()),
    validUntil: z
      .string()
      .default("")
      .transform((v) => (v ? new Date(`${v}T23:59:59-03:00`) : null))
      .pipe(z.date().nullable()),
    isActive: checkbox,
  })
  .transform((v, ctx) => {
    let value: number | null;
    if (v.discountType === "PERCENT") {
      const n = Number(v.discountValue.replace(",", "."));
      value = Number.isInteger(n) && n >= 1 && n <= 100 ? n : null;
      if (value === null) ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Percentual inteiro de 1 a 100." });
    } else {
      value = parseBRLToCents(v.discountValue);
      if (value === null || value < 1) {
        ctx.addIssue({ code: "custom", path: ["discountValue"], message: "Valor inválido (ex.: 5,00)." });
        value = null;
      }
    }
    return { ...v, discountValue: value ?? 0 };
  });

const hoursRange = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}\s*[–-]\s*\d{2}:\d{2}$/, "Use o formato 07:00–19:00.")
  .transform((v) => v.replace(/\s*-\s*/, "–").replace(/\s+/g, ""))
  .refine((v) => {
    const [a, b] = v.split("–").map((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)));
    return a < b && b <= 24 * 60;
  }, "O horário de abertura deve ser antes do fechamento.");

/** "Centro; 8,00" por linha → [{ neighborhood, feeCents }] */
export function parseZonesText(input: string): { neighborhood: string; feeCents: number }[] | null {
  const out: { neighborhood: string; feeCents: number }[] = [];
  for (const line of input.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const [name, fee] = line.split(";").map((s) => s.trim());
    const cents = fee !== undefined ? parseBRLToCents(fee) : null;
    if (!name || cents === null) return null;
    out.push({ neighborhood: name, feeCents: cents });
  }
  return out;
}

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email("Email inválido.").optional().or(z.literal("").transform(() => undefined)),
  address: z.string().trim().max(200).optional(),
  weekdays: hoursRange,
  saturday: hoursRange,
  sunday: hoursRange,
  zones: z
    .string()
    .transform((v, ctx) => {
      const parsed = parseZonesText(v);
      if (!parsed) ctx.addIssue({ code: "custom", message: "Use uma linha por bairro: Nome; 8,00" });
      return parsed ?? [];
    })
    .refine((z) => z.length <= 50, "No máximo 50 bairros."),
});

export const orderStatusSchema = z.object({
  orderId: z.string().min(1),
  to: z.enum(["PENDING_PAYMENT", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "CANCELLED"]),
});
