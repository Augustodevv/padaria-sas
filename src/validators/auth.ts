import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Informe um email válido.")
  .max(254, "Email muito longo.");

// bcrypt só considera os primeiros 72 bytes; limitamos para não aceitar senha "truncada".
const password = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Use letras e números na senha.");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome.").max(80, "Nome muito longo."),
    email,
    phone: z
      .string()
      .trim()
      .regex(/^[\d\s()+-]{8,20}$/, "Telefone inválido.")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe a senha.").max(72),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
