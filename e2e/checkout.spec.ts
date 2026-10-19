import { expect, test } from "./fixtures";
import { addProductToCart, registerCustomer } from "./helpers";

test.describe("Autenticação e checkout", () => {
  test("checkout exige login e volta para o destino depois", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/entrar\?next=%2Fcheckout/);
  });

  test("cadastro com dados inválidos mantém o que foi digitado", async ({ page }) => {
    await page.goto("/cadastrar");
    await page.getByLabel("Nome", { exact: true }).fill("Maria");
    await page.getByLabel("Email").fill("email-invalido");
    await page.getByLabel(/^Senha/).fill("abc");
    await page.getByLabel("Confirmar senha").fill("xyz");
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page.getByText("Informe um email válido.")).toBeVisible();
    await expect(page.getByText("As senhas não coincidem.")).toBeVisible();
    await expect(page.getByLabel("Nome", { exact: true })).toHaveValue("Maria");
    await expect(page.getByLabel("Email")).toHaveValue("email-invalido");
  });

  test("cliente compra com cupom, paga (simulado) e vê o pedido confirmado", async ({ page }) => {
    await registerCustomer(page);
    await addProductToCart(page, "croissant-de-manteiga", 3); // R$ 38,70

    await page.goto("/checkout");
    await expect(page.getByTestId("total")).toHaveText(/38,70/);

    await page.getByLabel("Cupom").fill("bemvindo10");
    await page.getByRole("button", { name: "Aplicar" }).click();
    await expect(page.getByText("Cupom aplicado.")).toBeVisible();
    await expect(page.getByTestId("total")).toHaveText(/34,83/); // −10%

    await page.getByRole("button", { name: "Confirmar e pagar" }).click();
    await expect(page).toHaveURL(/\/pedido\/[a-z0-9]+$/, { timeout: 60_000 }); // 1ª compilação da rota no modo dev
    await expect(page.getByRole("heading", { name: "Falta o pagamento" })).toBeVisible();

    // Só existe em desenvolvimento sem token do Mercado Pago.
    const simulate = page.getByRole("button", { name: /simular pagamento aprovado/ });
    test.skip(!(await simulate.isVisible()), "Mercado Pago real configurado: sem modo simulado");
    await simulate.click();

    await expect(page.getByRole("heading", { name: "Pedido confirmado!" })).toBeVisible();
    await expect(page.getByLabel("Pedido confirmado")).toBeVisible();

    await page.goto("/conta");
    await expect(page.getByRole("link", { name: /Pedido #\d+/ }).first()).toContainText("Confirmado");
  });

  test("um cliente não enxerga o pedido de outro", async ({ page, context }) => {
    await registerCustomer(page, "Dona do Pedido");
    await addProductToCart(page, "baguete-tradicional", 1);
    await page.goto("/checkout");
    await page.getByRole("button", { name: "Confirmar e pagar" }).click();
    await expect(page).toHaveURL(/\/pedido\/[a-z0-9]+$/, { timeout: 60_000 });
    const orderUrl = page.url();

    await context.clearCookies();
    await registerCustomer(page, "Intrusa");
    await page.goto(orderUrl);
    await expect(page.getByRole("heading", { name: /não está no cardápio/ })).toBeVisible();
    await expect(page.getByText("Baguete Tradicional")).toHaveCount(0);
  });
});
