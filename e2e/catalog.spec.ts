import { expect, test } from "./fixtures";

test.describe("Cardápio e carrinho", () => {
  test("filtra por categoria, busca e ordena", async ({ page }) => {
    await page.goto("/cardapio");
    await expect(page.getByRole("article").first()).toBeVisible();

    await page.getByRole("button", { name: "Croissants", exact: true }).click();
    await expect(page).toHaveURL(/categoria=croissants/);
    await expect(page.getByRole("status").filter({ hasText: "produtos" })).toBeVisible();
    for (const card of await page.getByRole("article").all()) await expect(card).toContainText("Croissants");

    await page.getByLabel("Ordenar por").selectOption("price-desc");
    await expect(page).toHaveURL(/ordem=price-desc/);
    const first = page.getByRole("article").first();
    // o título pode trazer "(destaque)" só para leitores de tela
    await expect(first.getByRole("heading")).toHaveText(/^Croissant de Pistache/);

    await page.goto("/cardapio");
    await page.getByLabel("Buscar produtos").fill("zzzxyz");
    await expect(page.getByText("Nada encontrado por aqui")).toBeVisible();
  });

  test("adiciona ao carrinho, mantém após recarregar e remove", async ({ page }) => {
    await page.goto("/produto/croissant-de-manteiga");
    await page.getByRole("button", { name: "Aumentar quantidade" }).click();
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
    await expect(page.getByRole("button", { name: "Abrir carrinho, 2 itens" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Abrir carrinho, 2 itens" })).toBeVisible();

    await page.getByRole("button", { name: "Abrir carrinho, 2 itens" }).click();
    const drawer = page.getByRole("dialog", { name: "Carrinho de compras" });
    await expect(drawer).toContainText("R$ 25,80");
    await drawer.getByRole("button", { name: /Remover Croissant de Manteiga/ }).click();
    await expect(drawer.getByText("Seu carrinho está vazio")).toBeVisible();
  });

  test("produto indisponível não pode ser comprado", async ({ page }) => {
    await page.goto("/produto/folhado-de-espinafre");
    await expect(page.getByRole("button", { name: "Indisponível" }).first()).toBeDisabled();
  });
});
