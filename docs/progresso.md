# Progresso do Projeto Selo

Última atualização: 2026-06-06 (Fase 24 — Fitbank Sandbox / Pix Sandbox)

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
| App Mobile (shell + home wallet) | ✅ Implementado (Fase 9) |
| App Mobile (criação de acordos + detalhe) | ✅ Implementado (Fase 10) |
| App Mobile (Pix simulado + contestação formal) | ✅ Implementado (Fase 11) |
| App Mobile (Perfil, Chave, Destino de Recebimento) | ✅ Implementado (Fase 12) |
| App Mobile (Refresh JWT, Interceptor 401, Erros Globais) | ✅ Implementado (Fase 13) |
| App Mobile (Notificações In-App, Central de Atividades, Badge) | ✅ Implementado (Fase 14) |
| Painel Admin Web — Operação de Disputas | ✅ Implementado (Fase 15) |
| Testes Automatizados do MVP (142 testes unitários) | ✅ Implementado (Fase 16) |
| Auth Admin Real (AdminUser + JWT separado, 155 testes) | ✅ Implementado (Fase 17) |
| Testes E2E com PostgreSQL Real (83 testes E2E, 238 total) | ✅ Implementado (Fase 18) |
| Polimento UX Mobile de Prazo (Date Picker + Time Wheel) | ✅ Implementado (Fase 19) |
| Auditoria Final do MVP Simulado | ✅ Implementado (Fase 20) |
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

## 5e. Fase 9 — Mobile Shell + Home Wallet (Implementada)

### Telas criadas

| Tela | Arquivo | Endpoints consumidos |
|---|---|---|
| Home Wallet | `app/(app)/home.tsx` | `GET /agreements/summary` |
| Combinados | `app/(app)/agreements.tsx` | `GET /agreements` (9 filtros) |
| Criar (placeholder) | `app/(app)/create.tsx` | — |
| Perfil | `app/(app)/profile.tsx` | `GET /auth/me`, `GET /receiving-keys/me`, `GET /receiving-destinations/me` |
| Login | `app/(auth)/login.tsx` | `POST /auth/login` |
| Cadastro | `app/(auth)/register.tsx` | `POST /auth/register` |

### O que foi implementado

- **Design system** completo (`src/theme/index.ts`): Colors, Spacing, Radii, FontSize, FontWeight, Shadow
- **Componentes reutilizáveis**: StatusBadge, AgreementCard, EmptyState, LoadingState/SkeletonCard, PrimaryButton, FinancialCard, SectionHeader
- **Bottom Navigation** com botão central "Criar" flutuante elevado
- **Home Wallet**: saudação, score de confiança com cor por nível, chave Selo, 3 cartões financeiros (receber/pagar/protegido), chips de estatísticas, ações rápidas, seções por categoria
- **Filtros visuais** na tela Combinados: 9 chips que passam parâmetros corretos para o backend
- **Perfil**: avatar com iniciais, score, chave, destinos mascarados, sair
- **Auth com formulários reais**: validação, loading, erros amigáveis
- **Auth check assíncrono** no `index.tsx`: verifica SecureStore antes de redirecionar
- **Fallback offline**: telas mostram erro + "Tentar novamente" sem crashar

### Dependência adicionada

- `@expo/vector-icons: ^14.0.0` — já estava no pnpm lockfile como dep transitiva

### Decisões

- **`expo-env.d.ts`**: declara `process.env.EXPO_PUBLIC_API_URL` globalmente para TypeScript sem precisar de `@types/node`
- **`TouchableOpacityProps`** para o botão de tab customizado: compatível com o que expo-router injeta sem import de `@react-navigation/bottom-tabs`
- **`Promise.allSettled`** no `useProfile`: se a chave ou os destinos não estiverem configurados (404), o perfil ainda carrega sem erro fatal
- **Fluxo de criação placeholder**: tela informativa com Alert "Em breve" — escopo da Fase 10

### Testes manuais — validação

- ✅ `pnpm --filter @selo/mobile typecheck` — limpo
- ✅ `pnpm --filter @selo/api build` — limpo, sem regressão no backend
- App funciona com API rodando (`pnpm dev:api` + `pnpm dev:mobile`)

---

## 5f. Fase 10 — Fluxo de Criação de Acordos + Detalhe (Implementada)

### Telas criadas

| Tela | Arquivo | Endpoints consumidos |
|---|---|---|
| Wizard de criação | `app/create-agreement.tsx` | `GET /receiving-keys/resolve/:key`, `POST /agreements/simple`, `POST /agreements/guaranteed` |
| Detalhe do acordo | `app/agreement/[id].tsx` | `GET /agreements/:id`, ações POST |

### O que foi implementado

- **Wizard de criação guiado** em 5 etapas: quem → título → valor → prazo → resumo
- **Resolução de chave de recebimento** em tempo real via `GET /receiving-keys/resolve/:key` com confirmação visual (`ReceiverPreviewCard`)
- **Acordo simples**: criado para tipos `receive`, `pay`, `custom` via `POST /agreements/simple`
- **Acordo com garantia**: tipo `guaranteed` via `POST /agreements/guaranteed` com verificação de destino de recebimento
- **Mensagens de erro amigáveis**: destinatário sem destino, criando consigo mesmo, chave inválida, backend indisponível
- **Resumo em linguagem humana**: frase gerada no cliente que explica o acordo em português claro
- **Tela de sucesso** com botões "Ver acordo" e "Voltar para início"
- **Detalhe do acordo**: exibe participantes, status, valor, prazo, descrição, estado da garantia
- **Ações contextuais no detalhe**: aceitar, recusar, cancelar, concluir (simples), confirmar conclusão (garantia)
- **JWT decode client-side** para identificar o papel do usuário sem chamada extra à API
- **Seleção de prazo** com chips (Sem prazo / 7 dias / 30 dias / Personalizado)
- **Novos componentes**: `StepHeader` (barra de progresso), `ReceiverPreviewCard` (confirmação do recebedor)

### Decisões

- **Wizard no Stack raiz** (`app/create-agreement.tsx`): aparece sobre o tab bar com `headerShown: false`, mantendo o botão de voltar do StepHeader no lugar do header nativo
- **Detalhe no Stack raiz** (`app/agreement/[id].tsx`): header nativo roxo "Combinado", tab bar oculto, comportamento padrão de banco digital
- **JWT decode para userId**: `atob()` nativo do RN 0.74 — sem biblioteca e sem chamada extra a `/auth/me`
- **Ações recarregam o detalhe** (`loadData()`): após qualquer ação, a tela busca o acordo atualizado, garantindo dados frescos
- **`parseDateInput`**: implementado inline sem dependência de date picker — formato DD/MM/AAAA com validação básica
- **Pix e Fitbank continuam simulados**: nenhuma movimentação financeira real nesta fase

### Testes — validação de build

- ✅ `pnpm --filter @selo/mobile typecheck` — limpo (2 erros corrigidos: tipo de retorno de ações, comparação redundante)
- ✅ `pnpm --filter @selo/api build` — limpo, sem regressão no backend
- Schema não alterado / migration não rodada / commit não feito

---

## 5g. Fase 11 — Garantia, Pix Simulado e Contestação Formal no Mobile (Implementada)

### O que foi implementado

- **Fluxo Pix simulado no app**: card "Pagar com Pix" quando o criador precisa depositar; geração de PaymentIntent + exibição do código Pix copiável; botão de simulação de confirmação
- **Card "Valor protegido"**: exibido quando `FUNDS_HELD`, mostra valor, destino mascarado e mensagem humana
- **Dupla confirmação contextual**: mensagem diferente na 1ª e 2ª confirmação (Alert informativo)
- **Contestação formal no app**: botão "Contestar" → formulário inline com motivo + descrição objetiva + aviso sobre travamento
- **Histórico formal da contestação**: seção "Contestação" com status, quem abriu, motivo, descrição e histórico de evidências formais
- **Adição de evidências**: botão "Adicionar evidência" → campo de texto → `POST /disputes/:id/messages` (tratado como registro formal, não chat)
- **Card de resolução administrativa**: exibido quando a contestação é resolvida, com resultado (liberado/reembolsado), justificativa e data
- **Mensagens de erro amigáveis**: cobertura de todos os cenários (sessão expirada, sem permissão, contestação já aberta, pagamento em andamento, etc.)
- **Estado "Em contestação"**: botões de ação substituídos por card informativo enquanto contestação está aberta

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/mobile/src/services/payments.service.ts` | `simulateConfirmation(paymentIntentId)` |
| `apps/mobile/src/services/disputes.service.ts` | `getById(disputeId)`, `addEvidence(disputeId, payload)` |

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `apps/mobile/src/types/api.ts` | +6 tipos: `PaymentIntentResponse`, `SimulateConfirmationResponse`, `OpenDisputePayload`, `DisputeMessage`, `DisputeDetail`, `AddEvidencePayload` |
| `apps/mobile/src/services/agreements.service.ts` | +3 métodos: `createPaymentIntent`, `openDispute`, `getDispute` |
| `apps/mobile/app/agreement/[id].tsx` | Reescrita completa (772 → 1296 linhas) |

### Endpoints consumidos

| Método | Rota | Tela |
|---|---|---|
| POST | `/api/v1/agreements/:id/payment-intents` | Card "Pagar com Pix" |
| POST | `/api/v1/payments/:id/simulate-confirmation` | Botão simulação |
| GET | `/api/v1/disputes/:id` | Carregado automaticamente |
| POST | `/api/v1/agreements/:id/dispute` | Formulário de contestação |
| POST | `/api/v1/disputes/:id/messages` | Envio de evidência formal |

### Decisões desta fase

- **Contestação não é chat**: o backend usa `/messages` por compatibilidade, mas o app trata como evidência/registro formal unidirecional. Nunca exibe como conversa.
- **Pix continua simulado**: `POST /payment-intents` cria QR Code simulado; `simulate-confirmation` confirma sem Fitbank real.
- **Formulário inline**: a contestação abre como seção inline na scroll view (não Modal). Simplicidade e sem dependência de novo componente.
- **Dispute detail load**: carregado em paralelo após carregar o agreement; erro não bloqueia exibição do acordo.
- **Share nativo para código Pix**: usa `Share.share()` do React Native — sem nova dependência.
- **Mensagens de erro contextuais**: função `mapApiError()` mapeia mensagens brutas para texto amigável em português por contexto (pix, dispute, confirm, action).
- **Sem migration**: nenhuma alteração no schema Prisma.
- **Sem commit**: conforme instrução.

### Validação

- `pnpm --filter @selo/mobile typecheck` → ✅ limpo
- `pnpm --filter @selo/api build` → ✅ limpo, sem regressão

---

## 5h. Fase 12 — Perfil, Chave de Recebimento e Destino de Recebimento no Mobile (Implementada)

### O que foi implementado

- **Tela de Perfil reescrita**: hub completo com avatar, score colorido, texto explicativo, seções bem separadas
- **Edição de perfil**: nova tela `edit-profile` com campos nome, sobrenome, nome exibido, bio → `PATCH /users/me/profile`
- **Gerenciamento da Chave de Recebimento**:
  - Exibição da chave ativa com botões Copiar, Compartilhar e Excluir
  - Formulário inline de criação: handle input + verificação de disponibilidade (`GET /check/:key`) + criação
  - Confirmação antes da exclusão; mensagem de erro se há pendências bloqueando
- **Gerenciamento de Destinos de Recebimento**:
  - Lista com tipo, masked value, label, badge "Padrão" por destino
  - Ações por item: "Definir padrão", "Editar" (label + toggle isDefault inline), "Excluir"
  - Formulário de novo destino: type picker em chips (CPF/Email/Telefone/Aleatória), pixKey, label, isDefault toggle
  - Nota de ambiente de desenvolvimento visível em amarelo
  - Confirmação antes da exclusão; mensagem amigável para 409 (vinculado a acordos)
- **Tratamento de erros**: `mapError()` com mensagens amigáveis por cenário; redirecionamento para login em 401
- **Logout**: "Sair da conta" com confirmação, limpa tokens, redireciona para login

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/mobile/src/services/users.service.ts` | `updateProfile(payload)` → `PATCH /users/me/profile` |
| `apps/mobile/app/edit-profile.tsx` | Tela de edição de perfil básico |

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `apps/mobile/src/services/receiving-keys.service.ts` | Adicionado `deleteMe()` |
| `apps/mobile/app/(app)/profile.tsx` | Reescrita completa — hub de perfil, chave e destinos |
| `apps/mobile/app/_layout.tsx` | Adicionado `edit-profile` no Stack |

### Endpoints consumidos

| Método | Rota | Tela |
|---|---|---|
| GET | `/api/v1/auth/me` | Perfil + edit-profile |
| PATCH | `/api/v1/users/me/profile` | edit-profile |
| GET | `/api/v1/receiving-keys/me` | Perfil |
| POST | `/api/v1/receiving-keys` | Formulário de criação de chave |
| GET | `/api/v1/receiving-keys/check/:key` | Verificação de disponibilidade |
| DELETE | `/api/v1/receiving-keys/me` | Exclusão de chave |
| GET | `/api/v1/receiving-destinations/me` | Perfil |
| POST | `/api/v1/receiving-destinations` | Formulário de novo destino |
| PATCH | `/api/v1/receiving-destinations/:id` | Edit inline de destino |
| DELETE | `/api/v1/receiving-destinations/:id` | Exclusão de destino |

### Decisões desta fase

- **Tela de perfil como hub único**: gerenciamento de chave e destino é feito inline na própria tela (sem sub-screens adicionais para essas ações). Apenas edição de perfil usa tela separada (campos múltiplos).
- **`check` antes de criar**: formulário de chave sugere verificar disponibilidade antes de criar, mas não bloqueia — o backend retorna erro claro se o handle já existir.
- **Clipboard**: em vez de `expo-clipboard` (dependência nova), usa `Alert.alert` para exibir o handle completo (usuário copia manualmente). Para compartilhar, usa `Share.share` nativo — sem nova dependência.
- **Inline edit de destino**: o formulário de edição expande na própria linha do destino via estado local — sem Modal, sem navegação.
- **Tipo de chave**: `deleteMe()` chama `DELETE /receiving-keys/me` (o backend usa soft delete — `status: DELETED`).
- **Sem migration**: nenhuma alteração no schema Prisma.
- **Sem commit**: conforme instrução.
- **Fitbank não integrado**: Pix continua simulado; nenhum dinheiro real movimentado.

### Validação

- `pnpm --filter @selo/mobile typecheck` → ✅ limpo
- `pnpm --filter @selo/api build` → ✅ limpo, sem regressão

---

## 6. O Que NÃO Foi Implementado Ainda

Os módulos abaixo existem como stubs (`NotImplementedException`) ou aguardam as fases futuras:

| Funcionalidade | Fase | Módulo |
|---|---|---|
| Integração real Fitbank/BaaS | Futuro | `pix` + `payments` |
| Webhook real do PSP | Futuro | `pix` |
| Blockchain (submissão real) | Futuro | `blockchain-records` |
| Painel Admin funcional (Next.js) — operação de disputas | ✅ Implementado (Fase 15) | `apps/admin` |
| Push notifications reais (Expo Notifications) | Futuro | `notifications` |
| Auth admin real (AdminUser + JWT) | ✅ Implementado (Fase 17) | `admin` — AdminJwtGuard + JWT separado |
| Upload de arquivo como evidência de contestação | Futuro | `apps/mobile` |
| Upload de avatar | Futuro | `apps/mobile` |

---

## 5i. Fase 13 — Infraestrutura Mobile de Sessão, Refresh JWT e Tratamento Global de Erros (Implementada)

### O que foi implementado

- **Refresh automático de JWT**: interceptor no `api.ts` detecta 401, tenta `POST /auth/refresh`, salva novo token e repete a requisição original — transparente para o usuário
- **Proteção contra múltiplos refresh simultâneos**: `refreshInFlight` (Promise compartilhada) garante que múltiplas requisições com 401 simultâneas disparam apenas um refresh
- **Proteção contra loop infinito**: `isAuthPath()` impede que rotas de autenticação disparem novo refresh
- **Logout automático com Alert**: quando refresh falha definitivamente, tokens são limpos e `Alert.alert` exibe "Sua sessão expirou" + redirect para login
- **Handler de sessão registrável**: `registerSessionExpiredHandler()` em `api.ts`; registrado no root layout via `useEffect` em `app/_layout.tsx`
- **Utilitário centralizado de erros** `src/utils/errors.ts`: `mapError()` retorna mensagem humana em português por código HTTP; `isSessionExpired()` detecta erros de sessão
- **Retry e pull-to-refresh na lista de Combinados**: botão "Tentar novamente" no estado de erro; `RefreshControl` no `FlatList`

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/mobile/src/utils/errors.ts` | `mapError(e)` e `isSessionExpired(e)` — utilitários de erro centralizados |

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `apps/mobile/src/services/api.ts` | Interceptor 401 → refresh → retry; `registerSessionExpiredHandler`; `clearTokens`; `refreshInFlight` |
| `apps/mobile/app/_layout.tsx` | Registra `sessionExpiredHandler`; Alert de sessão expirada + redirect para login |
| `apps/mobile/app/(app)/agreements.tsx` | Botão retry no estado de erro; `RefreshControl` no `FlatList`; usa `mapError` |

### Endpoints consumidos

| Método | Rota | Quando |
|---|---|---|
| POST | `/api/v1/auth/refresh` | Automaticamente ao receber 401 em qualquer requisição autenticada |

### Decisões desta fase

- Nenhuma regra financeira foi alterada
- Schema não foi alterado / migration não foi rodada / commit não foi feito
- Fitbank não integrado / Pix real não implementado / KYC não implementado / blockchain não integrada
- Notificações push e botão de reembolso permanecem para a Fase 14

### Validação

- `pnpm --filter @selo/mobile typecheck` → ✅ limpo, sem erros TypeScript
- `pnpm --filter @selo/api build` → ✅ limpo, sem regressão no backend

---

## 5i. Fase 14 — Notificações In-App e Central de Atividades (Implementada)

### O que foi implementado

- **NotificationsService** aprimorado: `findAllByUser` com paginação e filtros; `getUnreadCount`
- **NotificationsController** expandido: `GET /unread-count`; filtros de query; `POST` além de `PATCH` para marcar como lida
- **Geração automática de notificações** em `AgreementsService`, `PaymentsService` e `AdminService` — 15+ eventos mapeados
- **Tela "Atividades"** (`app/(app)/notifications.tsx`): lista com ícones por tipo, data relativa, estados de loading/erro/vazio, pull-to-refresh, "Marcar todas como lidas", navegação para acordo ao tocar
- **Aba "Atividades"** na Bottom Navigation (5 abas: Home | Combinados | [+] | Atividades | Perfil)
- **Badge de não lidas** na aba Atividades, atualizado via listener module-level

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/mobile/src/services/notifications.service.ts` | Serviço + listener de badge |
| `apps/mobile/app/(app)/notifications.tsx` | Tela "Atividades" |

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `apps/api/src/modules/notifications/notifications.service.ts` | Paginação, filtros, `getUnreadCount`, tipagem forte |
| `apps/api/src/modules/notifications/notifications.controller.ts` | `GET /unread-count`; filtros de query; `@Post` em read endpoints |
| `apps/api/src/modules/agreements/agreements.module.ts` | Importa `NotificationsModule` |
| `apps/api/src/modules/agreements/agreements.service.ts` | Injeta `NotificationsService`; 10+ eventos notificados |
| `apps/api/src/modules/payments/payments.module.ts` | Importa `NotificationsModule` |
| `apps/api/src/modules/payments/payments.service.ts` | Notifica `FUNDS_LOCKED` |
| `apps/api/src/modules/admin/admin.module.ts` | Importa `NotificationsModule` |
| `apps/api/src/modules/admin/admin.service.ts` | Notifica `DISPUTE_RESOLVED` em resolve-release/refund |
| `apps/mobile/src/types/api.ts` | `AppNotification`, `NotificationType`, `NotificationListResponse`, `UnreadCountResponse` |
| `apps/mobile/app/(app)/_layout.tsx` | Aba Atividades + badge |

### Decisões

- Notificações são fire-and-forget (`.catch(() => {})`) — falha não desfaz a operação principal
- Schema Prisma não foi alterado
- Push notifications reais não implementadas (out of scope do MVP)
- Listener module-level para badge sem overhead de React Context

### Validação

- `pnpm --filter @selo/mobile typecheck` → ✅ Exit 0
- `pnpm --filter @selo/api build` → ✅ Exit 0

---

## 5j. Fase 15 — Painel Admin Visual Web para Operação de Disputas (Implementada)

### O que foi implementado

- **Painel admin web funcional** em `apps/admin` (Next.js 14, App Router, TypeScript)
- **Autenticação admin provisória**: tela `/login` com campo de token; valida contra `GET /admin/health`; token salvo em `localStorage`; logout limpa token; 401/403 da API redireciona automaticamente para login
- **Dashboard** (`/dashboard`): cards de estatísticas (usuários, combinados, contestações totais, contestações abertas); banner de alerta para contestações abertas com link direto; atalhos de navegação
- **Lista de contestações** (`/disputes`): tabela responsiva com filtros por status (chips); colunas com status badge semântico, acordo/valor, pagador→recebedor, data; contestações abertas destacadas em âmbar; paginação
- **Detalhe da contestação** (`/disputes/[id]`): 6 blocos de informação (resumo, acordo, participantes, valor protegido, evidências formais, histórico de eventos); timeline cronológica de eventos; ações administrativas visíveis apenas para contestações abertas
- **Modais de ação** com justificativa obrigatória (≥10 chars): "Liberar ao recebedor" e "Reembolsar pagador"; confirmação antes de executar; erro claro se backend recusar
- **Terminologia administrativa**: registros das partes são chamados de "Evidências e registros formais" (nunca "chat" ou "mensagens")
- **Cliente HTTP admin**: `src/lib/api.ts` com baseURL via env, X-Admin-Token em todas as chamadas, tratamento de 401/403, erros amigáveis
- **StatusBadge**: cobre 4 dimensões (dispute, financial, guarantee, operational) com todas as variantes de status do Prisma

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/admin/src/lib/types.ts` | Tipos TypeScript alinhados com respostas do backend |
| `apps/admin/src/lib/api.ts` | Cliente HTTP com X-Admin-Token, tratamento 401, `ApiError` |
| `apps/admin/src/components/AdminLayout.tsx` | Sidebar + navegação (Dashboard, Contestações, Sair) |
| `apps/admin/src/components/Modal.tsx` | Modal de confirmação reutilizável com backdrop |
| `apps/admin/src/components/StatusBadge.tsx` | Badge semântico para 4 tipos de status |
| `apps/admin/src/app/login/page.tsx` | Tela de login com token admin |
| `apps/admin/src/app/dashboard/page.tsx` | Dashboard com stats e alertas |
| `apps/admin/src/app/disputes/page.tsx` | Lista de contestações com filtros e paginação |
| `apps/admin/src/app/disputes/[id]/page.tsx` | Detalhe completo + modais de resolução |
| `apps/admin/.env.example` | Variáveis de ambiente do painel |
| `docs/admin.md` | Documentação completa do painel admin |

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `apps/admin/src/app/layout.tsx` | Reset CSS global; metadata atualizado |
| `apps/admin/src/app/page.tsx` | Redirect para /login ou /dashboard baseado em token |

### Endpoints consumidos

| Método | Rota | Tela |
|---|---|---|
| GET | `/api/v1/admin/health` | Login (validação do token) |
| GET | `/api/v1/admin/stats` | Dashboard |
| GET | `/api/v1/admin/disputes` | Lista de contestações |
| GET | `/api/v1/admin/disputes/:id` | Detalhe da contestação |
| POST | `/api/v1/admin/disputes/:id/resolve-release` | Modal "Liberar ao recebedor" |
| POST | `/api/v1/admin/disputes/:id/resolve-refund` | Modal "Reembolsar pagador" |

### Confirmações obrigatórias

- Schema Prisma não foi alterado
- Migration não foi rodada
- Commit não foi feito
- Fitbank não integrado (payout/refund simulados)
- Pix real não implementado
- Blockchain real não implementada
- KYC não implementado
- Push notifications reais não implementadas
- Chat não implementado
- Nenhuma regra financeira foi alterada
- Nenhum dinheiro real é movimentado

### Validação

- `pnpm --filter @selo/admin typecheck` → ✅ Exit 0
- `pnpm --filter @selo/api build` → ✅ Exit 0

---

## 5k. Fase 16 — Testes Automatizados do MVP (Implementada)

### Objetivo

Criar uma base inicial de testes unitários para proteger o núcleo do MVP contra regressões, sem adicionar funcionalidade financeira real, sem alterar regras de negócio, sem alterar schema e sem movimentar dinheiro.

### O que foi implementado

- **9 suítes de testes unitários** cobrindo todos os serviços críticos do backend
- **142 testes** passando com Exit 0
- **Mocks de Prisma** via `jest.fn()` — sem banco real necessário
- **Factory de dados de teste** compartilhada em `src/test/helpers/factories.ts`
- **Tempo de execução**: ~7 segundos para toda a suíte

### Arquivos criados

| Arquivo | Testes |
|---|---|
| `apps/api/src/test/helpers/factories.ts` | Factories e mock do PrismaService |
| `apps/api/src/modules/auth/auth.service.spec.ts` | 18 testes — Auth, JWT, refresh, logout |
| `apps/api/src/modules/receiving-keys/receiving-keys.service.spec.ts` | 21 testes — Chave de Recebimento do App |
| `apps/api/src/modules/receiving-destinations/receiving-destinations.service.spec.ts` | 19 testes — Destino de Recebimento |
| `apps/api/src/modules/agreements/agreements.service.spec.ts` | 30 testes — Acordos simples e com garantia |
| `apps/api/src/modules/payments/payments.service.spec.ts` | 6 testes — Pix simulado |
| `apps/api/src/modules/disputes/disputes.service.spec.ts` | 10 testes — Disputas formais |
| `apps/api/src/modules/admin/admin.service.spec.ts` | 15 testes — Resolução admin |
| `apps/api/src/modules/notifications/notifications.service.spec.ts` | 11 testes — Notificações in-app |
| `apps/api/src/modules/trust-score/trust-score.service.spec.ts` | 12 testes — Score de confiança |
| `docs/tests.md` | Documentação completa da estratégia de testes |

### Fluxos críticos cobertos

- Auth completo (registro, login, refresh, logout, getMe)
- Detecção de reutilização de refresh token → revogação automática
- Normalização case-insensitive da Chave de Recebimento
- Mascaramento de dados sensíveis do Destino de Recebimento
- Bloqueio de exclusão com pendências
- Criação de acordo simples e com garantia
- Abertura de disputa → financialStatus DISPUTED, garantia FROZEN_DISPUTE
- Release e confirmCompletion bloqueados por disputa aberta
- Pix simulado → garantia LOCKED
- Dupla confirmação (idempotência)
- Resolução admin (resolve-release e resolve-refund)
- Trust score: deltas, limites 0–1000, nível por faixa
- Notificações in-app (send, findAll, markRead, markAllRead)

### Validação

- `pnpm --filter @selo/api test` → ✅ 142 testes, 0 falhas
- `pnpm --filter @selo/api build` → ✅ Exit 0
- `pnpm --filter @selo/mobile typecheck` → ✅ Exit 0
- `pnpm --filter @selo/admin typecheck` → ✅ Exit 0

### Confirmações obrigatórias

- Schema Prisma não foi alterado
- Migration não foi rodada
- Commit não foi feito
- Fitbank não integrado
- Pix real não implementado
- Blockchain real não implementada
- KYC não implementado
- Push notifications reais não implementadas
- Chat não implementado
- Nenhuma regra financeira foi alterada
- Nenhum dinheiro real é movimentado

---

## 5l. Fase 17 — Auth Admin Real (AdminUser + JWT) (Implementada)

### Objetivo

Substituir a autenticação provisória do painel admin (`X-Admin-Token` estático) por autenticação real usando `AdminUser` com JWT admin separado.

### Endpoints criados

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/v1/admin/auth/login` | Público | Login com email + senha de AdminUser |
| GET | `/api/v1/admin/auth/me` | AdminJwtGuard | Dados do admin autenticado |
| POST | `/api/v1/admin/auth/logout` | AdminJwtGuard | Logout (stateless) |

### Guards/strategies criados

| Arquivo | Descrição |
|---|---|
| `common/guards/admin-jwt.guard.ts` | `AdminJwtGuard` — valida JWT admin + exporta `AdminContext` |
| `common/strategies/admin-jwt.strategy.ts` | `AdminJwtStrategy` — Passport strategy `"admin-jwt"`, valida `type==="admin"` |
| `common/decorators/current-admin.decorator.ts` | `@CurrentAdmin()` — extrai `AdminContext` do request |

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `modules/admin/dto/admin-login.dto.ts` | DTO de login: email + senha |
| `modules/admin/admin-auth.service.ts` | login, getMe, logout |
| `modules/admin/admin-auth.controller.ts` | Controller `/admin/auth/*` |
| `modules/admin/admin-auth.service.spec.ts` | 13 testes unitários |
| `common/guards/admin-jwt.guard.ts` | Guard JWT admin |
| `common/strategies/admin-jwt.strategy.ts` | Strategy JWT admin |
| `common/decorators/current-admin.decorator.ts` | Decorator admin |

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `modules/admin/admin.module.ts` | JwtModule admin, novos providers e controllers |
| `modules/admin/admin.controller.ts` | Switch de `AdminTokenGuard` → `AdminJwtGuard`; `@CurrentAdmin()` em vez de `req.adminContext` |
| `apps/api/.env.example` | Adicionado `ADMIN_JWT_SECRET` e `ADMIN_JWT_EXPIRES_IN` |
| `apps/admin/src/lib/api.ts` | `X-Admin-Token` → `Authorization: Bearer <token>` |
| `apps/admin/src/lib/types.ts` | Adicionados `AdminUser`, `AdminLoginResponse`, `AdminMeResponse` |
| `apps/admin/src/app/login/page.tsx` | Formulário email + senha; chama `POST /admin/auth/login` |
| `apps/api/src/test/helpers/factories.ts` | `makeAdminUser()` + `adminUser` no mock do Prisma |
| `docs/admin.md` | Seção de autenticação atualizada para Fase 17 |

### Como funciona o JWT admin

```
POST /admin/auth/login { email, password }
  → bcrypt.compare(password, admin.passwordHash)
  → jwtService.sign({ sub, email, role, type: "admin" }, ADMIN_JWT_SECRET)
  → { accessToken, expiresIn, admin: { id, email, name, role } }

Rotas protegidas:
  Authorization: Bearer <accessToken>
  → AdminJwtStrategy.validate(payload)
  → verifica payload.type === "admin"
  → verifica adminUser.status === "ACTIVE"
  → req.user = { id, email, role }
  → @CurrentAdmin() extrai req.user
```

### Separação de JWT

| Token | Secret env | Payload type | Valida no guard |
|---|---|---|---|
| Usuário | `JWT_SECRET` | não tem `type` | `JwtAuthGuard` |
| Admin | `ADMIN_JWT_SECRET` | `type: "admin"` | `AdminJwtGuard` |

Tokens de usuário são rejeitados em rotas admin (secret diferente + `type !== "admin"`).
Tokens admin são rejeitados em rotas de usuário (secret diferente, falha na assinatura).

### Validação

- `pnpm --filter @selo/api test` → ✅ **155 testes, 10 suítes, 0 falhas**
- `pnpm --filter @selo/api build` → ✅ Exit 0
- `pnpm --filter @selo/mobile typecheck` → ✅ Exit 0
- `pnpm --filter @selo/admin typecheck` → ✅ Exit 0

### Confirmações obrigatórias

- Schema Prisma não foi alterado
- Migration não foi rodada
- Commit não foi feito
- Fitbank não integrado
- Pix real não implementado
- Blockchain real não implementada
- KYC não implementado
- Push notifications reais não implementadas
- Chat não implementado
- Nenhuma regra financeira foi alterada
- Nenhum dinheiro real foi movimentado
- Fluxo de disputa humana não foi alterado

---

## 5m. Fase 18 — Testes E2E com PostgreSQL Real (Implementada)

### Objetivo

Provar que o fluxo completo do MVP funciona de ponta a ponta com banco de dados real. Os testes E2E cobrem todos os fluxos críticos: cadastro, chaves, acordos simples, acordos com garantia, pagamento simulado, contestação formal e resolução administrativa.

### O que foi implementado

- `apps/api/jest-e2e.json` — configuração Jest para testes E2E
- `apps/api/package.json` — script `test:e2e`
- `apps/api/test/e2e/global-setup.ts` — limpeza de dados de teste antes da suíte
- `apps/api/test/e2e/global-teardown.ts` — limpeza de dados de teste após a suíte
- `apps/api/test/e2e/mvp-flow.e2e-spec.ts` — 83 testes E2E com PostgreSQL real

### Fluxos cobertos (83 testes)

| Bloco | Testes |
|---|---|
| Cadastro e Autenticação | 8 |
| Chave de Recebimento do App | 9 |
| Destino de Recebimento | 5 |
| Validação dueDate obrigatório (via class-validator) | 3 |
| Acordo Simples completo | 7 |
| Acordo com Garantia (Dupla Confirmação) | 10 |
| Contestação + Resolução Admin (Release) | 12 |
| Resolução Admin (Reembolso) | 7 |
| Notificações In-App | 9 |
| Wallet Summary | 4 |
| Admin — Listagem e Detalhe | 5 |
| **Total** | **83** |

### Mudanças de comportamento

- `dueDate` agora é **obrigatório** em `CreateSimpleAgreementDto` e `CreateGuaranteedAgreementDto`
- Mobile: opção "Sem prazo" removida do picker de datas; prazo padrão inicial = 7 dias
- Mobile: validação de prazo no step 3 agora exige que uma opção seja selecionada

### Banco de dados de teste

- Usa o mesmo banco `selodb` (PostgreSQL porta 5434) com dados de usuário prefixados `e2e-*`
- Limpeza automática antes/depois de cada execução
- Não cria banco separado, não roda migration nova

### Resultados

| Suíte | Resultado |
|---|---|
| `pnpm --filter @selo/api test` | ✅ **155 testes, 10 suítes, 0 falhas** |
| `pnpm --filter @selo/api test:e2e` | ✅ **83 testes, 1 suíte, 0 falhas** |
| `pnpm --filter @selo/api build` | ✅ Exit 0 |
| `pnpm --filter @selo/mobile typecheck` | ✅ Exit 0 |
| `pnpm --filter @selo/admin typecheck` | ✅ Exit 0 |

### Confirmações Obrigatórias

| Restrição | Status |
|---|---|
| Schema Prisma alterado? | **Não** |
| Migration nova rodada? | **Não** |
| Fitbank real? | **Não** |
| Pix real? | **Não** |
| Blockchain real? | **Não** |
| KYC? | **Não** |
| Push notifications reais? | **Não** |
| Chat? | **Não** |
| Regra financeira alterada? | **Não** |
| Dinheiro real movimentado? | **Não** |
| Commit feito? | **Não** |

---

---

## 5n. Fase 19 — Polimento UX Mobile de Prazo (Implementada)

### Objetivo

Melhorar a etapa de prazo no wizard de criação de acordos: substituir o input DD/MM/AAAA por chips visuais de data rápida e adicionar um scroll wheel de horário para o usuário escolher hora e minuto explicitamente.

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/mobile/src/components/TimeWheelPicker.tsx` | Scroll wheel de horário (48 slots, 30min, snap, seleção por toque ou scroll) |
| `apps/mobile/src/components/DueDatePicker.tsx` | Picker combinado: chips de data rápida + campo manual + TimeWheelPicker + preview final |

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `apps/mobile/src/components/index.ts` | Exporta `DueDatePicker` e `TimeWheelPicker` |
| `apps/mobile/app/create-agreement.tsx` | Etapa 3 usa `DueDatePicker`; estado substituído por `selectedDate/hour/minute`; resumo e sucesso exibem hora |
| `docs/mobile.md` | Seção Fase 19 completa — componentes, funcionamento, limitações |
| `docs/progresso.md` | Este arquivo |

### Como funciona

| Item | Comportamento |
|---|---|
| Chips de data rápida | Hoje / Amanhã / 7 dias / 30 dias; chip ativo fica roxo com data curta embaixo |
| Data personalizada | Botão "Outra data" abre campo DD/MM/AAAA; o botão some se seleção rápida ativa |
| Preview de data | Aparece ao selecionar qualquer dia: "25/06/2026" |
| TimeWheelPicker | 48 slots de 30min (00:00–23:30); scroll com snap; item central = selecionado; toque anima |
| Padrão inicial | 7 dias a partir de hoje + 18:00 |
| Preview final | "Prazo: 25/06/2026 às 18:00" |
| dueDate enviado | `new Date(selectedDate).setHours(hour, minute, 0, 0).toISOString()` |
| Validação | Data obrigatória + prazo não pode ser passado |

### Resultados

| Comando | Resultado |
|---|---|
| `pnpm --filter @selo/mobile typecheck` | ✅ Exit 0 |
| `pnpm --filter @selo/api test` | ✅ **155 testes, 10 suítes, 0 falhas** |
| `pnpm --filter @selo/api test:e2e` | ✅ **83 testes, 1 suíte, 0 falhas** |
| `pnpm --filter @selo/api build` | ✅ Exit 0 |
| `pnpm --filter @selo/admin typecheck` | ✅ Exit 0 |

### Confirmações obrigatórias

| Restrição | Status |
|---|---|
| Schema Prisma alterado? | **Não** |
| Migration nova? | **Não** |
| Fitbank real? | **Não** |
| Pix real? | **Não** |
| Blockchain real? | **Não** |
| KYC? | **Não** |
| Push notifications reais? | **Não** |
| Chat? | **Não** |
| dueDate tornado opcional? | **Não — continua obrigatório** |
| Regra financeira alterada? | **Não** |
| Dinheiro real movimentado? | **Não** |
| Commit feito? | **Não** |

---

## 5o. Fase 20 — Auditoria Final do MVP Simulado (Implementada)

### Objetivo

Auditoria ponta a ponta do MVP simulado antes de avançar para CI, Fitbank sandbox, Pix real, KYC ou blockchain testnet. Sem novas features — apenas revisão de inconsistências, correção de bugs pequenos, padronização de mensagens e atualização de documentação.

### Estado do repositório

- Branch atual: `dev`
- Git status: limpo (sem alterações não rastreadas)
- Arquivos `.env` rastreados: apenas `.env.example` — sem segredos reais versionados

### Bugs corrigidos

| Arquivo | Bug | Correção |
|---|---|---|
| `apps/mobile/app/agreement/[id].tsx` | `dueDate` exibido apenas como data (`25/06/2026`) sem o horário | Adicionada função `formatDateWithTime` que exibe `"25/06/2026 às 18:00"` |

### Inconsistências de documentação corrigidas

| Arquivo | Inconsistência | Correção |
|---|---|---|
| `docs/admin.md` | Seção `/login` descrevia autenticação antiga por token estático | Atualizada para email + senha + JWT admin (Fase 17) |
| `docs/admin.md` | `api.ts # Cliente HTTP com X-Admin-Token` | Atualizado para "JWT admin (Authorization: Bearer)" |
| `docs/admin.md` | "Todos os endpoints enviam X-Admin-Token" | Atualizado para "Authorization: Bearer" |
| `docs/admin.md` | Fluxo de Resolução Humana: "informa ADMIN_TOKEN" | Atualizado para "informa email + senha" |
| `docs/disputes.md` | Auth admin: `X-Admin-Token` + nota "autenticação por token estático" | Atualizado para JWT admin (Fase 17) |
| `docs/agreements.md` | `dueDate` marcado como opcional ("Não") | Corrigido para obrigatório ("Sim") desde Fase 18 |
| `docs/guaranteed-agreements.md` | `dueDate` marcado como opcional ("Não") | Corrigido para obrigatório ("Sim") desde Fase 18 |
| `README.md` | Tabela de fases com visão CLAUDE.md (5 fases planejadas) | Substituída por estado real do MVP (Fases 1–20 concluídas + próximas) |

### Auditoria de segurança

| Item | Status |
|---|---|
| `.env` real versionado? | **Não** — apenas `.env.example` com valores fake |
| Segredo hardcoded no código? | **Não** — todos via `@nestjs/config` / `process.env` |
| `passwordHash` exposto em endpoint? | **Não** |
| Erro de login admin revela informação? | **Não** — mensagem genérica "Credenciais inválidas" |
| JWT admin separado do JWT de usuário? | **Sim** — secrets diferentes, payload `type: "admin"` |
| Usuário comum acessa rotas admin? | **Não** — `AdminJwtGuard` rejeita tokens de usuário |
| Admin acessa rotas de usuário? | **Não** — `JwtAuthGuard` rejeita tokens admin (secret diferente) |

### Auditoria de linguagem de produto (mobile + admin)

| Checagem | Status |
|---|---|
| Termos técnicos (escrow, blockchain, hash) na UI do usuário? | **Não encontrado** |
| Linguagem humana em contestação ("contestar", "valor protegido")? | **Sim** |
| "Pagar com Pix" em vez de "payment-intents"? | **Sim** |
| "Confirmar conclusão" em vez de "release"? | **Sim** |
| Evidência tratada como registro formal, não chat? | **Sim** |

### Auditoria do prazo obrigatório

| Item | Status |
|---|---|
| `dueDate` obrigatório no DTO backend? | **Sim** — `@IsDateString()` sem `@IsOptional()` em ambos os DTOs |
| Acordo simples sem prazo falha? | **Sim** — validado nos testes E2E |
| Acordo com garantia sem prazo falha? | **Sim** — validado nos testes E2E |
| Mobile exige data e horário? | **Sim** — DueDatePicker com validação no step 3 |
| Mobile mostra prazo com hora no resumo? | **Sim** — `"Prazo: 25/06/2026 às 18:00"` |
| Mobile mostra prazo com hora no detalhe? | **Sim** — corrigido nesta fase |
| Prazo usa 23:59:59 automático escondido? | **Não** — usuário escolhe hora explicitamente |

### Resultados de validação

| Comando | Resultado |
|---|---|
| `pnpm --filter @selo/mobile typecheck` | ✅ Exit 0 |
| `pnpm --filter @selo/api test` | ✅ **155 testes, 10 suítes, 0 falhas** |
| `pnpm --filter @selo/api test:e2e` | ✅ **83 testes, 1 suíte, 0 falhas** |
| `pnpm --filter @selo/api build` | ✅ Exit 0 |
| `pnpm --filter @selo/admin typecheck` | ✅ Exit 0 |

### Confirmações obrigatórias

| Restrição | Status |
|---|---|
| Schema Prisma alterado? | **Não** |
| Migration rodada? | **Não** |
| Fitbank real integrado? | **Não** |
| Pix real implementado? | **Não** |
| Webhook Pix real? | **Não** |
| Payout real? | **Não** |
| Refund real? | **Não** |
| Blockchain real? | **Não** |
| KYC? | **Não** |
| Chat? | **Não** |
| Push notifications reais? | **Não** |
| Regra financeira alterada? | **Não** |
| dueDate continua obrigatório? | **Sim** |
| Chave de Recebimento continua interna do app? | **Sim** |
| Disputa continua formal e sem chat? | **Sim** |
| Resolução continua humana/admin? | **Sim** |
| Dinheiro real movimentado? | **Não** |
| Commit feito? | **Não** |

---

## 5p. Fase 21 — Adequação Integral ao Documento de Visão do Produto (Implementada)

### Objetivo

Adequar o MVP local/simulado ao documento de produto, garantindo que o projeto contemple o que foi especificado: onboarding, busca, score explicativo, configurações, blockchain como prova em mais eventos, e admin mais completo.

### Estado do repositório

- Branch: `dev`
- Git status: limpo antes desta fase

### Itens implementados

| Item | Arquivo(s) |
|---|---|
| Matriz de aderência ao documento | `docs/product-vision-alignment.md` |
| Onboarding leve — boas-vindas | `apps/mobile/app/(onboarding)/welcome.tsx` |
| Onboarding leve — criação de chave | `apps/mobile/app/(onboarding)/setup-key.tsx` |
| Onboarding leve — mini tutorial | `apps/mobile/app/(onboarding)/tutorial.tsx` |
| Busca universal MVP | `apps/mobile/app/search.tsx` |
| Score de confiança — tela explicativa | `apps/mobile/app/trust-score.tsx` |
| Configurações — Segurança, Privacidade, Ajuda | `apps/mobile/app/settings.tsx` |
| Blockchain: prova na criação do acordo simples | `agreements.service.ts` — `createSimple` |
| Blockchain: prova na criação do acordo com garantia | `agreements.service.ts` — `createGuaranteed` |
| Blockchain: prova no aceite do acordo | `agreements.service.ts` — `accept` |
| Blockchain: prova na abertura de contestação | `agreements.service.ts` — `openDispute` |
| Blockchain: prova no reembolso | `agreements.service.ts` — `refund` |
| Admin: GET /admin/users (lista de usuários) | `admin.controller.ts`, `admin.service.ts` |
| Admin: GET /admin/users/:id (detalhe) | `admin.controller.ts`, `admin.service.ts` |
| Admin: GET /admin/agreements (lista de acordos) | `admin.controller.ts`, `admin.service.ts` |
| Admin: GET /admin/agreements/:id (detalhe) | `admin.controller.ts`, `admin.service.ts` |

### Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `apps/mobile/app/(auth)/register.tsx` | Redirect para onboarding após cadastro |
| `apps/mobile/app/_layout.tsx` | Rotas de onboarding, search, trust-score, settings |
| `apps/mobile/app/index.tsx` | Verifica `welcome_seen` — redireciona para onboarding na 1ª vez |
| `apps/mobile/app/(app)/profile.tsx` | Link para busca, configurações, tela de score |
| `apps/api/src/modules/agreements/agreements.service.ts` | Blockchain em 4 novos eventos |
| `apps/api/src/modules/admin/admin.service.ts` | listUsers, getUser, listAgreements, getAgreement |
| `apps/api/src/modules/admin/admin.controller.ts` | 4 novos endpoints admin |

### Cobertura de BlockchainRecord após Fase 21

| Evento | Status |
|---|---|
| Acordo criado (simples) | ✅ PENDING |
| Acordo criado (com garantia) | ✅ PENDING |
| Acordo aceito | ✅ PENDING |
| Valor protegido (FUNDS_LOCKED) | ✅ PENDING (payments.service) |
| Contestação aberta | ✅ PENDING |
| Reembolso (user) | ✅ PENDING |
| Conclusão (dupla confirmação / payout) | ✅ PENDING (agreements.service) |
| Resolução admin (release) | ✅ PENDING (admin.service) |
| Resolução admin (refund) | ✅ PENDING (admin.service) |

### Novos endpoints admin

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/v1/admin/users` | AdminJwtGuard | Lista usuários com paginação e filtro por status |
| GET | `/api/v1/admin/users/:id` | AdminJwtGuard | Detalhe do usuário |
| GET | `/api/v1/admin/agreements` | AdminJwtGuard | Lista acordos com paginação e filtros |
| GET | `/api/v1/admin/agreements/:id` | AdminJwtGuard | Detalhe completo do acordo |

### Onboarding mobile

Fluxo implementado:
1. Primeira abertura do app (sem token, sem `welcome_seen`) → `/(onboarding)/welcome`
2. Tela de boas-vindas: "A carteira dos seus combinados" + 3 features + Criar conta / Já tenho conta
3. Após cadastro: → `/(onboarding)/setup-key` (criar Chave de Recebimento opcional)
4. → `/(onboarding)/tutorial` (4 slides: combinado simples, valor protegido, contestação, score)
5. → `/(app)/home`

Usuários existentes que já têm token → direto para home (sem mostrar onboarding novamente).

### Configurações mobile

Tela `/settings` com 3 seções expansíveis:
- **Segurança**: logout, sessões (em breve), biometria (em breve), nota de segurança
- **Privacidade**: o que é armazenado, o que não é armazenado, Termos/Política (em breve)
- **Ajuda**: combinado simples, valor protegido, contestação formal, Chave ≠ Pix, score

### Confirmações obrigatórias

| Restrição | Status |
|---|---|
| Schema Prisma alterado? | **Não** |
| Migration rodada? | **Não** |
| Fitbank real integrado? | **Não** |
| Pix real? | **Não** |
| Webhook real? | **Não** |
| Payout real? | **Não** |
| Refund real? | **Não** |
| Blockchain real? | **Não** |
| KYC? | **Não** |
| Chat? | **Não** |
| Push notifications reais? | **Não** |
| Regra financeira alterada? | **Não** |
| dueDate continua obrigatório? | **Sim** |
| Chave de Recebimento continua interna? | **Sim** |
| Destino de Recebimento continua separado da chave? | **Sim** |
| Disputa continua formal e sem chat? | **Sim** |
| Resolução continua humana/admin? | **Sim** |
| Dinheiro real movimentado? | **Não** |
| Commit feito? | **Não** |

---

## 5q. Fase 22 — CI/GitHub Actions (Implementada)

### Objetivo

Proteger a base do MVP com validação automática em cada push e pull request. O CI roda todos os testes e verificações que antes eram manuais.

### Estado do repositório

- Branch: `dev`
- Git status: limpo antes desta fase
- Nenhum segredo real adicionado ao repositório

### Arquivo criado

| Arquivo | Descrição |
|---|---|
| `.github/workflows/ci.yml` | Workflow GitHub Actions completo |

### Documentos atualizados

| Arquivo | Alteração |
|---|---|
| `docs/tests.md` | Seção "CI — GitHub Actions" adicionada: quando roda, jobs, PostgreSQL, secrets, limitações |
| `docs/progresso.md` | Esta seção |
| `README.md` | Fase 22 adicionada à tabela de fases concluídas |

### Quando o CI roda

| Evento | Branches |
|---|---|
| `push` | `main`, `dev` |
| `pull_request` | `main`, `dev` |

Execuções concorrentes na mesma branch são canceladas automaticamente.

### Jobs e comandos executados

| Job | Comandos |
|---|---|
| `api` | `pnpm install --frozen-lockfile` → `prisma:generate` → `prisma:deploy` → `test` (155) → `test:e2e` (83) → `build` |
| `typecheck` | `pnpm install --frozen-lockfile` → `typecheck mobile` → `typecheck admin` |

Os dois jobs rodam **em paralelo** (sem dependência entre si).

### PostgreSQL no CI

O job `api` usa um **service container** `postgres:16-alpine` com:
- Usuário: `selo`, senha: `selopassword`, banco: `selodb`
- Health check: `pg_isready -U selo -d selodb` (interval 10s, timeout 5s, retries 5)
- `DATABASE_URL`: `postgresql://selo:selopassword@localhost:5432/selodb?schema=public`

O workflow aguarda o health check antes de iniciar os steps. As migrações são aplicadas com `prisma migrate deploy` (aplica `init_complete_schema` no banco CI fresco).

### Secrets no CI

Nenhum segredo real. Todos os valores são fake e exclusivos para CI, declarados no próprio workflow:

| Variável | Tipo |
|---|---|
| `DATABASE_URL` | Banco local do service container |
| `JWT_SECRET` | String fake (`ci-jwt-secret-for-testing-only-…`) |
| `JWT_REFRESH_SECRET` | String fake |
| `ADMIN_JWT_SECRET` | String fake |
| `ADMIN_TOKEN` | String fake (legado) |

O arquivo `.env` real nunca é commitado — apenas `.env.example` está no repositório.

### Resultados dos comandos locais

| Comando | Resultado |
|---|---|
| `pnpm --filter @selo/api test` | ✅ **155 testes, 10 suítes, 0 falhas** |
| `pnpm --filter @selo/api test:e2e` | ✅ **83 testes, 1 suíte, 0 falhas** |
| `pnpm --filter @selo/api build` | ✅ Exit 0 |
| `pnpm --filter @selo/mobile typecheck` | ✅ Exit 0 |
| `pnpm --filter @selo/admin typecheck` | ✅ Exit 0 |

### Confirmações obrigatórias

| Restrição | Status |
|---|---|
| Schema Prisma alterado? | **Não** |
| Migration rodada? | **Não** |
| Fitbank real? | **Não** |
| Pix real? | **Não** |
| Webhook real? | **Não** |
| Blockchain real? | **Não** |
| KYC? | **Não** |
| Chat? | **Não** |
| Regra financeira alterada? | **Não** |
| Testes removidos para passar? | **Não** |
| dueDate continua obrigatório? | **Sim** |
| Dinheiro real movimentado? | **Não** |
| Commit feito? | **Não** |

---

## 5q. Fase 23 — Ambientes e Segurança (Implementada)

### Objetivo

Preparar o projeto para operar com segurança mínima em development, test, staging e production futura, sem integrar dinheiro real, Pix real ou blockchain real.

### Branch e estado do repositório

- Branch: `dev`
- Estado: limpo antes da fase (0 arquivos modificados, 0 diffs)
- `.env` real: **não rastreado** — apenas `.env.example` arquivos no repositório

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/api/src/config/env.validation.ts` | Valida variáveis obrigatórias no startup; pula em `NODE_ENV=test` |
| `apps/api/src/common/filters/http-exception.filter.ts` | Filtro global de exceções; oculta detalhes em production |
| `apps/mobile/.env.example` | Exemplo de variáveis de ambiente do app mobile |
| `docs/environments.md` | Documentação completa de ambientes, secrets, CORS, rate limit, logs, staging |

### Arquivos atualizados

| Arquivo | Alteração |
|---|---|
| `apps/api/src/app.module.ts` | Adicionado `ThrottlerModule` + `validateEnv` no `ConfigModule` |
| `apps/api/src/main.ts` | CORS por ambiente, `GlobalExceptionFilter` global, log level por env |
| `apps/api/src/modules/auth/auth.controller.ts` | `ThrottlerGuard` em register/login/refresh |
| `apps/api/src/modules/admin/admin-auth.controller.ts` | `ThrottlerGuard` em admin/auth/login |
| `.env.example` | Variáveis completas: RATE_LIMIT_*, LOG_LEVEL, APP_PUBLIC_URL, futuras integrações comentadas |
| `apps/api/.env.example` | Idem + ADMIN_JWT_SECRET, legado ADMIN_TOKEN documentado como deprecated |
| `apps/admin/.env.example` | NODE_ENV adicionado como informativo |
| `.github/workflows/ci.yml` | Adicionado `LOG_LEVEL=error`, `RATE_LIMIT_TTL=60000`, `RATE_LIMIT_MAX=10000` |
| `docs/tests.md` | Seção "CI — Fase 23" com impacto nos testes e vars adicionadas ao CI |
| `docs/progresso.md` | Esta seção |
| `README.md` | Fase 23 na tabela de fases concluídas |

### Dependência adicionada

| Pacote | Versão | Motivo |
|---|---|---|
| `@nestjs/throttler` | `^5.0.0` | Rate limiting nas rotas sensíveis de auth |

### Como ficaram os ambientes

| Ambiente | CORS | Rate limit | Validação env | Logs |
|---|---|---|---|---|
| development | localhost 3001/8081 | TTL=60s, max=100 | Pula vars não-críticas | Todos os níveis |
| test | `*` | TTL=60s, max=10000 | Pula (NODE_ENV=test) | Todos os níveis |
| CI | `*` (test) | max=10000 | Pula (NODE_ENV=test) | Apenas error |
| staging (futuro) | CORS_ORIGINS obrigatório | Configurável | Valida obrigatórias | Configurável |
| production (futuro) | CORS_ORIGINS obrigatório | Configurável | Valida obrigatórias | error/warn |

### Rate limit — rotas protegidas

| Rota | Guard |
|---|---|
| `POST /api/v1/auth/register` | ThrottlerGuard |
| `POST /api/v1/auth/login` | ThrottlerGuard |
| `POST /api/v1/auth/refresh` | ThrottlerGuard |
| `POST /api/v1/admin/auth/login` | ThrottlerGuard |

### Segurança admin

| Item | Estado |
|---|---|
| `AdminJwtGuard` + `AdminJwtStrategy` | ✅ Ativo (Fase 17) |
| `ADMIN_JWT_SECRET` separado de `JWT_SECRET` | ✅ |
| `payload.type === "admin"` verificado | ✅ |
| Token de usuário comum rejeitado em rotas admin | ✅ |
| `passwordHash` nunca retornado | ✅ |
| `AdminTokenGuard` (X-Admin-Token) | ⚠️ Legado — não recomendado; documentado como deprecated |

### Resultados dos comandos locais

| Comando | Resultado |
|---|---|
| `pnpm --filter @selo/api test` | ✅ **155 testes, 10 suítes, 0 falhas** |
| `pnpm --filter @selo/api test:e2e` | ✅ **83 testes, 1 suíte, 0 falhas** |
| `pnpm --filter @selo/api build` | ✅ Exit 0 |
| `pnpm --filter @selo/mobile typecheck` | ✅ Exit 0 |
| `pnpm --filter @selo/admin typecheck` | ✅ Exit 0 |

### Confirmações obrigatórias

| Restrição | Status |
|---|---|
| Schema Prisma alterado? | **Não** |
| Migration rodada? | **Não** |
| Fitbank real? | **Não** |
| Pix real? | **Não** |
| Webhook real? | **Não** |
| Blockchain real? | **Não** |
| KYC? | **Não** |
| Chat? | **Não** |
| Regra financeira alterada? | **Não** |
| Testes removidos para passar? | **Não** |
| dueDate continua obrigatório? | **Sim** |
| Dinheiro real movimentado? | **Não** |
| Segredo real exposto? | **Não** |
| Commit feito? | **Não** |

---

## 5r. Fase 24 — Fitbank Sandbox / Pix Sandbox (Implementada)

### Objetivo

Criar uma camada de abstração para o provedor financeiro, preparar o endpoint de webhook sandbox e estruturar o projeto para troca futura por integração Fitbank real — sem movimentar dinheiro real.

### Branch e estado do repositório

- Branch: `dev`
- Estado: limpo antes da fase
- `.env` real: **não rastreado**
- Dinheiro real movimentado: **Não**
- Chamada real ao Fitbank: **Não**

### Arquivos criados

| Arquivo | Descrição |
|---|---|
| `apps/api/src/modules/payments/providers/payment-provider.interface.ts` | Interface `IPaymentProvider` + token de DI `PAYMENT_PROVIDER_TOKEN` |
| `apps/api/src/modules/payments/providers/simulated-payment.provider.ts` | Provider simulado — comportamento atual, sem chamada real |
| `apps/api/src/modules/payments/providers/fitbank-sandbox-payment.provider.ts` | Provider sandbox Fitbank — sem chamada real (`FITBANK_ENABLE_REAL_CALLS=false`) |
| `apps/api/src/modules/payments/dto/fitbank-webhook.dto.ts` | DTO do webhook Fitbank |
| `apps/api/src/modules/payments/providers/payment-providers.spec.ts` | 19 testes unitários dos providers |

### Arquivos atualizados

| Arquivo | Alteração |
|---|---|
| `apps/api/src/modules/payments/payments.module.ts` | Factory do provider (por env), exporta `PAYMENT_PROVIDER_TOKEN` |
| `apps/api/src/modules/payments/payments.service.ts` | `handleFitbankWebhook` com idempotência, validação de assinatura, BlockchainRecord, notificações |
| `apps/api/src/modules/payments/payments.controller.ts` | `POST /payments/webhooks/fitbank` (endpoint público, sem JWT) |
| `apps/api/src/modules/payments/payments.service.spec.ts` | +6 testes de webhook (total 12 no arquivo) |
| `apps/api/src/modules/agreements/agreements.service.ts` | `initiatePayment` usa provider injetado; retorna `instructions` |
| `apps/api/src/modules/agreements/agreements.module.ts` | Importa `PaymentsModule` para injetar `PAYMENT_PROVIDER_TOKEN` |
| `apps/api/src/modules/agreements/agreements.service.spec.ts` | Mock do `PAYMENT_PROVIDER_TOKEN` adicionado |
| `apps/api/src/test/helpers/factories.ts` | `pixCharge.findUnique` e `pixCharge.findFirst` adicionados ao mock |
| `apps/api/test/e2e/mvp-flow.e2e-spec.ts` | Bloco "Fase 24 — Webhook Fitbank Sandbox" (+9 testes E2E) |
| `.env.example` | Vars sandbox: `PAYMENT_PROVIDER`, `FITBANK_ENV`, `FITBANK_ENABLE_REAL_CALLS`, `FITBANK_*` |
| `apps/api/.env.example` | Idem |
| `.github/workflows/ci.yml` | `PAYMENT_PROVIDER=simulated`, `FITBANK_ENABLE_REAL_CALLS=false`, vars fake |
| `docs/payments.md` | Seção de providers, webhook sandbox, tabela atualizada |
| `docs/guaranteed-agreements.md` | Seção de ambiente atualizada para múltiplos providers |
| `docs/environments.md` | Vars sandbox na tabela da API; seção 10 completa sobre Fitbank Sandbox |
| `docs/tests.md` | Seção CI — Fase 24 com testes adicionados |
| `docs/progresso.md` | Esta seção |
| `README.md` | Fase 24 na tabela de fases concluídas |

### Provider financeiro

| Aspecto | Valor |
|---|---|
| Interface | `IPaymentProvider` — `createPixCharge`, `validateWebhookSignature`, `parseWebhookPayload` |
| Provider padrão | `SimulatedPaymentProvider` (`PAYMENT_PROVIDER=simulated`) |
| Provider sandbox | `FitbankSandboxPaymentProvider` (`PAYMENT_PROVIDER=fitbank_sandbox`) |
| Chamada real ao Fitbank? | **Não** — `FITBANK_ENABLE_REAL_CALLS=false` em todos os ambientes desta fase |
| Dinheiro real? | **Não** — fluxo inteiro simulado internamente |

### Fluxo Pix sandbox

```
POST /agreements/:id/payment-intents
    → provider.createPixCharge() — retorna QR Code sandbox + instructions
    → PaymentIntent criado com metadata.provider = SIMULATED | FITBANK_SANDBOX

POST /payments/webhooks/fitbank  (ou simulate-confirmation)
    → provider.validateWebhookSignature()
    → provider.parseWebhookPayload()
    → eventType=PIX_CONFIRMED: PaymentIntent→PAID, Guarantee→LOCKED, financialStatus→FUNDS_HELD
    → BlockchainRecord PENDING + Notificação + AuditLog
    → Idempotente: webhook duplicado ignorado
```

### Status financeiros

| Status | Exibição para o usuário |
|---|---|
| `AWAITING_PAYMENT` | "Aguardando pagamento" |
| `FUNDS_HELD` | "Valor protegido" |
| `PAID_OUT` | "Pagamento liberado" |
| `REFUNDED` | "Reembolsado" |
| `DISPUTED` | "Travado por contestação" |

### Resultados dos comandos locais

| Comando | Resultado |
|---|---|
| `pnpm --filter @selo/api test` | ✅ **179 testes, 11 suítes, 0 falhas** |
| `pnpm --filter @selo/api test:e2e` | ✅ **92 testes, 1 suíte, 0 falhas** |
| `pnpm --filter @selo/api build` | ✅ Exit 0 |
| `pnpm --filter @selo/mobile typecheck` | ✅ Exit 0 |
| `pnpm --filter @selo/admin typecheck` | ✅ Exit 0 |

### Confirmações obrigatórias

| Restrição | Status |
|---|---|
| Schema Prisma alterado? | **Não** |
| Migration rodada? | **Não** |
| Fitbank real integrado? | **Não** |
| Pix real implementado? | **Não** |
| Webhook real de produção? | **Não** |
| Payout real? | **Não** |
| Refund real? | **Não** |
| Blockchain real? | **Não** |
| KYC? | **Não** |
| Chat? | **Não** |
| Dinheiro real movimentado? | **Não** |
| Chamada HTTP real ao Fitbank? | **Não** |
| Segredo real exposto? | **Não** |
| Testes removidos para passar? | **Não** |
| dueDate continua obrigatório? | **Sim** |
| Acordo com garantia exige destino ativo? | **Sim** |
| Commit feito? | **Não** |

---

## 7. Próxima Fase

Fases sugeridas após Fitbank Sandbox (Fase 24), em ordem de prioridade:

- **Fase 25** — KYC Progressivo: onboarding financeiro com CPF e validação do Banco Central
- **Fase 26** — Blockchain Testnet: registro de hash de acordos em Ethereum/Polygon testnet
- **Fase 27** — UX Final e Beta Fechado: animações, upload de avatar, polish geral

Não implementar sem instrução explícita: Fitbank real, blockchain real, KYC, push notifications reais.

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
| [docs/mobile.md](mobile.md) | App mobile: estrutura, telas, componentes, como rodar, limitações |
| [docs/tests.md](tests.md) | Testes automatizados: estratégia, cobertura, comandos, limitações |
| [docs/admin.md](admin.md) | Painel admin: auth real (AdminUser + JWT), endpoints, fluxo de disputa |
| [docs/environments.md](environments.md) | Ambientes, variáveis, CORS, rate limit, logs, segurança, staging |
