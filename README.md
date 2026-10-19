# Maison du Pain

Plataforma completa para uma padaria artesanal francesa: **loja online com checkout e pagamento**, **painel administrativo** e **backend com banco de dados real**. Projeto de portfólio construído para demonstrar engenharia full stack de ponta a ponta (produto, dados, segurança, testes e deploy).

> Todos os produtos, clientes e depoimentos são **dados fictícios** de demonstração.

![CI](https://github.com/OWNER/maison-du-pain/actions/workflows/ci.yml/badge.svg)

## Sumário

1. [Apresentação](#1-apresentação) · 2. [Tecnologias](#2-tecnologias) · 3. [Funcionalidades](#3-funcionalidades) · 4. [Arquitetura](#4-arquitetura) · 5. [Instalação](#5-instalação) · 6. [Variáveis de ambiente](#6-variáveis-de-ambiente) · 7. [Banco de dados](#7-banco-de-dados) · 8. [Migrations](#8-migrations) · 9. [Dados de demonstração](#9-dados-de-demonstração) · 10. [Testes](#10-testes) · 11. [Deploy](#11-deploy) · 12. [Screenshots](#12-screenshots-e-demonstração) · 13. [Melhorias futuras](#13-melhorias-futuras)

---

## 1. Apresentação

Três produtos em um repositório:

| Parte | O que entrega |
|---|---|
| **Loja** | Home editorial com animações, cardápio com busca/filtro/ordenação, página de produto, carrinho lateral, checkout (retirada ou entrega, horário, cupom), pagamento e acompanhamento do pedido |
| **Painel** (`/admin`) | Dashboard com gráficos, gestão de pedidos, produtos, clientes, cupons e configurações da loja, com permissões por papel |
| **Backend** | Autenticação própria, regras de negócio isoladas e testadas, PostgreSQL com Prisma, webhooks de pagamento seguros |

**Decisões que valem destacar**

- O **preço nunca vem do cliente**: o servidor recalcula itens, cupom e frete a partir do banco.
- Pedidos são **idempotentes**, cupons são consumidos de forma **atômica** e eventos de pagamento são aplicados **uma única vez**, mesmo com webhooks repetidos ou simultâneos (há testes de concorrência).
- A autorização é feita **no servidor, em camadas** (layout → página → Server Action). O frontend só esconde botões.

## 2. Tecnologias

| Camada | Escolha |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components) · React 19 · TypeScript |
| Estilo | Tailwind CSS 4 · tokens de design próprios · Lucide Icons |
| Animação | Motion (`motion/react`) com `prefers-reduced-motion` respeitado |
| Validação | Zod (cliente e servidor) |
| Banco | PostgreSQL · Prisma 7 (driver adapter `pg`) |
| Autenticação | JWT (`jose`) em cookie `httpOnly` · senhas com `bcryptjs` (custo 12) |
| Pagamento | Mercado Pago Checkout Pro (sandbox) · webhook com assinatura HMAC |
| Testes | Vitest (unitários e integração) · Playwright + axe (E2E e acessibilidade) |
| CI | GitHub Actions (lint, tipos, testes, build, integração com Postgres, E2E) |

> Autenticação própria em vez do Auth.js: no Next 16 a integração ainda é beta; a solução usada é pequena, auditável e coberta por testes (`src/server/auth`).

## 3. Funcionalidades

**Loja**
- Home com hero animado, destaques por categoria, história, mais vendidos, combos, depoimentos, galeria, newsletter e horário/localização
- Cardápio: busca, filtro por categoria, ordenação por preço/popularidade/nome, produtos indisponíveis
- Produto: ingredientes, alergênicos, quantidade, relacionados, dados estruturados (schema.org)
- Carrinho persistente, cupom, retirada/entrega por bairro com taxa, escolha de horário dentro do expediente
- Conta: cadastro, login, recuperação de senha, histórico de pedidos

**Painel**
- Dashboard: faturamento, pedidos, ticket médio (com variação vs. período anterior), faturamento por dia, mais vendidos, pedidos recentes
- Pedidos: filtro por status, detalhe, máquina de estados (confirmar → preparar → pronto → entregue / cancelar) com auditoria
- Produtos: criar, editar, pausar, arquivar (histórico preservado)
- Clientes, cupons (percentual/fixo, validade, limite de usos, mínimo) e configurações (horários, endereço, bairros e taxas)

**Papéis:** `CUSTOMER`, `STAFF` (opera pedidos, vê clientes/produtos), `ADMIN` (tudo).

## 4. Arquitetura

```
src/
├─ app/            rotas: (store) loja · admin · api/webhooks · sitemap/robots/og
├─ components/     ui da loja, do painel, carrinho, checkout, motion, seo
├─ lib/            utilitários puros (dinheiro, logger, env, seo, imagens, gráficos)
├─ validators/     schemas Zod
└─ server/
   ├─ services/    regras de negócio puras e testadas (preço, cupom, agenda, status…)
   ├─ repositories/ único lugar que usa o Prisma (inclui transações)
   ├─ actions/     Server Actions: validam → autorizam → chamam o serviço
   ├─ auth/        sessão, senha, políticas (RBAC), rate limit, guards
   └─ integrations/ Mercado Pago, e-mail
prisma/            schema, migrations, seed
e2e/               testes Playwright
docs/ARCHITECTURE.md   decisões detalhadas
```

Fluxo de um pedido: `checkout` → `quoteOrder` (preço do banco) → `createOrderTx` (transação: cupom, endereço, itens com *snapshot* de preço, pagamento pendente) → pagamento → webhook (assinatura → busca o pagamento na API → confere o valor → `recordPaymentEvent` com linha travada) → pedido confirmado.

Detalhes de pedidos, pagamentos, painel e segurança estão em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

**Segurança em resumo:** validação no servidor (Zod) · autorização por recurso · rate limit em login/cadastro/recuperação/pedidos · hash de senha · reset de senha com token de uso único · cabeçalhos (CSP, HSTS, X-Frame-Options…) · RLS ligado em todas as tabelas · logs estruturados com redação de dados sensíveis · imagens restritas a hosts permitidos · nenhum dado de cartão trafega pelo servidor.

## 5. Instalação

Requisitos: **Node 20.19+** (testado com 24) e um PostgreSQL (o projeto traz um embutido, sem Docker).

```bash
git clone <seu-fork> && cd maison-du-pain
npm install                 # também roda `prisma generate`
cp .env.example .env        # preencha DATABASE_URL e AUTH_SECRET (veja abaixo)
npm run db:local            # terminal 1: Postgres embutido na porta 5433 (deixe rodando)
```

Em outro terminal:

```bash
npm run db:deploy           # aplica as migrations
npm run db:seed             # categorias, 26 produtos, cupons, zonas de entrega
npm run dev                 # http://localhost:3000
```

Para o banco local embutido use `DATABASE_URL="postgresql://maison:maison_dev@localhost:5433/maison_du_pain"`.
Alternativas: `docker compose up -d` (porta 5432) ou um Postgres gerenciado (Supabase, Neon…).

## 6. Variáveis de ambiente

Copie `.env.example`. Nada de segredos reais no repositório (`.env*` está no `.gitignore`).

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | Conexão PostgreSQL (use pooler IPv4 em provedores gerenciados) |
| `AUTH_SECRET` | sim | Segredo da sessão, **mín. 32 caracteres**. `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL` | produção | URL pública (https em produção) — sitemap, OG e retorno do pagamento |
| `DB_POOL_MAX` | não | Conexões por instância (1 a 50). Padrão: 3 em produção (serverless), 10 em desenvolvimento |
| `DIRECT_URL` | não | Conexão direta só para migrations (quando `DATABASE_URL` usa pooler em modo transação) |
| `MERCADOPAGO_ACCESS_TOKEN` | produção | Credencial de **teste** (`TEST-…`) para sandbox. Vazio em dev = pagamento simulado |
| `MERCADOPAGO_WEBHOOK_SECRET` | produção | Segredo para validar a assinatura dos webhooks |
| `SEED_DEMO_PASSWORD` | não | Cria usuários de demonstração (veja a seção 9). Ignorada em produção |
| `CLOUDINARY_*`, `RESEND_API_KEY`, `EMAIL_FROM` | não | Reservadas para upload de imagens e e-mail transacional (próximos passos) |

Em produção o servidor **não sobe** se faltarem variáveis críticas (`src/instrumentation.ts` + `src/lib/env.ts`).

## 7. Banco de dados

16 modelos: `User`, `Address`, `Category`, `Product`, `ProductImage`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Payment`, `Coupon`, `CouponRedemption`, `Favorite`, `StoreSettings`, `AuditLog`, `PasswordResetToken`.

- Valores monetários em **centavos inteiros**
- `OrderItem` guarda o **snapshot** de nome e preço no momento da compra
- Índices e restrições de unicidade (`idempotencyKey`, `providerEventId`, cupom por pedido…)
- **RLS habilitado** em todas as tabelas (a migration inclui); o Prisma conecta como dono e ignora o RLS, enquanto a API REST do Supabase fica sem acesso

## 8. Migrations

```bash
npm run db:deploy                                     # aplicar (CI/produção)
npx prisma migrate dev --name minha_mudanca           # criar (desenvolvimento)
```

## 9. Dados de demonstração

`npm run db:seed` cria categorias, produtos, cupons (`BEMVINDO10`: 10% acima de R$ 30; `PAO5`: R$ 5 acima de R$ 20) e bairros atendidos.

Para entrar no painel, crie usuários de demonstração definindo a senha **no ambiente** (nada fica fixo no código):

```bash
SEED_DEMO_PASSWORD="UmaSenha123" npm run db:seed
```

| Usuário | Papel |
|---|---|
| `admin@maisondupain.example` | ADMIN |
| `equipe@maisondupain.example` | STAFF |
| `cliente@maisondupain.example` | CUSTOMER |

Sem token do Mercado Pago, em desenvolvimento, a página do pedido mostra o botão **“simular pagamento aprovado”**. Esse modo não existe em produção.

## 10. Testes

```bash
npm run check        # lint + tipos + testes unitários
npm test             # unitários (regras puras, validators, políticas, SEO…)
npm run test:int     # integração contra Postgres real (precisa de migrations + seed)
npm run test:e2e     # Playwright (sobe o `next dev`; usa o Chrome instalado ou o Chromium do CI)
```

- **Unitários:** preço, cupom, agenda, entrega, status e assinatura do Mercado Pago, transições de pedido, políticas de acesso, rate limit, validators, logger, env, SEO.
- **Integração:** preço vindo do banco, snapshot, idempotência (inclusive simultânea), cupom com concorrência, valor divergente, eventos de pagamento repetidos/atrasados, transições com auditoria, devolução de cupom ao cancelar.
- **E2E:** home, cabeçalhos de segurança, robots/sitemap, catálogo, carrinho, cadastro → checkout com cupom → pagamento simulado, isolamento entre clientes, controle de acesso do painel e **auditoria de acessibilidade com axe**.
  Para o fluxo de administrador: `E2E_ADMIN_EMAIL=admin@maisondupain.example E2E_ADMIN_PASSWORD=<senha do seed> npm run test:e2e`.

Primeira vez com Playwright fora do CI sem Chrome: `npx playwright install chromium` e remova `channel: "chrome"` da config.

### Qualidade medida (Lighthouse, build de produção, mobile simulado em 4G lenta com CPU 4× mais lenta)

| Página | Desempenho | Acessibilidade | Boas práticas | SEO |
|---|---|---|---|---|
| Home | ~75 (varia 60–83) | 100 | 100 | 100 |
| Cardápio | ~62–86 | 98 | 100 | 100 |
| Produto | ~69–78 | 100 | 100 | 91 |

- **CLS 0** na home e no produto (≈ 0,02 no cardápio).
- O LCP *observado* na máquina de desenvolvimento é ~0,4 s; os ~3,5 s do relatório vêm da simulação de rede/CPU lenta do Lighthouse. A primeira medição após subir o servidor é sempre a pior (cache frio): rode 3 vezes e use a mediana.
- Os testes E2E rodam o **axe** (WCAG 2 A/AA) em home, cardápio, produto, entrar, cadastrar e privacidade, sem violações sérias ou críticas.
- O **SEO 91** da página de produto tem causa conhecida: com Cache Components o `metadata` dinâmico é enviado em *streaming* no `<body>`. Crawlers de pré-visualização (Facebook, WhatsApp, X) recebem tudo no `<head>`; o Google processa o metadata em streaming (confirme no Search Console após o deploy). Se preferir metadata sempre no `<head>`, defina `htmlLimitedBots: /.*/` no `next.config.ts` (custo: a resposta espera o `generateMetadata`).
- Imagens: os produtos de demonstração usam ilustrações de fallback. Com fotos reais (Cloudinary), `next/image` entrega AVIF/WebP no tamanho certo; adicione `priority` na imagem do produto acima da dobra (já feito na página de produto).

## 11. Deploy

Passo a passo completo, com checklist e solução de problemas: **[`docs/DEPLOY.md`](docs/DEPLOY.md)**. Resumo abaixo.

Preparado para **Vercel + PostgreSQL gerenciado** (formato pensado para Supabase; ainda não exercitado contra o Supabase real).

1. Crie o banco e copie a connection string do **pooler** (IPv4). Para Prisma em serverless, prefira o modo de transação para `DATABASE_URL` e a conexão direta/sessão em `DIRECT_URL`.
2. Na Vercel, importe o repositório e configure as variáveis da seção 6 (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `MERCADOPAGO_*`).
3. Rode as migrations contra o banco de produção (uma vez por release): `npm run db:deploy` com `DATABASE_URL`/`DIRECT_URL` apontando para ele.
4. No painel do Mercado Pago, cadastre o webhook `https://SEU_DOMINIO/api/webhooks/mercadopago` (evento *Pagamentos*) e copie o segredo para `MERCADOPAGO_WEBHOOK_SECRET`.
5. Use credenciais **TEST-** até validar o fluxo no sandbox. Depois, as de produção.

`postinstall` gera o Prisma Client automaticamente na build. O rate limit atual é em memória (por instância): em produção com várias instâncias, troque por Redis/Upstash (a interface em `src/server/auth/rate-limit.ts` já isola isso).

## 12. Screenshots e demonstração

_Ainda não incluídas._ Adicione capturas da home, do cardápio, do checkout e do painel em `docs/screenshots/` e referencie aqui. Dica: com a aplicação rodando e `SEED_DEMO_PASSWORD` definido, o Playwright (`page.screenshot`) gera as imagens de forma reproduzível.

## 13. Melhorias futuras

- **Upload de imagens** com Cloudinary (assinatura no servidor) e fotos reais dos produtos
- **E-mail transacional** (Resend): recuperação de senha, confirmação e mudança de status do pedido
- **Reembolso** pelo painel via API do Mercado Pago (hoje o cancelamento de pedido pago só sinaliza `refundPending` na auditoria)
- **Rate limit distribuído** (Redis) e proxy/middleware para barrar visitantes sem sessão antes de renderizar
- **Status HTTP corretos** em redirecionamentos e 404 de páginas em streaming (hoje chegam como 200 no stream; nenhum dado vaza)
- **Favoritos e “repetir pedido”** (modelo `Favorite` já existe), endereços salvos, carrinho no servidor
- **Multi-padaria (SaaS):** isolar dados por loja e cobrar assinatura mensal

## Licença

Projeto de portfólio. Uso livre para estudo; adapte antes de uso comercial (revise a política de privacidade e os termos).
