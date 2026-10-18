import { describe, expect, it } from "vitest";
import { deliveryFeeFor, parseZones } from "./delivery";

const zones = [
  { neighborhood: "Centro", feeCents: 800 },
  { neighborhood: "Vila Mariana", feeCents: 1200 },
];

describe("deliveryFeeFor", () => {
  it("encontra o bairro ignorando acento e caixa", () => {
    expect(deliveryFeeFor("  centro ", zones)).toBe(800);
    expect(deliveryFeeFor("VILA MARIANA", zones)).toBe(1200);
  });

  it("retorna null para bairro não atendido", () => {
    expect(deliveryFeeFor("Moema", zones)).toBeNull();
  });
});

describe("parseZones", () => {
  it("descarta entradas inválidas", () => {
    expect(
      parseZones([
        { neighborhood: "Centro", feeCents: 800 },
        { neighborhood: "X", feeCents: -5 },
        { neighborhood: "Y", feeCents: 1.5 },
        { feeCents: 100 },
        null,
      ]),
    ).toEqual([{ neighborhood: "Centro", feeCents: 800 }]);
    expect(parseZones("nope")).toEqual([]);
  });
});
