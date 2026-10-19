/**
 * Tamanho do pool de conexões por instância do app.
 * Em serverless (Vercel) cada instância abre o próprio pool; vários pools grandes esgotam o pooler do banco.
 * Padrão: 3 em produção, 10 em desenvolvimento. Ajustável com DB_POOL_MAX (inteiro de 1 a 50).
 */
export function poolSize(env: { DB_POOL_MAX?: string; NODE_ENV?: string }): number {
  const fallback = env.NODE_ENV === "production" ? 3 : 10;
  const raw = env.DB_POOL_MAX?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 50 ? n : fallback;
}
