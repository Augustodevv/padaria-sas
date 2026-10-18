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
