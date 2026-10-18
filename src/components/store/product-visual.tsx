import { Cake, Coffee, CookingPot, Croissant, Cookie, GlassWater, Package, Sandwich, Wheat } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

const byCategory: Record<string, { Icon: ComponentType<{ size?: number; strokeWidth?: number }>; bg: string }> = {
  "paes-artesanais": { Icon: Wheat, bg: "from-[#e8d8c3] to-[#c68b59]/60" },
  croissants: { Icon: Croissant, bg: "from-[#f0dfc4] to-[#c68b59]/70" },
  bolos: { Icon: Cake, bg: "from-[#f3e2d3] to-[#d9a38a]/70" },
  doces: { Icon: Cookie, bg: "from-[#efe0cf] to-[#a9744a]/60" },
  cafes: { Icon: Coffee, bg: "from-[#d9c3a8] to-[#3e2723]/50" },
  bebidas: { Icon: GlassWater, bg: "from-[#e5e8d4] to-[#66704b]/50" },
  salgados: { Icon: Sandwich, bg: "from-[#ecdcc2] to-[#8a6a3d]/50" },
  combos: { Icon: Package, bg: "from-[#e8d8c3] to-[#66704b]/50" },
};

interface ProductVisualProps {
  categorySlug: string;
  imageUrl?: string | null;
  alt: string;
  className?: string;
  iconSize?: number;
}

/**
 * Mostra a foto do produto; sem foto cadastrada, exibe uma ilustração de
 * fallback com a cor da categoria (as fotos reais entram via upload no admin).
 */
export function ProductVisual({ categorySlug, imageUrl, alt, className, iconSize = 64 }: ProductVisualProps) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={alt} loading="lazy" className={cn("h-full w-full object-cover", className)} />;
  }
  const { Icon, bg } = byCategory[categorySlug] ?? { Icon: CookingPot, bg: "from-beige to-caramel/50" };
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br text-coffee/40", bg, className)}
    >
      <Icon size={iconSize} strokeWidth={1.1} />
    </div>
  );
}
