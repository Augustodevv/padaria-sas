/**
 * Rate limit de janela fixa, em memória.
 * Limitação: o estado é por instância. Em produção (serverless) troque o
 * `store` por Redis/Upstash mantendo a mesma interface.
 */
interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Só para testes automatizados (E2E): ignorado em produção, onde o limite sempre vale. */
const bypassed = () => process.env.RATE_LIMIT_DISABLED === "1" && process.env.NODE_ENV !== "production";

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  if (bypassed()) return { ok: true, remaining: limit, retryAfterSeconds: 0 };

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    if (store.size > 10_000) prune(now);
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (entry.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { ok: true, remaining: limit - entry.count, retryAfterSeconds: 0 };
}

function prune(now: number) {
  for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
}

export function resetRateLimits() {
  store.clear();
}
