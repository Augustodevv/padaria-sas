import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit, resetRateLimits } from "./rate-limit";

beforeEach(() => resetRateLimits());
afterEach(() => vi.unstubAllEnvs());

describe("rateLimit", () => {
  it("permite até o limite e bloqueia depois", () => {
    const t = 1_000;
    expect(rateLimit("k", 3, 60_000, t).ok).toBe(true);
    expect(rateLimit("k", 3, 60_000, t).ok).toBe(true);
    const third = rateLimit("k", 3, 60_000, t);
    expect(third.ok).toBe(true);
    expect(third.remaining).toBe(0);
    const blocked = rateLimit("k", 3, 60_000, t + 10_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(50);
  });

  it("libera de novo após a janela", () => {
    for (let i = 0; i < 3; i++) rateLimit("k", 3, 1_000, 0);
    expect(rateLimit("k", 3, 1_000, 500).ok).toBe(false);
    expect(rateLimit("k", 3, 1_000, 1_001).ok).toBe(true);
  });

  it("isola chaves diferentes", () => {
    for (let i = 0; i < 3; i++) rateLimit("a", 3, 60_000, 0);
    expect(rateLimit("a", 3, 60_000, 0).ok).toBe(false);
    expect(rateLimit("b", 3, 60_000, 0).ok).toBe(true);
  });
});

describe("RATE_LIMIT_DISABLED (apenas para testes E2E)", () => {
  it("desliga o limite fora de produção", () => {
    vi.stubEnv("RATE_LIMIT_DISABLED", "1");
    vi.stubEnv("NODE_ENV", "development");
    for (let i = 0; i < 20; i++) expect(rateLimit("k", 2, 60_000, 0).ok).toBe(true);
  });

  it("é ignorado em produção: o limite continua valendo", () => {
    vi.stubEnv("RATE_LIMIT_DISABLED", "1");
    vi.stubEnv("NODE_ENV", "production");
    expect(rateLimit("k", 2, 60_000, 0).ok).toBe(true);
    expect(rateLimit("k", 2, 60_000, 0).ok).toBe(true);
    expect(rateLimit("k", 2, 60_000, 0).ok).toBe(false);
  });

  it("sem a variável, o limite vale normalmente", () => {
    expect(rateLimit("k", 1, 60_000, 0).ok).toBe(true);
    expect(rateLimit("k", 1, 60_000, 0).ok).toBe(false);
  });
});
