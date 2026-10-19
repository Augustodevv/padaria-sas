import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70svh] max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="font-editorial text-xl italic text-caramel-deep">404</p>
      <h1 className="font-display text-4xl">Essa página não está no cardápio</h1>
      <p className="text-coffee/70">O endereço pode ter mudado ou o produto saiu de linha.</p>
      <div className="flex gap-3">
        <Link href="/cardapio" className="rounded-full bg-coffee px-6 py-3 text-sm font-medium text-cream hover:bg-caramel-deep">
          Ver o cardápio
        </Link>
        <Link href="/" className="rounded-full border border-coffee/40 px-6 py-3 text-sm font-medium hover:bg-beige">
          Ir para o início
        </Link>
      </div>
    </main>
  );
}
