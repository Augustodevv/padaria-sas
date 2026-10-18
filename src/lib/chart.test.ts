import { describe, expect, it } from "vitest";
import { compactBRL, niceMax, shortDay } from "./chart";

describe("niceMax", () => {
  it.each([
    [0, 1],
    [1, 1],
    [1.1, 2],
    [2.3, 2.5],
    [4200, 5000],
    [7800, 10000],
    [10000, 10000],
    [123456, 200000],
  ])("%d → %d", (v, expected) => {
    expect(niceMax(v)).toBe(expected);
  });
});

describe("rótulos", () => {
  it("compacta valores em reais", () => {
    expect(compactBRL(35000)).toBe("R$ 350");
    expect(compactBRL(120000)).toBe("R$ 1,2 mil");
    expect(compactBRL(0)).toBe("R$ 0");
  });

  it("formata o dia curto", () => {
    expect(shortDay("2026-10-19")).toBe("19/10");
  });
});
