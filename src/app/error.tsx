"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // O detalhe fica no log do servidor; aqui só o identificador para suporte.
    console.error("ui.error", error.digest);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70svh] max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="font-editorial text-xl italic text-caramel-deep">Algo saiu do forno errado</p>
      <h1 className="font-display text-4xl">Não conseguimos carregar esta página</h1>
      <p className="text-coffee/70">
        Já registramos o problema. Tente de novo em instantes ou volte para o início.
        {error.digest && <span className="mt-2 block text-xs text-coffee/70">Código: {error.digest}</span>}
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="rounded-full bg-coffee px-6 py-3 text-sm font-medium text-cream hover:bg-caramel-deep">
          Tentar de novo
        </button>
        <Link href="/" className="rounded-full border border-coffee/40 px-6 py-3 text-sm font-medium hover:bg-beige">
          Ir para o início
        </Link>
      </div>
    </main>
  );
}
