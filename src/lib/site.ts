export const SITE_NAME = "Maison du Pain";
export const SITE_DESCRIPTION =
  "Padaria artesanal de inspiração francesa: pães de fermentação lenta, croissants de manteiga, bolos e doces feitos todos os dias. Peça online e retire na loja ou receba em casa.";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function absoluteUrl(path = "/"): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
