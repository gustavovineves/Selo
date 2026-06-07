# Deploy de Staging — Selo

> Criado na Fase 28. Instruções para subir o ambiente de staging do Selo antes do beta fechado.

---

## 1. O Que É Staging

Staging é um ambiente público e isolado, separado da máquina local e do ambiente de produção futuro, que permite:

- Testar a API fora do Docker local.
- Acessar o painel admin de qualquer máquina.
- Apontar o app mobile para uma URL real de teste.
- Validar o comportamento com banco PostgreSQL isolado.
- Convidar usuários do beta fechado para testar o produto.

**Staging ainda é um ambiente de teste.** Nenhum dinheiro real é movimentado. KYC, Pix e blockchain permanecem simulados.

---

## 2. Onde Hospedar

### API (NestJS)

Opções recomendadas para MVP/beta:

| Provedor | Nível gratuito | Observações |
|---|---|---|
| [Railway](https://railway.app) | Sim (limitado) | Suporta Node.js + PostgreSQL; deploy por GitHub |
| [Render](https://render.com) | Sim (com cold start) | Web Service + Managed PostgreSQL |
| [Fly.io](https://fly.io) | Sim (limitado) | Boa opção para containers Docker |
| VPS (Hetzner/DigitalOcean) | Não (pago) | Mais controle; recomendado para beta real |

### Admin Web (Next.js)

| Provedor | Nível gratuito | Observações |
|---|---|---|
| [Vercel](https://vercel.com) | Sim | Deploy automático por GitHub; recomendado |
| [Railway](https://railway.app) | Sim | Junto com a API |
| [Render](https://render.com) | Sim | Static site ou Web Service |

### Banco de Dados (PostgreSQL)

| Provedor | Nível gratuito | Observações |
|---|---|---|
| [Railway](https://railway.app) | Sim | Plugin PostgreSQL no projeto |
| [Render](https://render.com) | Sim (90 dias) | Managed PostgreSQL |
| [Supabase](https://supabase.com) | Sim | PostgreSQL gerenciado + Studio |
| [Neon](https://neon.tech) | Sim | Serverless PostgreSQL; boa opção para beta |

---

## 3. Pré-requisitos

Antes de subir staging, garanta:

- [ ] CI passando (GitHub Actions).
- [ ] `pnpm --filter @selo/api test` — zero falhas.
- [ ] `pnpm --filter @selo/api test:e2e` — zero falhas.
- [ ] `pnpm --filter @selo/api build` — sucesso.
- [ ] `pnpm --filter @selo/mobile typecheck` — sucesso.
- [ ] `pnpm --filter @selo/admin typecheck` — sucesso.
- [ ] Nenhum `.env` real commitado.
- [ ] Nenhuma private key no repositório.

---

## 4. Configuração Passo a Passo

### 4.1 Banco de Dados

1. Crie um banco PostgreSQL no provedor escolhido.
2. Anote a `DATABASE_URL` no formato:
   ```
   postgresql://<user>:<senha>@<host>:<porta>/<db>?schema=public
   ```
3. **Nunca use o banco de desenvolvimento local para staging.**

### 4.2 Variáveis de Ambiente da API

Crie as seguintes variáveis no painel do provedor (nunca em arquivo commitado):

```env
# Banco
DATABASE_URL=postgresql://...

# App
NODE_ENV=staging
PORT=3000
LOG_LEVEL=info

# JWT — gere com: openssl rand -base64 64
JWT_SECRET=<64-chars-minimo>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<outro-secret-diferente>
JWT_REFRESH_EXPIRES_IN=7d
ADMIN_JWT_SECRET=<terceiro-secret-diferente>
ADMIN_JWT_EXPIRES_IN=1d

# URLs
APP_PUBLIC_URL=https://admin.staging.selo.app
API_PUBLIC_URL=https://api.staging.selo.app/api/v1

# CORS — apenas domínios conhecidos
CORS_ORIGINS=https://admin.staging.selo.app

# Rate limit
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100

# Provedores — TODOS simulados em staging
PAYMENT_PROVIDER=simulated
FITBANK_ENV=sandbox
FITBANK_ENABLE_REAL_CALLS=false
KYC_PROVIDER=simulated
KYC_ENABLE_REAL_CALLS=false
BLOCKCHAIN_PROVIDER=simulated
BLOCKCHAIN_ENABLE_REAL_CALLS=false
BLOCKCHAIN_NETWORK=polygon_amoy
```

### 4.3 Rodar Migrations

Após o banco estar disponível, aplique as migrations:

```bash
# Localmente apontando para o banco de staging:
DATABASE_URL="postgresql://..." pnpm --filter @selo/api prisma:deploy

# Ou via painel do provedor se ele suportar comandos de release
```

Nunca use `prisma migrate dev` em staging — use sempre `prisma migrate deploy`.

### 4.4 Criar o Primeiro AdminUser

Use o script incluído no projeto:

```bash
DATABASE_URL="postgresql://..." \
ADMIN_EMAIL="admin@staging.example.com" \
ADMIN_NAME="Admin Staging" \
ADMIN_PASSWORD="<senha-forte-de-12-chars-minimo>" \
  pnpm create-admin
```

Gere uma senha forte antes:
```bash
openssl rand -base64 24
```

Após criar, limpe o histórico do terminal:
```bash
history -c          # bash/zsh
Clear-History       # PowerShell
```

**Nunca commite ADMIN_PASSWORD em nenhum arquivo.**

### 4.5 Variáveis de Ambiente do Admin Web

No painel do Vercel (ou provedor escolhido):

```env
NEXT_PUBLIC_API_URL=https://api.staging.selo.app/api/v1
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_APP_VERSION=1.0.0-beta
```

Após configurar, faça redeploy do admin.

### 4.6 Mobile Apontando para Staging

Crie (nunca commite) `apps/mobile/.env.staging`:

```env
EXPO_PUBLIC_API_URL=https://api.staging.selo.app/api/v1
EXPO_PUBLIC_APP_ENV=staging
```

Inicie o app com cache limpo:

```bash
# Carregando o .env.staging:
EXPO_PUBLIC_API_URL=https://api.staging.selo.app/api/v1 \
EXPO_PUBLIC_APP_ENV=staging \
  npx expo start --clear
```

Ou configure o arquivo `.env` do mobile com os valores de staging antes de iniciar.

---

## 5. Validação Pós-Deploy

### 5.1 Verificar health da API

```bash
curl https://api.staging.selo.app/api/v1/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "app": "selo-api",
  "version": "1.0.0-beta",
  "env": "staging",
  "timestamp": "2026-06-07T...",
  "mode": "staging",
  "note": "Ambiente de teste — nenhum dinheiro real é movimentado."
}
```

Verificações:
- `status` deve ser `"ok"`.
- `env` deve ser `"staging"`.
- `mode` deve ser `"staging"`.
- A resposta **não deve conter** `DATABASE_URL`, `JWT_SECRET` ou qualquer secret.

### 5.2 Verificar login admin

1. Acesse `https://admin.staging.selo.app`.
2. Faça login com as credenciais do AdminUser criado.
3. Confirme que a lista de disputas carrega.

### 5.3 Verificar mobile

1. Inicie o app apontando para staging.
2. Faça cadastro com e-mail de teste.
3. Configure Chave de Recebimento.
4. Crie um combinado simples.
5. Confirme que o banner de "Ambiente de teste" aparece.

---

## 6. GitHub Secrets para CI/CD

Para o workflow `deploy-staging.yml` funcionar, cadastre no repositório:

```
Settings → Secrets and variables → Actions → New repository secret
```

| Secret | Descrição |
|---|---|
| `STAGING_DATABASE_URL` | CONNECTION_STRING do banco staging |
| `STAGING_JWT_SECRET` | JWT_SECRET de staging |
| `STAGING_JWT_REFRESH_SECRET` | JWT_REFRESH_SECRET de staging |
| `STAGING_ADMIN_JWT_SECRET` | ADMIN_JWT_SECRET de staging |
| `STAGING_CORS_ORIGINS` | CORS_ORIGINS de staging |
| `STAGING_API_URL` | URL pública da API de staging |

Também configure um GitHub Environment chamado `staging` com proteção de aprovação manual se desejado.

---

## 7. Segurança Mínima de Staging

| Item | Verificação |
|---|---|
| HTTPS | Obrigatório no domínio público |
| DATABASE_URL no repo | ❌ Nunca |
| JWT secrets no repo | ❌ Nunca |
| CORS wildcard | ❌ Nunca em staging/production |
| Rate limit ativo | ✅ Confirmar RATE_LIMIT_TTL e MAX |
| Logs sem CPF | ✅ Padrão do projeto |
| Logs sem token completo | ✅ Padrão do projeto |
| Admin protegido por JWT | ✅ AdminJwtGuard ativo |
| Backup do banco | Configurar no provedor de BD |
| BLOCKCHAIN_PRIVATE_KEY | ❌ Nunca commitar — manter vazio em staging simulado |

---

## 8. Geração de Secrets Fortes

```bash
# JWT_SECRET (64+ chars)
openssl rand -base64 64

# JWT_REFRESH_SECRET (diferente do anterior)
openssl rand -base64 64

# ADMIN_JWT_SECRET (diferente dos dois anteriores)
openssl rand -base64 64

# Senha do AdminUser (12+ chars)
openssl rand -base64 24
```

---

## 9. Deploy com Docker Compose (VPS)

Para deploy em VPS com Docker:

1. Copie `docker-compose.staging.example.yml` para o servidor como `docker-compose.yml`.
2. Crie um arquivo `.env` no servidor (nunca commite):
   ```env
   POSTGRES_PASSWORD=<senha-forte>
   JWT_SECRET=<secret>
   JWT_REFRESH_SECRET=<secret>
   ADMIN_JWT_SECRET=<secret>
   CORS_ORIGINS=https://admin.staging.selo.app
   API_PUBLIC_URL=https://api.staging.selo.app/api/v1
   ```
3. Suba os serviços:
   ```bash
   docker compose up -d
   ```
4. Aplique migrations:
   ```bash
   docker exec selo_api_staging pnpm prisma:deploy
   ```
5. Crie o AdminUser:
   ```bash
   docker exec -e ADMIN_EMAIL="..." -e ADMIN_NAME="..." -e ADMIN_PASSWORD="..." \
     selo_api_staging npx ts-node scripts/create-admin.ts
   ```

---

## 10. O Que Ainda É Simulado em Staging

| Funcionalidade | Status |
|---|---|
| Pagamento Pix | Simulado — nenhum Pix real |
| KYC / Verificação Financeira | Simulado — sem consulta externa |
| Blockchain / Prova | Simulado — sem rede externa |
| Fitbank | Sandbox — sem chamada real |
| Notificações push | In-app — Expo Push não configurado |

---

## 11. Rollback

Se o staging apresentar problemas:

1. Reverta o código para o commit anterior no provedor (ou via git push).
2. Se a migration causou problema: consulte o admin do banco — `prisma migrate deploy` não é reversível automaticamente; analise a migration e decida se precisa de rollback manual.
3. Nunca use `prisma migrate reset` em staging sem fazer backup antes.

---

## 12. Próximos Passos Após Staging Funcional

1. Convidar 10–30 usuários para o beta fechado (ver [docs/beta.md](beta.md)).
2. Monitorar logs de erro no provedor.
3. Coletar feedback via modal no app e via e-mail de convite.
4. Iterar nas fricções mais reportadas.
5. Quando pronto: **Fase 29 — Beta Fechado Operacional**.
