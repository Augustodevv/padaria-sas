import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const base = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  AUTH_SECRET: "x".repeat(32),
};

describe("parseEnv", () => {
  it("aceita o mínimo em desenvolvimento e aplica o padrão do site", () => {
    const r = parseEnv(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
  });

  it("lista o que falta, sem repetir valores", () => {
    const r = parseEnv({ AUTH_SECRET: "curto" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.join("\n")).toMatch(/DATABASE_URL/);
      expect(r.errors.join("\n")).toMatch(/AUTH_SECRET/);
      expect(r.errors.join("\n")).not.toContain("curto");
    }
  });

  it("rejeita DATABASE_URL que não é Postgres", () => {
    expect(parseEnv({ ...base, DATABASE_URL: "mysql://x" }).ok).toBe(false);
  });

  it("em produção exige Mercado Pago e https", () => {
    const r = parseEnv({ ...base, NODE_ENV: "production" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/MERCADOPAGO_ACCESS_TOKEN[\s\S]*MERCADOPAGO_WEBHOOK_SECRET[\s\S]*https/);

    const ok = parseEnv({
      ...base,
      NODE_ENV: "production",
      MERCADOPAGO_ACCESS_TOKEN: "APP_USR-x",
      MERCADOPAGO_WEBHOOK_SECRET: "s",
      NEXT_PUBLIC_SITE_URL: "https://maisondupain.example",
    });
    expect(ok.ok).toBe(true);
  });

  it("strings vazias de opcionais viram undefined", () => {
    const r = parseEnv({ ...base, RESEND_API_KEY: "" });
    expect(r.ok && r.env.RESEND_API_KEY).toBeUndefined();
  });
});
