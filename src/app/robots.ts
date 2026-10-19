import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/conta", "/checkout", "/pedido/", "/entrar", "/cadastrar", "/recuperar-senha", "/redefinir-senha"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
