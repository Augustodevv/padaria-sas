import { describe, expect, it } from "vitest";
import { poolSize } from "./db-pool";

describe("poolSize", () => {
  it("usa 3 em produção e 10 fora dela por padrão", () => {
    expect(poolSize({ NODE_ENV: "production" })).toBe(3);
    expect(poolSize({ NODE_ENV: "development" })).toBe(10);
    expect(poolSize({})).toBe(10);
  });

  it("respeita DB_POOL_MAX válido", () => {
    expect(poolSize({ NODE_ENV: "production", DB_POOL_MAX: "8" })).toBe(8);
    expect(poolSize({ DB_POOL_MAX: " 1 " })).toBe(1);
  });

  it.each(["0", "-2", "51", "2.5", "abc", ""])("ignora valor inválido %j", (v) => {
    expect(poolSize({ NODE_ENV: "production", DB_POOL_MAX: v })).toBe(3);
  });
});
