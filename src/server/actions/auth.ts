"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/server/auth/password";
import { rateLimit } from "@/server/auth/rate-limit";
import { createSession, destroySession } from "@/server/auth/session";
import { sendPasswordResetEmail } from "@/server/integrations/email";
import {
  consumeResetAndSetPassword,
  createCustomer,
  createPasswordReset,
  findUserByEmail,
  findValidReset,
} from "@/server/repositories/users";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/validators/auth";

export interface FormState {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Valores enviados, devolvidos para repovoar o formulário (o React 19 limpa o form após a action). Nunca inclui senhas. */
  values?: Record<string, string>;
}

function pick(fd: FormData, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = fd.get(k);
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

const MINUTE = 60_000;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

function tooMany(retryAfterSeconds: number): FormState {
  return { error: `Muitas tentativas. Tente novamente em ${Math.ceil(retryAfterSeconds / 60)} min.` };
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ip = await clientIp();
  const limit = rateLimit(`register:${ip}`, 5, 60 * MINUTE);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  const keep = pick(formData, ["name", "email", "phone"]);
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values: keep };

  const { name, email, phone, password } = parsed.data;
  if (await findUserByEmail(email)) {
    return { fieldErrors: { email: ["Este email já está cadastrado."] }, values: keep };
  }

  const user = await createCustomer({ name, email, phone, passwordHash: await hashPassword(password) });
  await createSession({ userId: user.id, role: user.role });
  redirect(safeRedirectPath(formData.get("next"), "/conta"));
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const keep = pick(formData, ["email"]);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values: keep };

  const { email, password } = parsed.data;
  const ip = await clientIp();
  const byIp = rateLimit(`login-ip:${ip}`, 20, 15 * MINUTE);
  const byEmail = rateLimit(`login-email:${email}`, 5, 15 * MINUTE);
  if (!byIp.ok || !byEmail.ok) return { ...tooMany(Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds)), values: keep };

  const user = await findUserByEmail(email);
  const valid = user ? await verifyPassword(password, user.passwordHash) : (await burnPasswordCheck(password), false);
  if (!user || !valid) return { error: "Email ou senha incorretos.", values: keep };

  await createSession({ userId: user.id, role: user.role });
  redirect(safeRedirectPath(formData.get("next"), user.role === "CUSTOMER" ? "/conta" : "/admin"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values: pick(formData, ["email"]) };

  const ip = await clientIp();
  const limit = rateLimit(`forgot:${ip}`, 5, 60 * MINUTE);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  // Resposta idêntica exista o email ou não, para não revelar cadastros.
  const generic: FormState = {
    message: "Se o email estiver cadastrado, enviaremos um link para redefinir a senha.",
  };

  const user = await findUserByEmail(parsed.data.email);
  if (!user) return generic;

  const token = randomBytes(32).toString("base64url");
  await createPasswordReset(user.id, sha256(token), new Date(Date.now() + 60 * MINUTE));

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    await sendPasswordResetEmail(user.email, `${base}/redefinir-senha?token=${token}`);
  } catch (err) {
    console.error("[auth] falha ao enviar email de recuperação", err instanceof Error ? err.message : err);
  }
  return generic;
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ip = await clientIp();
  const limit = rateLimit(`reset:${ip}`, 10, 60 * MINUTE);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const reset = await findValidReset(sha256(parsed.data.token));
  if (!reset) return { error: "Link inválido ou expirado. Peça um novo." };

  await consumeResetAndSetPassword(reset.id, reset.userId, await hashPassword(parsed.data.password));
  redirect("/entrar?redefinida=1");
}
