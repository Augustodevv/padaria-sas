import { expect, test } from "./fixtures";

test.describe("Loja: páginas públicas", () => {
  test("home carrega com destaques e sem rolagem horizontal no celular", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("O sabor que transforma seus momentos");
    await expect(page.getByRole("heading", { name: "Produtos em destaque" })).toBeVisible();
    await expect(page.getByRole("article").first()).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("link 'Pular para o conteúdo' leva o foco ao conteúdo principal", async ({ page }) => {
    await page.goto("/cardapio");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page).toHaveURL(/#conteudo$/);
  });

  test("cabeçalhos de segurança estão presentes", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("object-src 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("robots bloqueia áreas privadas e sitemap lista produtos", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /checkout");
    expect(robots).toContain("Sitemap:");

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/cardapio");
    expect(sitemap).toMatch(/\/produto\/[a-z0-9-]+/);
  });

  test("página de produto expõe dados estruturados e metadata", async ({ page }) => {
    await page.goto("/produto/croissant-de-manteiga");
    await expect(page).toHaveTitle(/Croissant de Manteiga \| Maison du Pain/);
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(ld ?? "{}");
    expect(data["@type"]).toBe("Product");
    expect(data.offers.priceCurrency).toBe("BRL");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/produto\/croissant-de-manteiga$/);
  });

  test("produto inexistente mostra a página 404 da loja", async ({ page }) => {
    await page.goto("/produto/nao-existe-mesmo");
    await expect(page.getByRole("heading", { name: /não está no cardápio/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver o cardápio" })).toBeVisible();
  });
});
