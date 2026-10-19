/** Falha rápido no boot do servidor quando o ambiente de produção está incompleto. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Durante `next build` as variáveis de runtime podem não existir (ex.: CI).
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { parseEnv } = await import("@/lib/env");
  const result = parseEnv(process.env);
  if (result.ok) return;

  const message = `Configuração de ambiente inválida:\n - ${result.errors.join("\n - ")}`;
  if (process.env.NODE_ENV === "production") throw new Error(message);
  console.warn(`[env] ${message}`);
}
