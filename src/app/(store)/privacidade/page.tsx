import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como a Maison du Pain trata seus dados pessoais, conforme a LGPD.",
  alternates: { canonical: "/privacidade" },
};

const sections: { title: string; body: React.ReactNode }[] = [
  {
    title: "Quais dados coletamos",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Cadastro: nome, email, telefone (opcional) e senha (guardada apenas como hash, nunca em texto).</li>
        <li>Pedidos: itens, valores, horário escolhido, endereço de entrega e observações.</li>
        <li>Navegação: o carrinho fica no seu navegador (armazenamento local) e um cookie de sessão necessário para manter o login.</li>
      </ul>
    ),
  },
  {
    title: "Para que usamos",
    body: <p>Criar sua conta, processar e entregar pedidos, enviar avisos sobre o pedido e recuperar sua senha. Não vendemos nem compartilhamos dados para publicidade.</p>,
  },
  {
    title: "Base legal",
    body: <p>Execução do contrato (seu pedido), cumprimento de obrigação legal (registros fiscais) e, quando aplicável, seu consentimento (como a newsletter).</p>,
  },
  {
    title: "Com quem compartilhamos",
    body: (
      <p>
        Com o Mercado Pago, que processa o pagamento. Os dados de cartão são informados diretamente no ambiente do Mercado Pago e{" "}
        <strong>nunca passam pelos nossos servidores</strong>. Também usamos provedores de hospedagem e banco de dados para operar a loja.
      </p>
    ),
  },
  {
    title: "Por quanto tempo guardamos",
    body: <p>Dados de conta enquanto ela existir. Pedidos são mantidos pelo prazo exigido pela legislação fiscal e contábil.</p>,
  },
  {
    title: "Seus direitos",
    body: (
      <p>
        Você pode pedir confirmação do tratamento, acesso, correção, anonimização, portabilidade, eliminação e informações sobre compartilhamento (art. 18 da LGPD).
        Escreva para o contato abaixo.
      </p>
    ),
  },
  {
    title: "Contato do encarregado (DPO)",
    body: <p>privacidade@maisondupain.example</p>,
  },
];

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-32">
      <p className="font-editorial text-xl italic text-caramel-deep">LGPD</p>
      <h1 className="mt-1 font-display text-4xl sm:text-5xl">Política de privacidade</h1>
      <p className="mt-4 rounded-2xl bg-beige/60 p-4 text-sm text-coffee/80">
        Este é um projeto de portfólio com dados fictícios. O texto abaixo é um modelo de referência e não substitui revisão jurídica antes de uso comercial.
      </p>
      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="font-display text-2xl">{s.title}</h2>
            <div className="mt-2 space-y-2 text-coffee/80">{s.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
