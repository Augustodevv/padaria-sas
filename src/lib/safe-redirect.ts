/** Aceita apenas caminhos internos ("/conta"), evitando open redirect. */
export function safeRedirectPath(input: unknown, fallback = "/"): string {
  if (typeof input !== "string") return fallback;
  if (!input.startsWith("/") || input.startsWith("//") || input.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(input)) return fallback;
  return input;
}
