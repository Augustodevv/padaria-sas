import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  // Os testes compartilham um banco e criam usuários únicos; rodar em série mantém tudo previsível.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    // Localmente usa o Chrome instalado (sem baixar navegador); no CI usa o Chromium do Playwright.
    channel: process.env.CI ? undefined : "chrome",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], channel: process.env.CI ? undefined : "chrome" } }],
  // O modo de pagamento simulado só existe em desenvolvimento, por isso o servidor é o `next dev`.
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
