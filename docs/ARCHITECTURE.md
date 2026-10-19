# Maison du Pain — Arquitetura e Plano

## Decisões

| Tema | Escolha | Motivo |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | SSR/SEO, Server Actions, deploy Vercel |
| Estilo | Tailwind CSS + shadcn/ui | Design system próprio sobre primitivos acessíveis |
| Animação | Motion (padrão) + GSAP/ScrollTrigger (só parallax/storytelling) | Bundle enxuto |
| Banco | PostgreSQL + Prisma | Migrations, tipos, relações |
| Auth | Sessão própria: JWT (jose) em cookie httpOnly + bcryptjs; RBAC server-side | Sem dependência beta do Auth.js no Next 16; CUSTOMER / STAFF / ADMIN. O papel é sempre relido do banco nos guards |
| Dinheiro | Inteiros em centavos | Sem erro de ponto flutuante |
| Pagamento | Mercado Pago sandbox | Webhook com assinatura + idempotência |
| Imagens | Cloudinary (upload assinado) | Admin sem tocar no disco |
| Testes | Vitest (regras) + Playwright (fluxos) | Cobre preço, cupom, pedido, permissões |

## Regras de arquitetura

1. **Regra de negócio fora das rotas.** `src/server/services/*` contém a lógica (preço, cupom, pedido, pagamento). Rotas/Server Actions só validam entrada (Zod), autorizam e chamam o serviço.
2. **Acesso a dados isolado.** `src/server/repositories/*` é o único lugar que importa o Prisma.
3. **Preço sempre recalculado no servidor** a partir do banco. O carrinho do cliente só envia `productId` + `quantity`.
4. **Autorização por recurso** em `src/server/auth/policies.ts`; o middleware só faz a primeira barreira.
5. **OrderItem guarda snapshot** (nome, preço unitário) no momento da compra.
6. **Webhook idempotente**: `Payment.providerEventId` único + transição de status validada.

## Estrutura de pastas

```
maison-du-pain/
├─ prisma/            schema.prisma, migrations/, seed.ts
├─ docs/              ARCHITECTURE.md
├─ e2e/               testes Playwright
├─ public/            imagens estáticas, og-image
├─ src/
│  ├─ app/
│  │  ├─ (store)/     home, cardapio, produto/[slug], carrinho, checkout, conta/*
│  │  ├─ (auth)/      entrar, cadastrar, recuperar-senha
│  │  ├─ admin/       dashboard, produtos, pedidos, clientes, cupons, config
│  │  ├─ api/         webhooks/mercadopago, upload/sign, auth/[...nextauth]
│  │  ├─ sitemap.ts, robots.ts
│  ├─ components/
│  │  ├─ ui/          primitivos shadcn
│  │  ├─ store/       header, hero, product-card, cart-drawer...
│  │  ├─ admin/       sidebar, charts, tabelas
│  │  └─ motion/      Reveal, Stagger, Parallax, PageTransition
│  ├─ server/
│  │  ├─ services/    pricing, cart, coupon, order, payment
│  │  ├─ repositories/
│  │  ├─ auth/        config, policies, rate-limit
│  │  └─ integrations/ mercadopago, cloudinary, email
│  ├─ lib/            utils, money, env, logger
│  ├─ validators/     schemas Zod
│  ├─ types/
│  └─ tests/          unit (Vitest)
```

## Banco em desenvolvimento

- **Sem Docker:** `npm run db:local` sobe um Postgres embutido (porta 5433, dados em `%LOCALAPPDATA%/maison-du-pain/pgdata`).
  Depois: `npm run db:migrate` e `npm run db:seed`. `DATABASE_URL` em `.env` (veja `.env.example`).
- **Com Docker:** `docker compose up -d` (porta 5432).
- **Supabase (produção/staging):** use o *Session pooler* (IPv4). A migration já habilita RLS em todas as tabelas;
  o Prisma conecta como `postgres` e ignora o RLS, enquanto a API REST do Supabase fica sem acesso.

## Pedidos e pagamentos

- **Preço sempre do servidor.** `quoteOrder` recalcula itens, cupom e frete a partir do banco; o cliente só envia `productId` e quantidade.
  O item do pedido guarda snapshot de nome e preço.
- **Idempotência.** `Order.idempotencyKey` é única: reenvio do checkout devolve o mesmo pedido, e a chave de um usuário não serve para outro.
- **Cupom atômico.** O contador é incrementado com `UPDATE ... WHERE usedCount < maxUses` na mesma transação do pedido; um uso por cliente.
- **Pagamento.** O pedido nasce `PENDING_PAYMENT` com um `Payment` pendente. O webhook (`/api/webhooks/mercadopago`) valida a assinatura HMAC,
  busca o pagamento na API (não confia no corpo), confere o valor contra o total do pedido e aplica o evento com a linha do pedido travada (`FOR UPDATE`).
  Eventos repetidos viram no-op e eventos atrasados nunca regridem o status.
- **Modos.** Com `MERCADOPAGO_ACCESS_TOKEN` (credencial **TEST-** = sandbox) usa o Checkout Pro. Sem token, **só em desenvolvimento**, entra o modo simulado
  (botão "simular pagamento aprovado"); em produção a ausência do token é erro. O retorno automático e as notificações exigem URL pública https.
- **Pendências conhecidas:** devolver o uso do cupom quando o pedido é cancelado (Fase 5) e trocar o rate limit em memória por Redis em produção.

## Painel administrativo (`/admin`)

- **Papéis.** STAFF vê dashboard, pedidos, clientes e produtos (leitura) e muda o status dos pedidos. ADMIN também gerencia produtos, cupons e configurações.
  A matriz está em `server/auth/policies.ts` e é testada.
- **Autorização em camadas.** O layout é só a primeira barreira. Cada página chama `requirePermission(...)` e cada Server Action chama `authorize(...)`,
  que relê o usuário do banco. Redirects de páginas protegidas chegam no stream (status HTTP 200 + redirecionamento); nenhum dado é enviado.
- **Pedidos.** Máquina de estados em `order-transitions.ts` (um passo por vez ou cancelar). A transição roda com a linha do pedido travada,
  grava `AuditLog` e, ao cancelar, devolve o cupom. Confirmar manualmente um pedido sem pagamento online fica marcado na auditoria.
  Reembolso no Mercado Pago ainda é manual (a auditoria marca `refundPending`).
- **Dashboard.** Receita, pedidos e ticket médio contam só `CONFIRMED → DELIVERED`, com variação contra o período anterior; série diária no fuso de São Paulo.
  Gráficos em SVG próprio, uma série, tooltip, teclado e tabela alternativa. Cor de marca das marcas: `#A06430` (o caramelo `#C68B59` reprova no validador de contraste).
- **Produtos.** Arquivar em vez de excluir (pedidos mantêm o snapshot). Imagens por URL https; upload via Cloudinary fica para quando houver credenciais.
- **Formulários.** As actions devolvem os valores enviados (nunca senhas) para o React 19 não limpar o que a pessoa digitou após um erro.

## Segurança, observabilidade e SEO (Fase 6)

- **Cabeçalhos** (`next.config.ts`): CSP (sem `eval` em produção, `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`), HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP; sem `X-Powered-By`.
  `'unsafe-inline'` em script/estilo é uma concessão consciente (hidratação do Next e estilos inline do Motion); o próximo passo seria CSP com nonce via proxy.
- **Ambiente:** `src/lib/env.ts` valida com Zod; `src/instrumentation.ts` impede o servidor de subir em produção com variáveis críticas ausentes (verificado: o `next start` recusa e lista o que falta).
- **Logs:** `src/lib/logger.ts` emite JSON por linha e redige chaves sensíveis (senha, token, cookie, assinatura…), mascara emails e não vaza stack.
- **Imagens:** só `res.cloudinary.com` e `images.unsplash.com` (`src/lib/images.ts`), usadas por `next/image`, pela CSP e pela validação do painel; evita abusar o otimizador com URLs arbitrárias.
- **SEO:** metadata por página, canonical, Open Graph, `opengraph-image`, `sitemap.xml` (com produtos do banco), `robots.txt` (bloqueia admin, checkout e áreas privadas), JSON-LD (`Bakery` na home, `Product` com preço em BRL e disponibilidade) com escape de `<`.
- **Desempenho:** entrada do hero em CSS (o `<h1>` do LCP não espera hidratação), gradiente no lugar de `filter: blur`, uma fonte editorial em vez de seis, e altura mínima de uma tela nas páginas em streaming (rodapé não salta, CLS 0).
- **Limitação conhecida:** redirecionamentos e 404 de páginas em streaming chegam com status 200 (sem vazar dados). Um `proxy.ts` com checagem de sessão resolveria os redirecionamentos de visitantes.

## Testes

- `npm test`: unitários (regras puras: preço, cupom, agenda, entrega, status, assinatura, políticas, validators).
- `npm run test:int`: integração contra Postgres real (precisa de `db:local`, `db:migrate`, `db:seed`): preço do banco, snapshot, idempotência,
  cupom com concorrência, valor divergente, eventos de pagamento repetidos/simultâneos/atrasados.

## Fases

1. **Planejamento/Setup** — projeto, design system, Prisma schema, docker-compose, env.
2. **Frontend** — home, catálogo, produto, animações, responsividade.
3. **Backend** — migrations, seed, auth, serviços, APIs.
4. **E-commerce** — carrinho, checkout, pedidos, Mercado Pago sandbox.
5. **Admin** — dashboard, CRUD, pedidos, clientes, cupons, config.
6. **Finalização** — testes, segurança, SEO, performance, README, deploy.

Cada fase termina com lint + typecheck + build + testes e um commit.
