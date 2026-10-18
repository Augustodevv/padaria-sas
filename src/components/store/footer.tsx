import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-coffee text-cream">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-3xl">
            Maison <span className="font-editorial italic text-caramel">du</span> Pain
          </p>
          <p className="mt-4 max-w-sm text-cream/70">
            Padaria artesanal de inspiração francesa. Fermentação lenta, manteiga de verdade e
            muito carinho em cada fornada.
          </p>
        </div>
        <div>
          <h3 className="font-editorial text-xl italic text-caramel">Navegue</h3>
          <ul className="mt-4 space-y-2 text-sm text-cream/80">
            <li><Link href="/cardapio" className="hover:text-caramel">Cardápio</Link></li>
            <li><Link href="/#historia" className="hover:text-caramel">Nossa história</Link></li>
            <li><Link href="/entrar" className="hover:text-caramel">Minha conta</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-editorial text-xl italic text-caramel">Contato</h3>
          <ul className="mt-4 space-y-2 text-sm text-cream/80">
            <li>Rua das Padarias, 123</li>
            <li>São Paulo, SP</li>
            <li>(11) 99999-0000</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/10 py-6 text-center text-xs text-cream/50">
        © Maison du Pain — projeto de portfólio com dados fictícios.
      </div>
    </footer>
  );
}
