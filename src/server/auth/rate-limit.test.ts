import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "./rate-limit";

beforeEach(() => resetRateLimits());

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
