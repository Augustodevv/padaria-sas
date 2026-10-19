# Deploy na Vercel (Supabase + Mercado Pago sandbox)

Tempo estimado: 45 a 60 minutos na primeira vez. Nada aqui exige colar segredos em chats ou no código: tudo vai em variáveis de ambiente.

> **Aviso honesto:** o app foi validado contra um Postgres local (e o CI usa Postgres 16). Ele ainda **não foi exercitado contra o Supabase nem contra o Mercado Pago real**. O primeiro deploy é, na prática, o teste de fumaça dessas duas integrações. Siga o checklist da seção 8.

## 0. Antes de tudo: GitHub

O repositório é local e a branch é `master`, mas o CI (`.github/workflows/ci.yml`) roda em `main`.

```bash
git branch -M main
# crie um repositório VAZIO no GitHub (sem README) e copie a URL
git remote add origin https://github.com/SEU_USUARIO/maison-du-pain.git
git push -u origin main
```

Troque `OWNER` no badge do README pelo seu usuário. Confira que o CI ficou verde antes de ligar a Vercel.

## 1. Banco de dados (Supabase)

Você tem duas opções:

**A) Reaproveitar o projeto `maison-du-pain` (ref `cwtzdgvowkfueevgdlxh`)** — ele já tem as 16 tabelas com RLS e o catálogo de demonstração, aplicados fora do Prisma. Por isso a migration precisa ser marcada como já aplicada (passo 5-A).

**B) Criar um projeto novo** (região South America / São Paulo). Aqui as migrations rodam normalmente (passo 5-B).

Em qualquer caso, defina a senha do banco **você mesmo** (letras e números, 16+ caracteres) em *Project Settings → Database → Database password*.

**Connection string (IPv4):** *Connect → Session pooler*. O host direto `db.<ref>.supabase.co` é só IPv6 e falha em muitas redes. O formato é:

```
postgresql://postgres.<REF>:<SENHA>@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
```

Use essa mesma string em `DATABASE_URL` e `DIRECT_URL`. (Se um dia migrar `DATABASE_URL` para o pooler em modo transação, porta 6543, mantenha `DIRECT_URL` na sessão.)

## 2. Segredos que você gera

```powershell
# AUTH_SECRET (PowerShell ou qualquer terminal com Node)
node -p "require('crypto').randomBytes(32).toString('base64')"
```

Guarde em um gerenciador de senhas. **Nunca** reaproveite o `AUTH_SECRET` do seu `.env` local.

## 3. Mercado Pago (sandbox)

1. Em <https://www.mercadopago.com.br/developers> → *Suas integrações* → **Criar aplicação** (produto: *Checkout Pro*).
2. Em *Credenciais de teste*, copie o **Access Token** (começa com `TEST-`) → `MERCADOPAGO_ACCESS_TOKEN`.
3. Crie **usuários de teste** (comprador e vendedor) em *Contas de teste*. Você paga como comprador de teste; o titular `APRO` aprova o pagamento e `OTHE` recusa. Os números de cartão de teste estão na documentação oficial ("Cartões de teste").
4. O webhook só pode ser cadastrado **depois** de ter a URL pública (passo 6).

## 4. Vercel

1. <https://vercel.com/new> → importe o repositório. Framework: *Next.js* (automático). Node 22.
2. *Project Settings → Functions → Region:* **São Paulo (gru1)**, perto do banco.
3. *Settings → Environment Variables* (marque **Production**; para **Preview** use o token `TEST-` e, idealmente, outro banco):

| Variável | Valor |
|---|---|
| `DATABASE_URL` | connection string do Session pooler |
| `DIRECT_URL` | a mesma string (usada só por migrations) |
| `AUTH_SECRET` | o segredo do passo 2 |
| `NEXT_PUBLIC_SITE_URL` | `https://SEU-PROJETO.vercel.app` (ou seu domínio) |
| `MERCADOPAGO_ACCESS_TOKEN` | `TEST-…` do passo 3 |
| `MERCADOPAGO_WEBHOOK_SECRET` | defina um valor provisório agora; troque no passo 6 |

4. **Deploy.** Em produção o servidor se recusa a subir se faltar algo crítico e lista o que falta nos logs (`src/instrumentation.ts`).
5. Se a URL final for diferente da que você colocou em `NEXT_PUBLIC_SITE_URL`, corrija a variável e faça *Redeploy*.

## 5. Migrations e catálogo (rodam na sua máquina, **antes** do primeiro acesso)

As migrations não rodam no build da Vercel de propósito (build não deve alterar o banco). O Prisma usa `DIRECT_URL` se existir.

**5-A. Reaproveitando o projeto que já tem as tabelas:**

```powershell
$env:DIRECT_URL = "postgresql://postgres.<REF>:<SENHA>@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"
npx prisma migrate resolve --applied 20261018000000_init
npx prisma migrate status        # deve dizer "Database schema is up to date"
```

**5-B. Banco novo:**

```powershell
$env:DIRECT_URL = "postgresql://postgres.<REF>:<SENHA>@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"
npx prisma migrate deploy
npx prisma db seed               # catálogo, cupons e bairros de demonstração
```

Variáveis definidas no terminal têm prioridade sobre o `.env` local, então não há risco de apontar para o banco errado por engano. **Não** defina `SEED_DEMO_PASSWORD` para o banco de produção.

## 6. Webhook do Mercado Pago

1. No painel do Mercado Pago: sua aplicação → *Webhooks* → *Configurar notificações*.
2. URL do **modo de teste**: `https://SEU-DOMINIO/api/webhooks/mercadopago`
3. Evento: **Pagamentos**.
4. Copie a **assinatura secreta** mostrada ali → atualize `MERCADOPAGO_WEBHOOK_SECRET` na Vercel → *Redeploy*.
5. Use *Simular notificação* no painel para conferir: resposta `200` quando a assinatura está certa, `401` quando o segredo não bate.

## 7. Primeiro administrador

O seed de produção não cria usuários. Cadastre-se normalmente pelo site e promova a conta no *SQL Editor* do Supabase:

```sql
update "User" set role = 'ADMIN' where email = 'voce@exemplo.com';
```

## 8. Checklist de fumaça (faça nesta ordem)

- [ ] `/` carrega, o cardápio lista os 26 produtos, a página de um produto abre.
- [ ] Cadastro e login funcionam (confirma a conexão de escrita no banco).
- [ ] `/admin` abre com sua conta promovida; as outras contas são barradas.
- [ ] Faça um pedido de ponta a ponta: carrinho → checkout → você é redirecionado ao Mercado Pago → pague com o comprador de teste (`APRO`).
- [ ] Em até alguns segundos o pedido muda para **Confirmado** (webhook). Se não mudar: *Vercel → Logs* (procure `mp.webhook.*`, os logs são JSON) e o histórico de entregas no painel do Mercado Pago.
- [ ] `/sitemap.xml` e `/robots.txt` respondem com o domínio certo.

## 9. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Deploy ok, mas a primeira requisição falha e os logs listam variáveis | Faltou variável obrigatória em produção (`MERCADOPAGO_*`, `NEXT_PUBLIC_SITE_URL` em https, `AUTH_SECRET` curto) |
| `P1001` (não alcança o banco) | Está usando o host direto IPv6; use o *Session pooler* |
| `P1000` (autenticação) | Senha errada ou com caractere especial; use só letras e números e redefina em *Database password* |
| `relation "Order" does not exist` | Esqueceu o passo 5 |
| `P3009`/`already exists` ao migrar | Banco já tem as tabelas: use o passo 5-A (`migrate resolve`) |
| Webhook responde `401` | `MERCADOPAGO_WEBHOOK_SECRET` diferente da assinatura secreta do painel (ou faltou redeploy) |
| Pedido fica em "Aguardando pagamento" | Webhook não chegou (URL/evento errados) ou o valor divergiu (log `mp.webhook.amount_mismatch`) |
| Redirecionamento ao Mercado Pago não acontece | Token ausente/inválido; veja o log `checkout.payment_start.failed` |

## 10. Para ir a produção de verdade

- Trocar `TEST-…` pelas credenciais de produção (`APP_USR-…`), cadastrar o webhook em **modo de produção** e atualizar o segredo.
- Revisar a política de privacidade com orientação jurídica e adicionar termos de uso.
- Ligar upload de imagens (Cloudinary), e-mail transacional (Resend) e trocar o rate limit em memória por Redis (veja o README, seção 13).
- Considerar limitar o pool de conexões do app (`max` no `PrismaPg`) quando houver muito tráfego, para não esgotar o pooler.
