/**
 * Gera os screenshots do README em docs/screenshots (reprodutível).
 *
 * Pré-requisitos: servidor rodando (npm run dev), banco com seed e um admin de demonstração:
 *   SEED_DEMO_PASSWORD="UmaSenha123" npm run db:seed
 *   RATE_LIMIT_DISABLED=1 npm run dev          (evita o limite de cadastro/login durante a captura)
 *   SCREENSHOT_ADMIN_EMAIL=admin@maisondupain.example SCREENSHOT_ADMIN_PASSWORD="UmaSenha123" npm run screenshots
 *
 * Usa o Chrome instalado (CI/Linux: defina SCREENSHOT_CHANNEL="" para usar o Chromium do Playwright).
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.SCREENSHOT_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SCREENSHOT_ADMIN_PASSWORD;
const CHANNEL = process.env.SCREENSHOT_CHANNEL === undefined ? "chrome" : process.env.SCREENSHOT_CHANNEL || undefined;
const OUT = path.resolve("docs/screenshots");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: CHANNEL });

async function context(viewport) {
  // reducedMotion: conteúdo visível de imediato (sem esperar animações de entrada) e capturas determinísticas
  return browser.newContext({ baseURL: BASE, viewport, reducedMotion: "reduce", locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
}

async function shot(page, name, { full = false } = {}) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 82, fullPage: full });
  console.log("ok", name);
}

const stamp = Date.now();
const password = "Teste12345";

// ── Loja (desktop) ────────────────────────────────────────────────────────────
const desktop = await context({ width: 1440, height: 900 });
const page = await desktop.newPage();

await page.goto("/");
await shot(page, "01-home");
await shot(page, "02-home-completa", { full: true });

await page.goto("/cardapio?categoria=croissants");
await page.getByRole("article").first().waitFor({ timeout: 60_000 });
await shot(page, "03-cardapio");

await page.goto("/produto/croissant-de-manteiga");
await shot(page, "04-produto");

// cadastro + carrinho + checkout + pedido
await page.goto("/cadastrar");
await page.getByLabel("Nome", { exact: true }).fill("Mariana Souza");
await page.getByLabel("Email").fill(`mariana.${stamp}@example.com`);
await page.getByLabel(/^Senha/).fill(password);
await page.getByLabel("Confirmar senha").fill(password);
await page.getByRole("button", { name: "Criar conta" }).click();
await page.waitForURL(/\/conta$/);

await page.goto("/produto/croissant-de-manteiga");
await page.getByRole("button", { name: "Aumentar quantidade" }).click();
await page.getByRole("button", { name: "Aumentar quantidade" }).click();
await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
await page.goto("/produto/pao-de-fermentacao-natural");
await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
await page.getByRole("button", { name: /Abrir carrinho/ }).click();
await page.getByRole("dialog", { name: "Carrinho de compras" }).waitFor();
await shot(page, "05-carrinho");

await page.goto("/checkout");
await page.getByLabel("Cupom").fill("bemvindo10");
await page.getByRole("button", { name: "Aplicar" }).click();
await page.getByText("Cupom aplicado.").waitFor();
await shot(page, "06-checkout");

await page.getByRole("button", { name: "Confirmar e pagar" }).click();
await page.waitForURL(/\/pedido\/[a-z0-9]+$/, { timeout: 60_000 });
const simulate = page.getByRole("button", { name: /simular pagamento aprovado/ });
if (await simulate.isVisible().catch(() => false)) {
  await simulate.click();
  await page.getByRole("heading", { name: "Pedido confirmado!" }).waitFor();
}
await shot(page, "07-pedido-confirmado");
await desktop.close();

// ── Painel (admin) ────────────────────────────────────────────────────────────
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  const adminCtx = await context({ width: 1440, height: 900 });
  const admin = await adminCtx.newPage();
  await admin.goto("/entrar?next=%2Fadmin");
  await admin.getByLabel("Email").fill(ADMIN_EMAIL);
  await admin.getByLabel("Senha").fill(ADMIN_PASSWORD);
  await admin.getByRole("button", { name: "Entrar" }).click();
  await admin.getByRole("heading", { level: 1, name: "Dashboard" }).waitFor({ timeout: 60_000 });
  await admin.waitForTimeout(1500); // gráfico termina de desenhar
  await shot(admin, "08-admin-dashboard");

  await admin.goto("/admin/pedidos");
  await admin.getByRole("heading", { level: 1, name: "Pedidos" }).waitFor();
  await shot(admin, "09-admin-pedidos");

  await admin.goto("/admin/produtos");
  await admin.getByRole("heading", { level: 1, name: "Produtos" }).waitFor();
  await shot(admin, "10-admin-produtos");
  await adminCtx.close();
} else {
  console.log("pulando painel: defina SCREENSHOT_ADMIN_EMAIL e SCREENSHOT_ADMIN_PASSWORD");
}

// ── Mobile ───────────────────────────────────────────────────────────────────
const mobile = await context({ width: 390, height: 844 });
const m = await mobile.newPage();
await m.goto("/");
await shot(m, "11-mobile-home");
await m.goto("/cardapio");
await m.getByRole("article").first().waitFor({ timeout: 60_000 });
await shot(m, "12-mobile-cardapio");
await mobile.close();

await browser.close();
console.log(`\nPronto: ${fs.readdirSync(OUT).filter((f) => f.endsWith(".jpg")).length} imagens em docs/screenshots`);
