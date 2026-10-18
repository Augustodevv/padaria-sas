import { formatBRL } from "@/lib/money";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-editorial text-xl italic text-caramel">
        Padaria artesanal
      </p>
      <h1 className="font-display text-5xl text-coffee sm:text-7xl">
        Maison du Pain
      </h1>
      <p className="max-w-md text-coffee/70">
        O sabor que transforma seus momentos. Croissant a partir de{" "}
        {formatBRL(1290)}.
      </p>
    </main>
  );
}
