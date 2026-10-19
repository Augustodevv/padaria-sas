/**
 * Logs estruturados (uma linha JSON por evento) com redação de dados sensíveis.
 * Nunca registre senhas, tokens, cookies nem dados de cartão; o redator é a rede de segurança, não a regra.
 */
type Level = "info" | "warn" | "error";

const SECRET_KEY = /pass(word)?|senha|token|secret|authorization|cookie|api[-_]?key|card|cvv|cpf|signature/i;
const EMAIL = /^([^@\s])[^@\s]*(@[^@\s]+)$/;

function maskEmail(v: string): string {
  return v.replace(EMAIL, "$1***$2");
}

export function redact(value: unknown, key = "", depth = 0): unknown {
  if (value == null) return value;
  if (SECRET_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string") return /email/i.test(key) ? maskEmail(value) : value.length > 500 ? `${value.slice(0, 500)}…` : value;
  if (typeof value !== "object") return value;
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (depth >= 4) return "[Object]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, key, depth + 1));
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, redact(v, k, depth + 1)]));
}

export function formatLog(level: Level, event: string, fields: Record<string, unknown> = {}, now = new Date()): string {
  return JSON.stringify({ level, event, time: now.toISOString(), ...(redact(fields) as object) });
}

function emit(level: Level, event: string, fields?: Record<string, unknown>) {
  const line = formatLog(level, event, fields);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  info: (event: string, fields?: Record<string, unknown>) => emit("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit("error", event, fields),
};
