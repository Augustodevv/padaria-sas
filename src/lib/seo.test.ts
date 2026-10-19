import { describe, expect, it } from "vitest";
import { bakeryJsonLd, openingHoursSpec, productJsonLd, serializeJsonLd } from "./seo";

const hours = { weekdays: "07:00–19:00", saturday: "07:00-17:00", sunday: "08:00–13:00" };

describe("openingHoursSpec", () => {
  it("agrupa dias úteis e converte sábado e domingo", () => {
    const spec = openingHoursSpec(hours);
    expect(spec).toHaveLength(3);
    expect(spec[0]).toMatchObject({ dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "07:00", closes: "19:00" });
    expect(spec[1]).toMatchObject({ dayOfWeek: ["Saturday"], closes: "17:00" });
    expect(spec[2]).toMatchObject({ dayOfWeek: ["Sunday"], opens: "08:00" });
  });

  it("ignora intervalos inválidos", () => {
    expect(openingHoursSpec({ ...hours, sunday: "fechado" })).toHaveLength(2);
  });
});

describe("productJsonLd", () => {
  const base = { name: "Croissant", description: "Folhado", url: "https://x.com/produto/c", priceCents: 1290, available: true, category: "Croissants", images: [] };

  it("formata preço com ponto, moeda BRL e disponibilidade", () => {
    const ld = productJsonLd(base);
    expect(ld.offers).toMatchObject({ price: "12.90", priceCurrency: "BRL", availability: "https://schema.org/InStock" });
    expect(ld).not.toHaveProperty("image");
  });

  it("marca fora de estoque e inclui imagens quando existem", () => {
    const ld = productJsonLd({ ...base, available: false, images: ["https://res.cloudinary.com/a.jpg"] });
    expect(ld.offers.availability).toBe("https://schema.org/OutOfStock");
    expect(ld.image).toEqual(["https://res.cloudinary.com/a.jpg"]);
  });
});

describe("bakeryJsonLd / serializeJsonLd", () => {
  it("monta o negócio local com horários e omite campos vazios", () => {
    const ld = bakeryJsonLd({ name: "Maison du Pain", url: "https://x.com", description: "d", hours });
    expect(ld["@type"]).toBe("Bakery");
    expect(ld).not.toHaveProperty("telephone");
    expect(ld.openingHoursSpecification).toHaveLength(3);
  });

  it("escapa < para não permitir fechar a tag script", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c/script>");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});
