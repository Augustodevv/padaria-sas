import { expect, test as base } from "@playwright/test";

/**
 * `test` com uma verificação automática: erros de hidratação do React (HTML do servidor diferente do
 * cliente) fazem o teste falhar. Eles não quebram a tela, mas custam desempenho e indicam bugs de SSR.
 */
export const test = base.extend<{ hydrationGuard: void }>({
  hydrationGuard: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error" && /hydrat/i.test(m.text())) problems.push(m.text().slice(0, 200));
      });
      page.on("pageerror", (e) => {
        if (/hydrat/i.test(e.message)) problems.push(e.message.slice(0, 200));
      });
      await use();
      expect(problems, "erros de hidratação no navegador").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
