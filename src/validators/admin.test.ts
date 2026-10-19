import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";
import { couponSchema, parseBRLToCents, parseList, parseZonesText, productSchema, settingsSchema } from "./admin";

describe("parseBRLToCents", () => {
  it.each([
    ["12,90", 1290],
    ["12.90", 1290],
    ["1.290,50", 129050],
    ["1.290", 129000],
    ["R$ 5", 500],
    ["0,05", 5],
    ["  7 ", 700],
  ])("%s → %d", (input, cents) => {
    expect(parseBRLToCents(input)).toBe(cents);
  });

  it.each(["", "abc", "-5", "12,999", "1,2,3", "R$"])("rejeita %j", (input) => {
    expect(parseBRLToCents(input)).toBeNull();
  });
});

describe("parseList / slugify", () => {
  it("separa por vírgula, ; e quebra de linha, sem vazios nem repetidos", () => {
    expect(parseList("leite, ovos;glúten\nleite\n  ")).toEqual(["leite", "ovos", "glúten"]);
    expect(parseList(undefined)).toEqual([]);
  });

  it("gera slug sem acento", () => {
    expect(slugify("Pão de Fermentação Natural!")).toBe("pao-de-fermentacao-natural");
  });
});

const product = {
  name: "Croissant de Amêndoas",
  categoryId: "cat1",
  description: "Massa folhada com creme de amêndoas.",
  price: "14,50",
};

describe("productSchema", () => {
  it("converte preço para centavos, listas e checkboxes", () => {
    const r = productSchema.parse({ ...product, ingredients: "farinha, manteiga", isAvailable: "on" });
    expect(r.price).toBe(1450);
    expect(r.ingredients).toEqual(["farinha", "manteiga"]);
    expect(r.isAvailable).toBe(true);
    expect(r.isFeatured).toBe(false);
  });

  it.each([
    ["preço zero", { price: "0" }],
    ["preço inválido", { price: "abc" }],
    ["nome curto", { name: "a" }],
    ["sem categoria", { categoryId: "" }],
    ["imagem http", { images: "http://res.cloudinary.com/a.jpg" }],
    ["imagem de host não permitido", { images: "https://evil.com/a.jpg" }],
    ["imagem javascript", { images: "javascript:alert(1)" }],
  ])("rejeita: %s", (_, patch) => {
    expect(productSchema.safeParse({ ...product, ...patch }).success).toBe(false);
  });

  it("aceita imagens https", () => {
    const r = productSchema.parse({ ...product, images: "https://res.cloudinary.com/x/a.jpg\nhttps://res.cloudinary.com/x/b.jpg" });
    expect(r.images).toHaveLength(2);
  });
});

describe("couponSchema", () => {
  const base = { code: " bemvindo10 ", discountType: "PERCENT", discountValue: "10", minOrder: "30,00", maxUses: "", validUntil: "" };

  it("normaliza o código e converte valores", () => {
    const r = couponSchema.parse(base);
    expect(r).toMatchObject({ code: "BEMVINDO10", discountValue: 10, minOrder: 3000, maxUses: null, validUntil: null, isActive: false });
  });

  it("valor fixo em reais vira centavos", () => {
    expect(couponSchema.parse({ ...base, discountType: "FIXED", discountValue: "5,00" }).discountValue).toBe(500);
  });

  it.each([
    ["percentual > 100", { discountValue: "150" }],
    ["percentual zero", { discountValue: "0" }],
    ["percentual decimal", { discountValue: "10,5" }],
    ["código curto", { code: "ab" }],
    ["código com espaço", { code: "a b c" }],
    ["limite de usos inválido", { maxUses: "0" }],
  ])("rejeita: %s", (_, patch) => {
    expect(couponSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  });

  it("validade vai até o fim do dia em Brasília", () => {
    const r = couponSchema.parse({ ...base, validUntil: "2026-12-31" });
    expect(r.validUntil?.toISOString()).toBe("2027-01-01T02:59:59.000Z");
  });
});

describe("settingsSchema / zonas", () => {
  const base = {
    name: "Maison du Pain",
    weekdays: "07:00–19:00",
    saturday: "07:00 - 17:00",
    sunday: "08:00–13:00",
    zones: "Centro; 8,00\nVila Mariana; 12,00",
  };

  it("normaliza horários e converte zonas", () => {
    const r = settingsSchema.parse(base);
    expect(r.saturday).toBe("07:00–17:00");
    expect(r.zones).toEqual([
      { neighborhood: "Centro", feeCents: 800 },
      { neighborhood: "Vila Mariana", feeCents: 1200 },
    ]);
  });

  it("rejeita horário invertido, formato ruim e zona malformada", () => {
    expect(settingsSchema.safeParse({ ...base, weekdays: "19:00–07:00" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, sunday: "oito às treze" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, zones: "Centro sem taxa" }).success).toBe(false);
    expect(parseZonesText("Centro; abc")).toBeNull();
  });
});
