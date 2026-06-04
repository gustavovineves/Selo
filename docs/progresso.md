# Progresso do Projeto Selo

Última atualização: 2026-06-04 (Fase 4)

---

## 1. Visão do Produto

**Selo** é uma wallet de microacordos do cotidiano.

**Frase pública:** "A carteira dos seus combinados."

### Princípios do produto

- O Selo registra, formaliza e acompanha combinados entre pessoas.
- **Blockchain como prova, não como custódia.** A blockchain é usada para registrar o hash dos termos do acordo como prova imutável de existência, não para movimentar ou guardar dinheiro.
- **Dinheiro fica com parceiro financeiro.** Em acordos com garantia, os fundos ficam custodiados com um parceiro BaaS (Fitbank ou equivalente) — nunca diretamente na blockchain.
- O produto terá acordo simples (sem dinheiro envolvido), acordo com garantia (Pix + trava de fundos), score de confiança e sistema de disputas.

---

## 2. Estado Técnico Atual

| Item | Status |
|------|--------|
| Monorepo pnpm | ✅ Criado |
| PostgreSQL via Docker | ✅ Rodando na porta **5434** |
| Schema Prisma | ✅ 22 models, 37 enums |
| Migration inicial (`init_complete_schema`) | ✅ Aplicada |
| Prisma Client | ✅ Gerado |
| Auth / Usuários / Sessão | ✅ Implementado (Fase 2) |
| Chave de Recebimento do App | ✅ Implementado (Fase 3) |
| Acordos Simples | ✅ Implementado (Fase 4) |
| Git local | ✅ Limpo após commit da Fase 4 |

### Estrutura do monorepo

```
apps/api/       NestJS + Prisma + PostgreSQL (backend)
apps/mobile/    Expo React Native (base criada, não integrado)
apps/admin/     Next.js (base criada, Fase 4)
packages/shared Utilitários compartilhados
packages/types  Tipos TypeScript compartilhados
packages/config Constantes compartilhadas
docs/           Documentação técnica
```

---

## 3. Fase 2 — Autenticação, Sessão e Perfil (Implementada)

### Endpoints disponíveis

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/v1/auth/register` | Não | Cria conta, perfil e score inicial |
| POST | `/api/v1/auth/login` | Não | Autentica e cria sessão |
| POST | `/api/v1/auth/refresh` | Não | Renova access token |
| POST | `/api/v1/auth/logout` | JWT | Revoga sessão atual |
| GET | `/api/v1/auth/me` | JWT | Retorna usuário autenticado |
| PATCH | `/api/v1/users/me/profile` | JWT | Atualiza perfil |
| GET | `/api/v1/users/:id` | JWT | Perfil público de um usuário |

### O que foi implementado

- JWT access token (15min) com `{ sub, email, sid }` — `sid` = session ID
- JWT refresh token (7d) com mesmo payload, secret diferente
- `DeviceSession` criada no register e login com IP, UserAgent e expiresAt
- Detecção de reuso de refresh token: sessão revogada automaticamente se token não bate
- Logout revoga a sessão pelo `sessionId` embutido no access token
- `UserProfile` criado junto com o usuário no registro
- `TrustScore` inicial (score 500, level MEDIUM) criado no registro
- `bcrypt(12)` para senha; senha apenas para desenvolvimento local
- `@Transform` normaliza email para lowercase no DTO

### Decisões importantes desta fase

- **Senha é temporária** para desenvolvimento local. O fluxo final usará código OTP por telefone ou email (sem senha). Ver `docs/auth.md` para o plano de migração.
- **CPF e KYC ficam para o onboarding financeiro** — não solicitados no cadastro inicial.
- Schema Prisma **não foi alterado** nesta fase. Nenhuma migration nova foi necessária.

---

## 4. Fase 3 — Chave de Recebimento do App (Implementada)

### Endpoints disponíveis

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/v1/receiving-keys` | JWT | Criar handle do usuário |
| GET | `/api/v1/receiving-keys/me` | JWT | Buscar chave ativa |
| GET | `/api/v1/receiving-keys/history` | JWT | Histórico de chaves |
| DELETE | `/api/v1/receiving-keys/me` | JWT | Excluir chave ativa |
| GET | `/api/v1/receiving-keys/check/:key` | Público | Verificar disponibilidade |
| GET | `/api/v1/receiving-keys/resolve/:key` | Público | Resolver recebedor para confirmação visual |

### O que foi implementado

- Handle interno no formato `@erika` (letras, números, ponto, underline, hífen)
- Normalização: `@ERIKA` → stored `erika`, exibido `@erika`
- Um usuário tem no máximo uma chave **ativa** por vez
- `normalizedKey @unique` global — handle excluído não pode ser reutilizado no MVP
- Validação de formato (regex, tamanho 3–30) e lista de handles reservados
- Soft delete: `status: DELETED`, `deletedAt`, `isDefault: false`
- Verificação de pendências antes de excluir (acordos, pagamentos, payout, refund, disputas)
- `resolve/:key` retorna apenas dados públicos seguros (userId, displayName, avatarUrl, key)
- `check/:key` é público e responde sem exigir token

### Decisões importantes desta fase

- **`type = RANDOM`** no schema: handles internos usam o tipo Pix `RANDOM` no MVP, por ser o mais próximo semanticamente. Em Fase 4-5, quando o Pix real for integrado, avaliar adicionar `APP_HANDLE` ao enum (requer migration).
- **Sem migration nova**: o model `ReceivingKey` já existia no schema e suporta os campos necessários.
- **Chave não é chave Pix**: serve apenas para localizar o recebedor dentro do app e confirmar identidade antes de um acordo.

---

## 4b. Fase 4 — Acordos Simples (Implementada)

### Endpoints disponíveis

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/v1/agreements/simple` | JWT | Criar acordo simples |
| GET | `/api/v1/agreements` | JWT | Listar meus acordos |
| GET | `/api/v1/agreements/:id` | JWT | Detalhe de um acordo |
| POST | `/api/v1/agreements/:id/accept` | JWT | Aceitar acordo (contraparte) |
| POST | `/api/v1/agreements/:id/decline` | JWT | Recusar acordo (contraparte) |
| POST | `/api/v1/agreements/:id/cancel` | JWT | Cancelar acordo |
| POST | `/api/v1/agreements/:id/complete` | JWT | Concluir acordo |
| GET | `/api/v1/agreements/:id/events` | JWT | Histórico de eventos |

### O que foi implementado

- Criação de acordo simples via `counterpartyKey` (resolve pelo handle da contraparte)
- Validação: não criar acordo consigo mesmo, chave deve estar ativa
- `contentHash` SHA256 dos termos calculado localmente na criação
- `generatedSummary` — frase automática descrevendo o acordo
- `receiverKeySnapshot` — snapshot da chave da contraparte no momento da criação
- Participantes criados automaticamente: CREATOR (aceito) + COUNTERPART (pendente)
- Eventos registrados: CREATED, SENT, ACCEPTED, REJECTED, CANCELLED, COMPLETED
- Histórico de status registrado em `AgreementStatusHistory` a cada transição
- Listagem com filtros (`status`, `type`, `page`, `limit`)
- Segurança: usuário só acessa acordos dos quais é participante
- `GET /agreements/:id/events` protegido por participação

### Ciclo de vida

```
AWAITING_ACCEPTANCE → (aceite) → ACTIVE → (conclusão) → COMPLETED
AWAITING_ACCEPTANCE → (recusa/cancelamento) → CANCELLED
ACTIVE → (cancelamento) → CANCELLED
```

### Decisões desta fase

- `decline` usa `CANCELLED` como status final do acordo (não existe `DECLINED` no enum). Participante recusante recebe `status: REJECTED`.
- `confirmationRule = SINGLE_PARTY` é o default: qualquer participante pode concluir o acordo.
- Acordos simples **não têm dinheiro**, então cancelamento em `ACTIVE` é permitido para qualquer participante.
- Schema **não foi alterado**. Nenhuma migration nova foi necessária.

---

## 5. O Que NÃO Foi Implementado Ainda

Os módulos abaixo existem como stubs (`NotImplementedException`) e aguardam as fases futuras:

| Funcionalidade | Fase | Módulo |
|---|---|---|
| Destinos de recebimento | Fase 5 | `receiving-destinations` |
| Acordos com garantia | Fase 5 | `agreements` + `financial-guarantees` |
| Pix (cobrança e payout) | Fase 5 | `pix` + `payments` |
| Score de confiança | Fase 5 | `trust-score` |
| Disputas | Fase 5 | `disputes` |
| Blockchain (prova) | Fase 6 | `blockchain-records` |
| Fitbank / BaaS | Fase 6 | `pix` + `payments` |
| Painel Admin | Fase 6 | `admin` + `apps/admin` |

---

## 6. Próxima Fase

### Fase 5 — Acordos com Garantia e Score de Confiança

Objetivo: permitir acordos que travam dinheiro e calcular score de confiança a partir do histórico.

O que implementar:
- Acordos com `type: WITH_GUARANTEE`
- `FinancialGuarantee` — trava de valor no acordo
- `PaymentIntent` e `PixCharge` — stub de cobrança (integração Pix real na Fase 6)
- `Payout` — stub de liberação de valor
- Cálculo e atualização de `TrustScore` após conclusão/cancelamento/disputa
- `Dispute` — abertura e resolução básica de disputas
- `ReceivingDestination` — destinos de pagamento salvos pelo usuário

Não implementar ainda: Fitbank real, blockchain, mobile, admin.

---

## 7. Comandos Úteis

```bash
# Subir banco de dados (PostgreSQL porta 5434)
pnpm docker:up

# Iniciar API em modo desenvolvimento
pnpm dev:api

# Aplicar migrations pendentes
pnpm db:migrate

# Gerar Prisma Client (após mudanças no schema)
pnpm db:generate

# Abrir Prisma Studio
pnpm db:studio

# Ver status do Git
git status

# Ver logs do banco
pnpm docker:logs
```

### Testar autenticação rapidamente (PowerShell)

```powershell
# Registrar
$body = '{"email":"dev@selo.dev","password":"senha-dev-123","firstName":"Dev","lastName":"Selo"}'
$res = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -Body $body -ContentType "application/json"
$token = $res.accessToken

# Ver usuário atual
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/me" -Headers @{ Authorization = "Bearer $token" }

# Criar chave de recebimento
$body = '{"key":"@dev"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys" -Method Post `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body $body -ContentType "application/json"

# Resolver chave (público)
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys/resolve/dev"
```

---

## 8. Links de Documentação

| Arquivo | Conteúdo |
|---------|----------|
| [CLAUDE.md](../CLAUDE.md) | Instruções do produto e regras de trabalho com Claude |
| [docs/architecture.md](architecture.md) | Arquitetura geral e fluxos |
| [docs/auth.md](auth.md) | Autenticação: endpoints, exemplos, fluxo futuro OTP |
| [docs/receiving-keys.md](receiving-keys.md) | Chave de Recebimento do App: conceito, endpoints, regras, exemplos |
| [docs/agreements.md](agreements.md) | Acordos Simples: ciclo de vida, endpoints, regras, exemplos PowerShell |
| [docs/database.md](database.md) | Todos os 22 models e 37 enums do schema Prisma |
| [docs/modules.md](modules.md) | Endpoints de todos os módulos do backend |
| [docs/getting-started.md](getting-started.md) | Setup inicial do ambiente |
