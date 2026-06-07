# Ambientes e Segurança — Selo

> Criado na Fase 23. Descreve os ambientes suportados, variáveis obrigatórias, política de secrets e configurações de segurança.

---

## 1. Ambientes Suportados

| Ambiente | `NODE_ENV` | Banco de dados | Onde roda |
|---|---|---|---|
| **development** | `development` | PostgreSQL local (porta 5434 via Docker) | Máquina do desenvolvedor |
| **test** | `test` | PostgreSQL local (E2E) ou mocks (unit) | Máquina do dev / CI |
| **staging** | `staging` | PostgreSQL isolado (nunca o de produção) | Servidor de staging (Fase futura) |
| **production** | `production` | PostgreSQL de produção | Servidor de produção (Fase futura) |

---

## 2. Quando Usar Cada Ambiente

| Ambiente | Quando usar |
|---|---|
| development | Desenvolvimento local diário. Docker Compose ativo. |
| test | `pnpm test` (unitários), `pnpm test:e2e` (E2E com banco real), CI. |
| staging | Deploy candidato antes de ir para produção. Nunca usa dados reais de usuários. |
| production | Versão em produção real. Nunca usa banco de staging ou dev. |

---

## 3. Variáveis por Componente

### 3.1 API (`apps/api`)

| Variável | Obrigatória (não-test) | Descrição | Pode ter valor fake em CI |
|---|---|---|---|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL | ✅ aponta para service container |
| `JWT_SECRET` | ✅ | Assina access tokens de usuário | ✅ valor fake descritivo |
| `JWT_EXPIRES_IN` | — | Duração do access token (ex: `15m`) | ✅ |
| `JWT_REFRESH_SECRET` | ✅ | Assina refresh tokens | ✅ valor fake descritivo |
| `JWT_REFRESH_EXPIRES_IN` | — | Duração do refresh token (ex: `7d`) | ✅ |
| `ADMIN_JWT_SECRET` | ✅ | Assina tokens do painel admin (separado de JWT_SECRET) | ✅ valor fake descritivo |
| `ADMIN_JWT_EXPIRES_IN` | — | Duração do token admin (ex: `1d`) | ✅ |
| `PORT` | — | Porta da API (padrão: `3000`) | ✅ |
| `NODE_ENV` | — | Ambiente (development/test/staging/production) | ✅ `test` |
| `LOG_LEVEL` | — | Nível de log (log/error/warn/debug/verbose) | ✅ |
| `CORS_ORIGINS` | — em dev/test | Origens permitidas, separadas por vírgula | ✅ |
| `RATE_LIMIT_TTL` | — | Janela de rate limit em ms (padrão: `60000`) | ✅ alto em CI |
| `RATE_LIMIT_MAX` | — | Requisições por janela (padrão: `100`) | ✅ alto em CI |
| `APP_PUBLIC_URL` | — | URL pública do frontend | — |
| `API_PUBLIC_URL` | — | URL pública da API | — |
| `ADMIN_TOKEN` | — | Token estático legado (AdminTokenGuard — deprecated) | — |
| `PAYMENT_PROVIDER` | — | `simulated` ou `fitbank_sandbox` (padrão: `simulated`) | ✅ |
| `FITBANK_ENV` | — | `sandbox` ou `production` (padrão: `sandbox`) | ✅ |
| `FITBANK_ENABLE_REAL_CALLS` | — | `false` — NUNCA mudar para `true` sem instrução explícita | ✅ `false` |
| `FITBANK_CLIENT_ID` | — | Client ID Fitbank sandbox (Fase 24+) | ✅ fake |
| `FITBANK_CLIENT_SECRET` | — | Client Secret Fitbank sandbox (Fase 24+) | ✅ fake |
| `FITBANK_WEBHOOK_SECRET` | — | Secret para validação HMAC do webhook (Fase 24+) | ✅ fake |
| `FITBANK_PIX_KEY` | — | Chave Pix Fitbank sandbox (Fase 24+) | ✅ fake |
| `KYC_PROVIDER` | — | `simulated` (padrão) — sem chamada real (Fase 25+) | ✅ `simulated` |
| `KYC_ENABLE_REAL_CALLS` | — | `false` — NUNCA mudar para `true` sem instrução explícita | ✅ `false` |

### 3.2 Admin Web (`apps/admin`)

| Variável | Obrigatória | Descrição | Nunca commitar |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | URL da API usada pelo painel admin | Não |
| `NODE_ENV` | — | Ambiente informativo | Não |

### 3.3 Mobile (`apps/mobile`)

| Variável | Obrigatória | Descrição | Nunca commitar |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | ✅ | URL da API usada pelo app | Não |
| `EXPO_PUBLIC_ENV` | — | Ambiente informativo | Não |

> **Atenção:** Variáveis prefixadas com `EXPO_PUBLIC_` são incluídas no bundle do app e ficam visíveis ao usuário final. Nunca colocar segredos em variáveis `EXPO_PUBLIC_`.

---

## 4. Política de Secrets

### O que nunca commitar

| Item | Por quê |
|---|---|
| `.env` | Contém credenciais reais |
| `apps/api/.env` | Idem |
| `apps/admin/.env.local` | Idem |
| `apps/mobile/.env` | Idem |
| Qualquer chave privada | Risco de comprometimento imediato |
| Hash bcrypt de senha admin | Reversível; exposição de credencial |

### O que vai para GitHub Secrets (quando houver staging/prod)

| Secret | Usado por |
|---|---|
| `DATABASE_URL` | CI/CD de staging e produção |
| `JWT_SECRET` | Deploy de staging e produção |
| `JWT_REFRESH_SECRET` | Deploy de staging e produção |
| `ADMIN_JWT_SECRET` | Deploy de staging e produção |
| `CORS_ORIGINS` | Deploy de staging e produção |
| `FITBANK_API_KEY` (Fase 24+) | Apenas produção/staging com BaaS |
| `BLOCKCHAIN_PRIVATE_KEY` (Fase 26+) | Apenas produção/staging com blockchain |

### O que pode ficar inline no CI (valores fake)

Em `.github/workflows/ci.yml`, os valores de `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_JWT_SECRET`, etc. são **fake, descritivos e exclusivos para o ambiente de teste**. Eles nunca chegam a produção. Consulte o arquivo `.github/workflows/ci.yml` para os valores exatos usados em CI.

---

## 5. CORS por Ambiente

| Ambiente | Comportamento |
|---|---|
| `test` | `*` — sem restrição (E2E chama serviços diretamente, não HTTP) |
| `development` | `CORS_ORIGINS` ou fallback `localhost:3001, localhost:8081` |
| `staging` | `CORS_ORIGINS` obrigatório (domínio de staging) |
| `production` | `CORS_ORIGINS` obrigatório (domínios reais) — sem wildcard |

Implementado em `apps/api/src/main.ts`. Em produção/staging, se `CORS_ORIGINS` não estiver definido, a API sobe com CORS vazio (rejeita tudo) e loga um warning.

---

## 6. Rate Limit

Rate limiting aplicado via `@nestjs/throttler` nas rotas sensíveis:

| Rota | Guard | Observação |
|---|---|---|
| `POST /api/v1/auth/register` | `ThrottlerGuard` | |
| `POST /api/v1/auth/login` | `ThrottlerGuard` | |
| `POST /api/v1/auth/refresh` | `ThrottlerGuard` | |
| `POST /api/v1/admin/auth/login` | `ThrottlerGuard` | |

Configuração via env:

```env
RATE_LIMIT_TTL=60000   # janela em ms (60 segundos)
RATE_LIMIT_MAX=100     # máx. requisições por IP por janela
```

Em CI/test, usar valores altos (`RATE_LIMIT_MAX=10000`) para não bloquear os testes.

---

## 7. Política de Logs Seguros

O que **nunca** deve aparecer nos logs:

| Dado | Por quê |
|---|---|
| `password` / `passwordHash` | Credencial |
| `refreshToken` / `accessToken` | Token de sessão |
| Header `Authorization` completo | Expõe token |
| `ADMIN_TOKEN` / `ADMIN_JWT_SECRET` | Credencial administrativa |
| Chave Pix real (CPF, email, telefone) | Dado pessoal / financeiro |
| Destino de recebimento sem máscara | Dado financeiro |
| Segredos de ambiente (JWT_SECRET, etc.) | Credencial |

O NestJS loga a requisição via `Logger` no bootstrap. Certifique-se de que interceptors e middlewares customizados não loguem o body de rotas de auth.

---

## 8. Tratamento de Erros por Ambiente

O `GlobalExceptionFilter` (`apps/api/src/common/filters/http-exception.filter.ts`) implementa:

| Tipo de exceção | development / test | production |
|---|---|---|
| `HttpException` (400, 401, 403, 404…) | Formato padrão NestJS (preservado) | Formato padrão NestJS (preservado) |
| Erro inesperado (não-HTTP) | Mensagem real do erro | `"Erro interno do servidor."` |
| Stack trace | Presente nos logs internos | Presente nos logs internos; **nunca no response** |

---

## 9. Segurança Admin

| Mecanismo | Status |
|---|---|
| `AdminJwtGuard` + `AdminJwtStrategy` | ✅ Ativo (desde Fase 17) |
| JWT admin com `ADMIN_JWT_SECRET` separado | ✅ |
| `payload.type === "admin"` verificado | ✅ |
| Token de usuário comum rejeitado em rotas admin | ✅ |
| `passwordHash` nunca retornado | ✅ |
| `AdminTokenGuard` (X-Admin-Token) | ⚠️ Legado — mantido por compatibilidade, não recomendado para novos usos |

O `AdminTokenGuard` (guard de token estático via header `X-Admin-Token`) ainda existe no código mas não é mais recomendado. O painel admin e todos os endpoints sensíveis devem usar `AdminJwtGuard`.

---

## 10. Fitbank Sandbox e Provedor de Pagamento (Fase 24)

O Selo abstrai o provedor financeiro via `IPaymentProvider`. O provider ativo é selecionado por `PAYMENT_PROVIDER`.

### Diferença entre os modos

| Modo | Provider | Chamada real | Webhook |
|---|---|---|---|
| `simulated` (padrão) | `SimulatedPaymentProvider` | Nunca | `POST /payments/:id/simulate-confirmation` |
| `fitbank_sandbox` | `FitbankSandboxPaymentProvider` | Nunca (enquanto `FITBANK_ENABLE_REAL_CALLS=false`) | `POST /api/v1/payments/webhooks/fitbank` |
| produção futura | Fitbank real | Sim | Webhook Fitbank real |

### O que o dinheiro representa em cada modo

| Modo | Status financeiro real |
|---|---|
| `simulated` | Nenhum — apenas estado interno no banco do Selo |
| `fitbank_sandbox` | Nenhum — sandbox sem movimentação real |
| Produção | Fundos custodiados no Fitbank — o Selo orquestra, não custodia |

### Regras absolutas desta fase

- `FITBANK_ENABLE_REAL_CALLS` nunca pode ser `true` sem instrução explícita
- Nenhuma chamada HTTP ao Fitbank real é feita nesta fase
- O dinheiro permanece em reais, custodiado pelo parceiro financeiro (futuro)
- O Selo orquestra acordo, regra, status, prova e reputação — não guarda dinheiro
- A blockchain registra prova (hash), não movimenta dinheiro
- A Chave de Recebimento do App (`@usuario`) não é chave Pix
- O Destino de Recebimento é separado da Chave de Recebimento

### Como testar webhook sandbox localmente

```bash
# 1. Criar PaymentIntent (pegar txid da resposta)
# 2. Enviar webhook fake para o endpoint sandbox:
curl -X POST http://localhost:3000/api/v1/payments/webhooks/fitbank \
  -H "Content-Type: application/json" \
  -d '{"event":"PIX_PAYMENT_CONFIRMED","txid":"<txid>","amount":"350.00"}'
```

---

## 11. Setup de Staging (Preparação — Fase Futura)

Para criar um ambiente de staging:

1. **Banco isolado:** PostgreSQL separado — nunca usar o banco de dev ou de produção.
2. **Variáveis:** Copiar `.env.example` e preencher com valores reais de staging.
3. **GitHub Secrets:** Cadastrar todas as variáveis marcadas na seção 4 como "GitHub Secrets".
4. **Admin inicial:** Criar `AdminUser` no banco de staging via SQL (nunca commitar hash):
   ```sql
   INSERT INTO admin_users (id, email, name, password_hash, role, status, created_at, updated_at)
   VALUES (gen_random_uuid(), 'admin@staging.selo.app', 'Admin Staging',
           '<bcrypt-hash>', 'ADMIN', 'ACTIVE', NOW(), NOW());
   ```
5. **API URL:** Configurar `NEXT_PUBLIC_API_URL` no admin e `EXPO_PUBLIC_API_URL` no mobile apontando para o staging.
6. **CORS:** Definir `CORS_ORIGINS` com o domínio do painel admin de staging.
7. **Fitbank/Pix:** Não configurar dinheiro real — usar sandbox apenas a partir da Fase 24.

---

## 12. .gitignore

Verifique se o `.gitignore` da raiz inclui:

```
.env
.env.local
.env.*.local
apps/api/.env
apps/admin/.env.local
apps/mobile/.env
```

Arquivos `.env.example` **devem** ser commitados — contêm apenas valores fake/exemplo.
