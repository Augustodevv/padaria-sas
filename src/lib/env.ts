import { z } from "zod";

const optional = z.string().trim().optional().transform((v) => v || undefined);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória").refine((v) => /^postgres(ql)?:\/\//.test(v), "DATABASE_URL deve começar com postgresql://"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET precisa de pelo menos 32 caracteres (gere com: openssl rand -base64 32)"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  MERCADOPAGO_ACCESS_TOKEN: optional,
  MERCADOPAGO_WEBHOOK_SECRET: optional,
  CLOUDINARY_CLOUD_NAME: optional,
  CLOUDINARY_API_KEY: optional,
  CLOUDINARY_API_SECRET: optional,
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
});

export type Env = z.infer<typeof schema>;

/** Valida as variáveis de ambiente. Em produção, pagamento e site público seguro são obrigatórios. */
export function parseEnv(raw: Record<string, string | undefined>): { ok: true; env: Env } | { ok: false; errors: string[] } {
  const parsed = schema.safeParse(raw);
  const errors: string[] = parsed.success ? [] : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);

  if (parsed.success && parsed.data.NODE_ENV === "production") {
    const e = parsed.data;
    if (!e.MERCADOPAGO_ACCESS_TOKEN) errors.push("MERCADOPAGO_ACCESS_TOKEN: obrigatória em produção");
    if (!e.MERCADOPAGO_WEBHOOK_SECRET) errors.push("MERCADOPAGO_WEBHOOK_SECRET: obrigatória em produção");
    if (!e.NEXT_PUBLIC_SITE_URL.startsWith("https://")) errors.push("NEXT_PUBLIC_SITE_URL: use https em produção");
  }

  return errors.length || !parsed.success ? { ok: false, errors } : { ok: true, env: parsed.data };
}
