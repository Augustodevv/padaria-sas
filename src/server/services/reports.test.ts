import { describe, expect, it } from "vitest";
import { averageTicket, fillDailySeries, parsePeriod, percentChange, spDay } from "./reports";

describe("spDay", () => {
  it("usa o dia de São Paulo (UTC-3)", () => {
    expect(spDay(new Date("2026-10-19T02:30:00Z"))).toBe("2026-10-18"); // 23:30 de domingo em SP
    expect(spDay(new Date("2026-10-19T03:00:00Z"))).toBe("2026-10-19");
  });
});

describe("fillDailySeries", () => {
  const now = new Date("2026-10-19T15:00:00Z");

  it("devolve exatamente N dias terminando hoje, preenchendo zeros", () => {
    const s = fillDailySeries([{ day: "2026-10-18", cents: 5000, orders: 2 }], 4, now);
    expect(s.map((r) => r.day)).toEqual(["2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19"]);
    expect(s.map((r) => r.cents)).toEqual([0, 0, 5000, 0]);
  });

  it("atravessa virada de mês", () => {
    const s = fillDailySeries([], 3, new Date("2026-11-01T15:00:00Z"));
    expect(s.map((r) => r.day)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
  });
});

describe("percentChange / averageTicket / parsePeriod", () => {
  it("calcula variação e trata base zero", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(10, 0)).toBeNull();
  });

  it("ticket médio arredonda e evita divisão por zero", () => {
    expect(averageTicket(10000, 3)).toBe(3333);
    expect(averageTicket(0, 0)).toBe(0);
  });

  it("período aceita só 7, 30 ou 90", () => {
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod("90")).toBe(90);
    expect(parsePeriod("15")).toBe(30);
    expect(parsePeriod(undefined)).toBe(30);
    expect(parsePeriod("abc")).toBe(30);
  });
});
