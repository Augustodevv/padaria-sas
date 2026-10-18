import "server-only";

/**
 * Envio de email transacional. Nesta fase o provedor real (Resend) ainda não
 * está ligado: em desenvolvimento o link é impresso no terminal do servidor;
 * em produção nada é impresso (o link é um segredo) e o envio falha de forma explícita.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[email:dev] Recuperação de senha para ${to}: ${resetUrl}`);
    return;
  }
  throw new Error("Provedor de email não configurado (RESEND_API_KEY).");
}
