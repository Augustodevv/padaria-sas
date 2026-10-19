"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

interface Props {
  categories: { slug: string; name: string }[];
}

const sorts = [
  ["popular", "Mais populares"],
  ["price-asc", "Menor preço"],
  ["price-desc", "Maior preço"],
  ["name", "Nome (A–Z)"],
] as const;

export function CatalogFilters({ categories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const category = params.get("categoria") ?? "";
  const sort = params.get("ordem") ?? "popular";

  function update(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    startTransition(() => router.replace(`${pathname}?${sp.toString()}`, { scroll: false }));
  }

  // busca com debounce
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => update({ q: q.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="space-y-6" aria-busy={pending}>
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-coffee/70" size={18} />
          <label htmlFor="busca" className="sr-only">Buscar produtos</label>
          <input
            id="busca"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar pães, croissants, bolos…"
            className="w-full rounded-full border border-beige bg-white py-3.5 pl-12 pr-5 shadow-soft"
          />
        </div>
        <div>
          <label htmlFor="ordem" className="sr-only">Ordenar por</label>
          <select
            id="ordem"
            value={sort}
            onChange={(e) => update({ ordem: e.target.value === "popular" ? "" : e.target.value })}
            className="w-full rounded-full border border-beige bg-white px-5 py-3.5 shadow-soft md:w-auto"
          >
            {sorts.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-2" role="group" aria-label="Filtrar por categoria">
        {[{ slug: "", name: "Todos" }, ...categories].map((c) => (
          <button
            key={c.slug}
            onClick={() => update({ categoria: c.slug })}
            aria-pressed={category === c.slug}
            className={cn(
              "shrink-0 rounded-full border px-5 py-2 text-sm font-medium transition-colors",
              category === c.slug
                ? "border-coffee bg-coffee text-cream"
                : "border-beige bg-white hover:border-caramel",
            )}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
