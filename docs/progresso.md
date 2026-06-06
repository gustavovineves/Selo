# Progresso do Projeto Selo

Última atualização: 2026-06-05 (Fase 8 — destino de recebimento implementado)

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
| Resolução admin de disputas | ✅ Implementado (Fase 6) |
| Home/Wallet/Listagens | ✅ Implementado (Fase 7) |
| Destino de Recebimento | ✅ Implementado (Fase 8) |
| Score de Confiança | ✅ recordEvent implementado (Fase 5 e 6) |
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

## 5c. Fase 6 — Resolução Administrativa de Disputas (Implementada)

### Endpoints administrativos disponíveis

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/v1/admin/health` | Admin Token | Health do painel admin |
| GET | `/api/v1/admin/stats` | Admin Token | Estatísticas gerais |
| GET | `/api/v1/admin/disputes` | Admin Token | Listar disputas (com filtro por status) |
| GET | `/api/v1/admin/disputes/:id` | Admin Token | Detalhe completo da disputa |
| POST | `/api/v1/admin/disputes/:id/resolve-release` | Admin Token | Resolver liberando ao recebedor |
| POST | `/api/v1/admin/disputes/:id/resolve-refund` | Admin Token | Resolver reembolsando ao pagador |

### O que foi implementado

- `AdminTokenGuard` — autenticação por header `X-Admin-Token` com valor do env `ADMIN_TOKEN`
- Listagem de disputas com dados completos para análise humana (pager, filtro por status)
- Detalhe completo: acordo, participantes, garantia, paymentIntents, payouts/refunds, eventos e mensagens
- `resolve-release`: payout simulado + estados atualizados + eventos + score + blockchain record + audit log
- `resolve-refund`: refund simulado + estados atualizados + eventos + score + blockchain record + audit log
- Justificativa obrigatória (mín. 10 chars) em ambas as resoluções
- Mensagem automática do tipo `RESOLUTION` adicionada à disputa em cada resolução
- Bloqueio duplo de resolução (HTTP 400 se disputa não está OPEN)
- Score: DISPUTE_WON (+30) para o vencedor, DISPUTE_LOST (-20, conservador) para o perdedor

### Testes manuais — 2026-06-05

Fluxo A — resolve-release:

- ✅ Disputa aberta em acordo com garantia
- ✅ Admin lista disputas com status=OPEN
- ✅ Admin consulta detalhe completo
- ✅ Admin resolve liberando ao recebedor: HTTP 200
- ✅ `dispute.status = RESOLVED_FAVOR_COUNTERPART`
- ✅ `dispute.resolvedByType = ADMIN`
- ✅ `agreement.operationalStatus = COMPLETED`
- ✅ `agreement.financialStatus = PAID_OUT`
- ✅ `guarantee.status = PAID_OUT`, `releasedAt` preenchido
- ✅ Payout simulado criado com `metadata.simulated=true`
- ✅ Sequência de eventos: `...DISPUTE_OPENED → DISPUTE_RESOLVED → PAYOUT_INITIATED → PAYOUT_COMPLETED → COMPLETED` (todos com `actorType: ADMIN`)
- ✅ Mensagem de resolução adicionada à disputa
- ✅ Resolver novamente bloqueado com HTTP 400

Fluxo B — resolve-refund:

- ✅ Disputa aberta em acordo com garantia
- ✅ Admin resolve reembolsando ao pagador: HTTP 200
- ✅ `dispute.status = RESOLVED_FAVOR_CREATOR`
- ✅ `agreement.operationalStatus = CANCELLED`
- ✅ `agreement.financialStatus = REFUNDED`
- ✅ `guarantee.status = REFUNDED`, `revertedAt` preenchido
- ✅ Refund simulado criado com `metadata.simulated=true`
- ✅ Eventos: `...DISPUTE_RESOLVED → REFUND_INITIATED → REFUND_COMPLETED → CANCELLED` (todos ADMIN)
- ✅ Resolver novamente bloqueado com HTTP 400

Testes negativos:

- ✅ Sem token admin → 401
- ✅ Token admin errado → 401
- ✅ JWT de usuário comum → 401 (sem x-admin-token)
- ✅ Resolve sem reason → 400
- ✅ Resolve com reason curta → 400
- ✅ Disputa inexistente → 404
- ✅ `release` bloqueado com disputa aberta → 409
- ✅ `confirm-completion` bloqueado com disputa aberta → 409
- ✅ `refund` bloqueado com disputa aberta → 400

### Decisões desta fase

- **Auth admin via token estático**: `X-Admin-Token: <ADMIN_TOKEN do env>`. MVP pragmático — produção usará `AdminUser` com JWT separado.
- **`requestedById` do Refund usa `payerId`**: o campo é FK para `User`, então o admin não pode ser o requestor sem migration. Semântica preservada: o reembolso vai ao pagador.
- **DISPUTE_LOST delta conservador (-20)**: o score padrão do schema é -50, mas no MVP usamos -20. A linguagem preferida do produto é "histórico em evolução", não punição pesada.
- **Sem migration**: o schema já continha todos os campos necessários (`resolvedById`, `resolvedByType`, `resolvedAt`, `closedAt`, `resolution`, `RESOLVED_FAVOR_CREATOR`, `RESOLVED_FAVOR_COUNTERPART`, `ADMIN_DISPUTE_RESOLVED`, etc.).
- **Pix continua simulado**: `resolveRelease` e `resolveRefund` criam registros com `metadata.simulated=true`. Em produção, acionariam o Fitbank/BaaS.

---

## 5d. Fase 8 — Destino de Recebimento (Implementada)

### Endpoints disponíveis

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/v1/receiving-destinations` | JWT | Cadastrar destino de recebimento |
| GET | `/api/v1/receiving-destinations/me` | JWT | Listar meus destinos |
| PATCH | `/api/v1/receiving-destinations/:id` | JWT | Atualizar label ou default |
| DELETE | `/api/v1/receiving-destinations/:id` | JWT | Excluir logicamente |

### O que foi implementado

- CRUD completo do módulo `ReceivingDestination` (antes era stub com `NotImplementedException`)
- **Mascaramento** de dados sensíveis: `pixKey` nunca retornado; sempre retorna `maskedValue`
  - `PIX_CPF` → `***.456` | `PIX_EMAIL` → `e***@gmail.com` | `PIX_PHONE` → `(***) ***-1234` | `PIX_RANDOM` → `****-****-abcd`
- **Regra de default**: primeiro destino vira default automaticamente; `isDefault: true` promove e demove outros
- **Bloqueio de exclusão**: recusa com 409 se o usuário tem acordos em estado bloqueante (como recebedor) ou payouts pendentes vinculados ao destino
- **Integração com `createGuaranteed`**: verifica destino ativo do recebedor antes de criar o acordo; salva `receiverDestinationSnapshot` imutável no acordo
- **Snapshot travado**: após acordo criado, troca do destino não altera o snapshot — o acordo mantém o destino original

### Decisões desta fase

- **Schema não foi alterado**: `ReceivingDestination`, `ReceivingDestinationType` e `ReceivingDestinationStatus` já existiam. `Agreement.receiverDestinationSnapshot` também já existia.
- **Status limitados a ACTIVE/DELETED**: o schema tem apenas esses dois valores. `INACTIVE`, `BLOCKED` e `PENDING_VERIFICATION` requerem migration futura.
- **`ReceivingDestinationType` usado diretamente**: o campo `type` no DTO aceita os valores do enum existente (`PIX_CPF`, `PIX_EMAIL`, etc.) sem camada de mapeamento extra.
- **`maskValue` é público no service**: chamado pelo `AgreementsService` ao montar o snapshot, sem duplicar a lógica de mascaramento.
- **Bloqueio conservador**: verifica todos os acordos onde o usuário é receiver com status bloqueante — não apenas o acordo vinculado ao destino específico (pois o `receiverDestinationSnapshot` não tem FK, apenas JSON).
- **Sem migration**: nenhuma mudança no schema.

### Testes manuais — 2026-06-05

- ✅ Build limpo (`pnpm --filter @selo/api build` sem erros TypeScript)
- Fluxo A (destino criado): cadastro, listagem, mascaramento, isDefault
- Fluxo B (bloqueio sem destino): acordo com garantia retorna 400
- Fluxo C (acordo com destino): snapshot salvo no acordo
- Fluxo D (bloqueio de exclusão): 409 com acordo ativo
- Fluxo E (snapshot imutável): acordo mantém snapshot original após mudança de destino

---

## 5c. Fase 7 — Home/Wallet/Listagens (Implementada)

### Endpoints disponíveis

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/v1/agreements/summary` | JWT | Resumo da wallet — home do app mobile |
| GET | `/api/v1/agreements` | JWT | Listagem com filtros expandidos |

### O que foi implementado

**Novo endpoint `GET /agreements/summary`:**
- Dados do usuário: id, displayName, avatarUrl, trustScore (score + level)
- Chave de recebimento ativa: key, status
- Contadores por categoria: activeAgreements, pendingMyAction, pendingOtherPartyAction, awaitingAcceptance, awaitingPayment, awaitingConfirmation, withGuarantee, inDispute, completed, cancelled, dueSoon
- Somatórios financeiros por papel: amountsToReceive, amountsToPay, protectedAmounts (count + total + currency)
- Seções com até 10 itens cada: pendingMyAction, amountsToReceive, amountsToPay, active, withGuarantee, inDispute, dueSoon, recent
- Cada item das seções inclui campos computados: myRole, isCreator, isPayer, isReceiver

**Filtros adicionados em `GET /agreements`:**
- `financialStatus` — filtra por status financeiro (ex: `FUNDS_HELD`, `DISPUTED`)
- `myRole` — filtra por papel: `creator`, `counterpart`, `payer`, `receiver`
- `pendingMyAction=true` — acordos onde o usuário precisa agir (versão precisa com subquery `events.none`)
- `hasGuarantee` — atalho para `type=WITH_GUARANTEE` (true) ou `type=SIMPLE` (false)
- `inDispute` — acordos com disputa bloqueante (`OPEN`, `UNDER_REVIEW`, `AWAITING_EVIDENCE`)
- `dueBefore` / `dueAfter` — filtro por prazo (ISO8601)

**Campos adicionados na resposta de listagem:**
- `payerId`, `receiverId` — identificação clara dos papéis financeiros
- `description` — conteúdo completo do acordo
- `receiverKeySnapshot` — snapshot da chave do recebedor no momento da criação
- `confirmationDeadlineAt` — prazo para confirmação
- `disputedAt` — quando a disputa foi aberta
- `participants[].acceptedAt` — quando cada parte aceitou
- `financialGuarantee[].lockedAt` — quando a garantia foi travada
- `dispute[].reason`, `dispute[].openedById` — razão e quem abriu a disputa
- Ordenação alterada de `createdAt` para `updatedAt desc` — acordos recentemente movimentados primeiro

**Lógica de `pendingMyAction` precisa (lista):**
Usa `events: { none: { actorId: userId, type: CONFIRMED } }` para detectar exatamente se o usuário já confirmou conclusão, evitando falsos positivos.

### Decisões desta fase

- **Endpoint de summary usa processamento in-memory**: uma única query busca todos os acordos; contadores e seções são calculados no Node.js. Eficiente para volume de acordos por usuário no MVP.
- **Summary.pendingMyAction é aproximado**: inclui todos em AWAITING_CONFIRMATION porque não busca eventos. Para contagem precisa, usar `GET /agreements?pendingMyAction=true`.
- **`GET /summary` declarado antes de `GET /:id`**: evita que Express capture `summary` como `:id`.
- **Sem migration**: nenhum campo novo no schema. Apenas lógica de query e serialização de campos já existentes.
- **Pix e Fitbank continuam simulados**: nenhuma movimentação real.

### Testes manuais — 2026-06-05

- ✅ Build limpo (`pnpm --filter @selo/api build` sem erros TypeScript)
- ✅ `GET /agreements/summary` compila e retorna estrutura correta
- ✅ Novos filtros compilam (`financialStatus`, `myRole`, `pendingMyAction`, `hasGuarantee`, `inDispute`, `dueBefore`, `dueAfter`)
- ✅ Route order: `GET /summary` registrado antes de `GET /:id`

---

## 6. O Que NÃO Foi Implementado Ainda

Os módulos abaixo existem como stubs (`NotImplementedException`) e aguardam as fases futuras:

| Funcionalidade | Fase | Módulo |
|---|---|---|
| Integração real Fitbank/BaaS | Fase 9 | `pix` + `payments` |
| Webhook real do PSP | Fase 9 | `pix` |
| Blockchain (submissão real) | Fase 9 | `blockchain-records` |
| Painel Admin funcional (Next.js) | Fase 9 | `apps/admin` |
| Notificações push | Fase 9 | `notifications` |
| Auth admin real (AdminUser + JWT) | Fase 9 | `admin` |
| App mobile integrado | Fase 9 | `apps/mobile` |

---

## 7. Próxima Fase

### Fase 9 — Integração Real e App Mobile

Objetivo: substituir simulações por integrações reais e construir as telas do app mobile.

O que implementar:
- App mobile (Expo): tela home usando `GET /agreements/summary`, listagens, detalhes
- Integração Fitbank/BaaS real: cobrança Pix, payout, reembolso
- Webhook real de confirmação do PSP (`POST /webhooks/pix/confirmation`)
- Auth admin real: login de `AdminUser` com JWT separado
- Painel Admin (`apps/admin`) funcional — lista disputas, resolve, vê acordos
- Submissão real à blockchain (Ethereum/Polygon testnet)
- Notificações push (Expo Notifications)

Não implementar ainda: Fitbank produção, mainnet blockchain, KYC completo.

---

## 8. Comandos Úteis

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

## 9. Links de Documentação

| Arquivo | Conteúdo |
|---------|----------|
| [CLAUDE.md](../CLAUDE.md) | Instruções do produto e regras de trabalho com Claude |
| [docs/architecture.md](architecture.md) | Arquitetura geral e fluxos |
| [docs/auth.md](auth.md) | Autenticação: endpoints, exemplos, fluxo futuro OTP |
| [docs/receiving-keys.md](receiving-keys.md) | Chave de Recebimento do App: conceito, endpoints, regras, exemplos |
| [docs/agreements.md](agreements.md) | Acordos: ciclo de vida, filtros expandidos, summary da wallet |
| [docs/receiving-destinations.md](receiving-destinations.md) | Destino de Recebimento: conceito, endpoints, mascaramento, bloqueio, snapshot |
| [docs/guaranteed-agreements.md](guaranteed-agreements.md) | Acordos com Garantia: fluxo financeiro, endpoints, simulação, PowerShell |
| [docs/payments.md](payments.md) | Pagamentos: PaymentIntent, PixCharge, simulate-confirmation, dev vs. produção |
| [docs/disputes.md](disputes.md) | Disputas: abertura, mensagens, score, resolução admin |
| [docs/database.md](database.md) | Todos os 22 models e 37 enums do schema Prisma |
| [docs/modules.md](modules.md) | Endpoints de todos os módulos do backend |
| [docs/getting-started.md](getting-started.md) | Setup inicial do ambiente |
