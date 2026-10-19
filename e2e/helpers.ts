import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Teste12345";

export function uniqueEmail(tag = "e2e") {
  return `${tag}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** Cria uma conta de cliente pela interface e deixa a sessão aberta. */
export async function registerCustomer(page: Page, name = "Cliente E2E") {
  const email = uniqueEmail();
  await page.goto("/cadastrar");
  await page.getByLabel("Nome", { exact: true }).fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Senha/).fill(PASSWORD);
  await page.getByLabel("Confirmar senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/conta$/);
  return email;
}

export async function login(page: Page, email: string, password: string, next?: string) {
  await page.goto(next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

export async function addProductToCart(page: Page, slug: string, quantity = 1) {
  await page.goto(`/produto/${slug}`);
  for (let i = 1; i < quantity; i++) await page.getByRole("button", { name: "Aumentar quantidade" }).click();
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.getByRole("button", { name: /Abrir carrinho, \d+ (item|itens)/ })).toBeVisible();
}
