import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema, resetPasswordSchema } from "./auth";

const valid = {
  name: "Maria Silva",
  email: "  Maria@Example.COM ",
  password: "padaria123",
  confirmPassword: "padaria123",
};

describe("registerSchema", () => {
  it("normaliza o email e aceita dados válidos", () => {
    const r = registerSchema.parse(valid);
    expect(r.email).toBe("maria@example.com");
  });

  it.each([
    ["senha curta", { password: "abc12", confirmPassword: "abc12" }],
    ["senha sem número", { password: "somenteletras", confirmPassword: "somenteletras" }],
    ["senha sem letra", { password: "123456789", confirmPassword: "123456789" }],
    ["senha acima de 72", { password: "a1".repeat(40), confirmPassword: "a1".repeat(40) }],
    ["confirmação diferente", { confirmPassword: "outra1234" }],
    ["email inválido", { email: "nao-e-email" }],
    ["nome vazio", { name: " " }],
  ])("rejeita: %s", (_, patch) => {
    expect(registerSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("exige email e senha", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });
});

describe("resetPasswordSchema", () => {
  it("rejeita token curto demais", () => {
    expect(
      resetPasswordSchema.safeParse({ token: "curto", password: "padaria123", confirmPassword: "padaria123" }).success,
    ).toBe(false);
  });
});
