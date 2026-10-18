import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeRedirectPath("/conta/pedidos?x=1")).toBe("/conta/pedidos?x=1");
  });

  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", "conta", "/a\nb"])(
    "bloqueia %j",
    (v) => {
      expect(safeRedirectPath(v, "/")).toBe("/");
    },
  );

  it("usa o fallback para tipos inválidos", () => {
    expect(safeRedirectPath(undefined, "/conta")).toBe("/conta");
    expect(safeRedirectPath(42, "/conta")).toBe("/conta");
  });
});
