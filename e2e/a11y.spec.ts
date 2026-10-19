import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

const pages = [
  ["home", "/"],
  ["cardápio", "/cardapio"],
  ["produto", "/produto/croissant-de-manteiga"],
  ["entrar", "/entrar"],
  ["cadastrar", "/cadastrar"],
  ["privacidade", "/privacidade"],
] as const;

test.describe("Acessibilidade (axe, WCAG 2 A/AA)", () => {
  for (const [name, path] of pages) {
    test(`${name}: sem violações sérias ou críticas`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      // as animações de entrada terminam em ~1s; o axe precisa medir contraste com a cor final
      await page.waitForTimeout(1500);

      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(
        serious.map(
          (v) =>
            `${v.id} (${v.impact}): ${v.nodes.length} elemento(s) — ` +
            v.nodes
              .slice(0, 6)
              .map((n) => `${n.target.join(" ")} [${n.any[0]?.message ?? ""}]`)
              .join(" | "),
        ),
      ).toEqual([]);
    });
  }
});
