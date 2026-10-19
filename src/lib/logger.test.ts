import { describe, expect, it } from "vitest";
import { formatLog, redact } from "./logger";

describe("redact", () => {
  it("oculta chaves sensíveis em qualquer nível", () => {
    const out = redact({
      userId: "u1",
      password: "123",
      nested: { accessToken: "abc", authorization: "Bearer x", ok: 1 },
      list: [{ cookie: "c" }],
    }) as Record<string, unknown>;
    expect(out.userId).toBe("u1");
    expect(out.password).toBe("[REDACTED]");
    expect(out.nested).toEqual({ accessToken: "[REDACTED]", authorization: "[REDACTED]", ok: 1 });
    expect(out.list).toEqual([{ cookie: "[REDACTED]" }]);
  });

  it("mascara emails e não vaza stack de erros", () => {
    const out = redact({ email: "maria.silva@example.com", err: new Error("falhou") }) as Record<string, unknown>;
    expect(out.email).toBe("m***@example.com");
    expect(out.err).toEqual({ name: "Error", message: "falhou" });
  });

  it("limita strings longas e profundidade", () => {
    const out = redact({ big: "x".repeat(2000), deep: { a: { b: { c: { d: 1 } } } } }) as { big: string; deep: unknown };
    expect(out.big.length).toBeLessThan(600);
    expect(JSON.stringify(out.deep)).toContain("[Object]");
  });
});

describe("formatLog", () => {
  it("gera uma linha JSON com nível, evento e hora", () => {
    const line = formatLog("error", "checkout.falha", { orderId: "o1", token: "t" }, new Date("2026-10-19T12:00:00Z"));
    expect(JSON.parse(line)).toEqual({
      level: "error",
      event: "checkout.falha",
      time: "2026-10-19T12:00:00.000Z",
      orderId: "o1",
      token: "[REDACTED]",
    });
    expect(line).not.toContain("\n");
  });
});
