import { expect, test } from "./fixtures";
import { login, registerCustomer } from "./helpers";

test.describe("Painel: controle de acesso", () => {
  test("visitante é levado ao login e cliente é barrado do painel", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/entrar\?next=%2Fadmin/);

    await registerCustomer(page);
    for (const path of ["/admin", "/admin/pedidos", "/admin/cupons", "/admin/configuracoes"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/localhost:\d+\/$/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("O sabor que transforma seus momentos");
    }
  });
});

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.describe("Painel: administrador", () => {
  test.skip(!adminEmail || !adminPassword, "Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD (veja SEED_DEMO_PASSWORD no README)");

  test("navega pelo painel e vê dashboard, pedidos, produtos, cupons e configurações", async ({ page }) => {
    await login(page, adminEmail!, adminPassword!, "/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Faturamento", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: /Faturamento por dia/ })).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Painel" });
    for (const [label, heading] of [
      ["Pedidos", "Pedidos"],
      ["Produtos", "Produtos"],
      ["Clientes", "Clientes"],
      ["Cupons", "Cupons"],
      ["Configurações", "Configurações"],
    ] as const) {
      await nav.getByRole("link", { name: label }).click();
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    }
  });

  test("cria e arquiva um produto; a loja reflete a mudança", async ({ page }) => {
    const name = `Produto E2E ${Date.now()}`;
    await login(page, adminEmail!, adminPassword!, "/admin/produtos/novo");

    await page.getByLabel("Nome").fill(name);
    await page.getByLabel("Categoria").selectOption({ label: "Doces" });
    await page.getByLabel("Descrição").fill("Produto criado pelo teste automatizado.");
    await page.getByLabel("Preço (R$)").fill("9,90");
    await page.getByRole("button", { name: "Criar produto" }).click();
    await expect(page.getByText("Produto salvo.")).toBeVisible();

    await page.goto(`/cardapio?q=${encodeURIComponent(name)}`);
    await expect(page.getByRole("heading", { name })).toBeVisible();

    await page.goto("/admin/produtos");
    const row = page.getByRole("row").filter({ hasText: name });
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: "Arquivar" }).click();
    // espera a ação concluir (a linha sai da lista de ativos) antes de navegar; senão a navegação pode interrompê-la
    await expect(page.getByRole("row").filter({ hasText: name })).toHaveCount(0);

    await page.goto(`/cardapio?q=${encodeURIComponent(name)}`);
    // #conteudo: o React mantém uma cópia oculta da página anterior durante a navegação
    await expect(page.locator("#conteudo").getByText("Nada encontrado por aqui")).toBeVisible();
  });
});
