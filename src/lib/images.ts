/**
 * Hosts de imagem aceitos. Fonte única para: next.config (remotePatterns + CSP) e validação do painel.
 * Restringir evita que o otimizador do Next seja usado para buscar URLs arbitrárias (SSRF/abuso).
 */
export const ALLOWED_IMAGE_HOSTS = ["res.cloudinary.com", "images.unsplash.com"] as const;

export function isAllowedImageUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password && (ALLOWED_IMAGE_HOSTS as readonly string[]).includes(u.hostname);
  } catch {
    return false;
  }
}
