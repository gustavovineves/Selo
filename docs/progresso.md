# Progresso do Projeto Selo

Última atualização: 2026-06-05 (Fase 5 — fluxo de contestação validado)

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
| Acordos Simples | ✅ Implementado e testado manualmente (Fase 4) |
| Acordos com Garantia | ✅ Implementado (Fase 5) |
| Pagamento Pix (simulado) | ✅ Implementado com simulate-confirmation (Fase 5) |
| Disputas básicas | ✅ Implementado (Fase 5) |
| Score de Confiança | ✅ recordEvent implementado (Fase 5) |
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

### Testes manuais — 2026-06-04

Fluxo positivo e negativo testados manualmente:

- ✅ Criação, listagem, detalhe, aceite, conclusão, histórico de eventos
- ✅ Recusa pela contraparte
- ✅ Cancelamento pelo criador enquanto aguarda aceite
- ✅ Tentativa de aceitar acordo cancelado → retorna 400
- ✅ Tentativa de acessar acordo de outro usuário → retorna 403
- ✅ Filtro por `status=ACTIVE` e `status=COMPLETED`

### Decisões desta fase

- **`decline` gera evento `REJECTED`, mas o status operacional do acordo fica `CANCELLED`**: a recusa encerra o acordo antes do aceite. Não existe `DECLINED` no enum `AgreementOperationalStatus`. O evento `REJECTED` e o `status: REJECTED` no participante distinguem a recusa de um cancelamento comum no histórico — mesmo que o status final seja idêntico.
- `confirmationRule = SINGLE_PARTY` é o default: qualquer participante pode concluir o acordo.
- Acordos simples **não têm dinheiro**, então cancelamento em `ACTIVE` é permitido para qualquer participante.
- Schema **não foi alterado**. Nenhuma migration nova foi necessária.

---

## 5b. Fase 5 — Acordos com Garantia (Implementada)

### Endpoints disponíveis

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/v1/agreements/guaranteed` | JWT | Criar acordo com garantia |
| POST | `/api/v1/agreements/:id/payment-intents` | JWT | Iniciar depósito Pix |
| POST | `/api/v1/payments/:id/simulate-confirmation` | JWT | Simular confirmação do parceiro (dev) |
| POST | `/api/v1/agreements/:id/confirm-completion` | JWT | Confirmar conclusão (dupla confirmação) |
| POST | `/api/v1/agreements/:id/release` | JWT | Liberar valor (após dupla confirmação ou admin) |
| POST | `/api/v1/agreements/:id/refund` | JWT | Reembolsar valor ao pagador |
| POST | `/api/v1/agreements/:id/dispute` | JWT | Abrir disputa e travar valor |
| GET | `/api/v1/agreements/:id/dispute` | JWT | Detalhe da disputa |
| GET | `/api/v1/agreements/:id/guarantee` | JWT | Estado da garantia financeira |
| GET | `/api/v1/financial-guarantees/:id` | JWT | Garantia por ID direto |
| GET | `/api/v1/disputes/:id` | JWT | Disputa por ID direto |
| POST | `/api/v1/disputes/:id/messages` | JWT | Adicionar mensagem à disputa |

### O que foi implementado

- Acordo com garantia criado com `confirmationRule = MANUAL` (dupla confirmação obrigatória)
- `FinancialGuarantee.status = AWAITING_PAYMENT` na criação
- Aceite funciona igual ao acordo simples → `operationalStatus → ACTIVE`
- Iniciação de pagamento: cria `PaymentIntent` + `PixCharge` com QR Code simulado
- Simulação de confirmação do parceiro financeiro: `FUNDS_HELD`
- **Dupla confirmação**: `POST /confirm-completion` por qualquer participante
  - 1ª confirmação: `operationalStatus → AWAITING_CONFIRMATION`, evento `CONFIRMED` + `CONFIRMATION_REQUESTED`
  - 2ª confirmação: payout automático → `COMPLETED + PAID_OUT`, TrustScore +20 para ambos
- Release manual: funciona apenas se ambas as partes já confirmaram via `/confirm-completion`
- Refund: bloqueado em `AWAITING_CONFIRMATION` (uma parte já confirmou — use /dispute)
- Disputa: pode ser aberta de `ACTIVE` ou `AWAITING_CONFIRMATION` enquanto `financialStatus = FUNDS_HELD`
- `TrustScoreService.recordEvent()` — atualiza score e cria evento imutável
- `BlockchainRecord.status = PENDING` criado em events chave (confirmação, release)
- `AuditLog` registrado em todas as ações financeiras críticas
- `findOne()` e `findAllByUser()` retornam `financialGuarantee` e `dispute` resumidos
- `cancel()` protege contra cancelamento quando `FUNDS_HELD`
- `complete()` redireciona para `/confirm-completion` em acordos WITH_GUARANTEE

### Testes manuais — 2026-06-05

Fluxo de contestação validado manualmente:

- ✅ Acordo criado com `confirmationRule = MANUAL`
- ✅ Aceite, pagamento e `simulate-confirmation` → `FUNDS_HELD`, `FinancialGuarantee = LOCKED`
- ✅ A confirma cumprimento → `operationalStatus = AWAITING_CONFIRMATION`, `financialStatus = FUNDS_HELD`
- ✅ B abre disputa em vez de confirmar → `financialStatus = DISPUTED`, `guarantee = FROZEN_DISPUTE`, `dispute.status = OPEN`
- ✅ `release` bloqueado com 409 + mensagem clara "Existe uma disputa em aberto"
- ✅ `confirm-completion` bloqueado com 409 + mensagem clara "Existe uma disputa em aberto"
- ✅ `refund` bloqueado com 400 (financialStatus = DISPUTED, não FUNDS_HELD)
- ✅ Garantia: `FROZEN_DISPUTE`, `releasedAt = null`, `revertedAt = null`
- ✅ Disputa: `OPEN`, `openedById = B`
- ✅ Mensagem de evidência adicionada à disputa com sucesso
- ✅ Sequência de eventos: `CREATED → SENT → ACCEPTED → PAYMENT_REQUESTED → FUNDS_LOCKED → CONFIRMED → CONFIRMATION_REQUESTED → DISPUTE_OPENED`

### Bug corrigido na validação — 2026-06-05

`release()` e `confirmCompletion()` checavam `financialStatus !== FUNDS_HELD` antes de checar disputas abertas. Após `openDispute()`, o `financialStatus` muda para `DISPUTED`, fazendo os bloqueios retornarem HTTP 400 com mensagem "O valor precisa estar protegido" — enganosa, pois o valor ESTAVA protegido (em `FROZEN_DISPUTE`).

**Correção**: ordem das checagens invertida — disputa verificada antes do `financialStatus`. Agora retornam 409 com mensagem clara. Build passou limpo.

### Decisões desta fase

- **`confirmationRule = MANUAL` é padrão para WITH_GUARANTEE**: significa dupla confirmação obrigatória. A lógica está no serviço, sem necessidade de alterar o enum do schema. `SINGLE_PARTY` existe mas não é o default.
- **Dupla confirmação via `AgreementEvent.CONFIRMED`**: rastreada pelos registros de eventos existentes (sem novo campo no schema). O serviço conta eventos `CONFIRMED` por participante antes de permitir release.
- **`AWAITING_CONFIRMATION` usa o enum existente**: perfeito para "esperando o segundo confirmador". A enum `AgreementOperationalStatus.AWAITING_CONFIRMATION` já existia no schema.
- **Dispute não muda operationalStatus**: apenas `financialStatus → DISPUTED`. Os dois eixos são independentes.
- **Refund bloqueado em AWAITING_CONFIRMATION**: uma parte confirmou conclusão, então reembolso unilateral seria injusto. A outra parte deve usar `/dispute`.
- **score -10 no refund (não -30 como em cancelamento simples)**: reembolso pode ser legítimo. Punição leve, documentada.
- **simulate-confirmation é dev-only**: em produção virá como webhook do PSP.
- **Sem migration**: o schema já continha todos os models necessários. Nenhuma alteração no Prisma.
- **Verificação de disputa antes de financialStatus em release/confirmCompletion**: garante que o erro 409 seja retornado com mensagem clara quando há disputa, em vez do genérico 400 do check financeiro.

---

## 5. O Que NÃO Foi Implementado Ainda

Os módulos abaixo existem como stubs (`NotImplementedException`) e aguardam as fases futuras:

| Funcionalidade | Fase | Módulo |
|---|---|---|
| Destinos de recebimento (ReceivingDestination) | Fase 6 | `receiving-destinations` |
| Resolução de disputas por admin | Fase 6 | `disputes` + `admin` |
| Integração real Fitbank/BaaS | Fase 6 | `pix` + `payments` |
| Webhook real do PSP | Fase 6 | `pix` |
| Blockchain (submissão real) | Fase 6 | `blockchain-records` |
| Painel Admin funcional | Fase 6 | `admin` + `apps/admin` |
| Notificações push | Fase 6 | `notifications` |

---

## 6. Próxima Fase

### Fase 6 — Integração Real e Painel Admin

Objetivo: substituir simulações por integrações reais e habilitar o painel administrativo.

O que implementar:
- Integração Fitbank/BaaS real: cobrança Pix, payout, reembolso
- Webhook real de confirmação do PSP (`POST /webhooks/pix/confirmation`)
- `ReceivingDestination` — destinos de recebimento do usuário para payout
- Resolução de disputas via painel admin
- Submissão real à blockchain (Ethereum/Polygon testnet)
- Painel Admin (`apps/admin`) funcional com autenticação separada
- Notificações push (Expo Notifications)

Não implementar ainda: Fitbank produção, mainnet blockchain, KYC completo.

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
| [docs/guaranteed-agreements.md](guaranteed-agreements.md) | Acordos com Garantia: fluxo financeiro, endpoints, simulação, PowerShell |
| [docs/payments.md](payments.md) | Pagamentos: PaymentIntent, PixCharge, simulate-confirmation, dev vs. produção |
| [docs/disputes.md](disputes.md) | Disputas: abertura, mensagens, score, resolução futura |
| [docs/database.md](database.md) | Todos os 22 models e 37 enums do schema Prisma |
| [docs/modules.md](modules.md) | Endpoints de todos os módulos do backend |
| [docs/getting-started.md](getting-started.md) | Setup inicial do ambiente |
