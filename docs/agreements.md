# Acordos — Selo API

## O que é um Acordo

Um **Acordo** no Selo é um combinado registrado entre duas pessoas com histórico, prazo, status e rastreabilidade.

### Acordo Simples vs. Acordo com Garantia

| | Acordo Simples | Acordo com Garantia |
|---|---|---|
| Dinheiro bloqueado | Não | Sim |
| Pix | Não | Sim |
| Cobrança | Não | Sim |
| Payout | Não | Sim |
| Disputa financeira | Não | Sim |
| Fase | Fase 4 | Fase 5+ |

---

## Ciclo de Vida do Acordo Simples

```
[CRIAÇÃO]
    │
    ▼
AWAITING_ACCEPTANCE  ──── recusa da contraparte ──▶ CANCELLED
    │                                                    (participant: REJECTED)
    │ aceite da contraparte
    ▼
ACTIVE ─────── cancelamento (criador ou contraparte) ──▶ CANCELLED
    │
    │ conclusão (qualquer participante)
    ▼
COMPLETED
```

### Regras de transição

| Status atual | Ação | Quem pode | Resultado |
|---|---|---|---|
| AWAITING_ACCEPTANCE | accept | Somente contraparte | ACTIVE |
| AWAITING_ACCEPTANCE | decline | Somente contraparte | CANCELLED |
| AWAITING_ACCEPTANCE | cancel | Somente criador | CANCELLED |
| ACTIVE | complete | Qualquer participante | COMPLETED |
| ACTIVE | cancel | Qualquer participante | CANCELLED |
| COMPLETED | — | — | Imutável |
| CANCELLED | — | — | Imutável |

> **Nota sobre recusa:** Evento `REJECTED` + `Agreement.operationalStatus = CANCELLED` + `participant.status = REJECTED`. Ver [docs/progresso.md](progresso.md) para detalhes.

---

## Endpoints

### `GET /api/v1/agreements/summary`

**Resumo da wallet** — endpoint central para montar a tela inicial do app mobile.

**Auth:** JWT obrigatório

**Response 200:**
```json
{
  "user": {
    "id": "cm...",
    "displayName": "João",
    "avatarUrl": null,
    "trustScore": { "score": 500, "level": "MEDIUM" }
  },
  "receivingKey": {
    "key": "@joao",
    "status": "ACTIVE"
  },
  "totals": {
    "activeAgreements": 2,
    "pendingMyAction": 1,
    "pendingOtherPartyAction": 1,
    "awaitingAcceptance": 1,
    "awaitingPayment": 0,
    "awaitingConfirmation": 0,
    "withGuarantee": 1,
    "inDispute": 0,
    "completed": 3,
    "cancelled": 1,
    "dueSoon": 1
  },
  "financial": {
    "amountsToReceive": { "count": 0, "total": 0, "currency": "BRL" },
    "amountsToPay": { "count": 0, "total": 0, "currency": "BRL" },
    "protectedAmounts": { "count": 1, "total": 350.0, "currency": "BRL" }
  },
  "sections": {
    "pendingMyAction": [...],
    "amountsToReceive": [...],
    "amountsToPay": [...],
    "active": [...],
    "withGuarantee": [...],
    "inDispute": [...],
    "dueSoon": [...],
    "recent": [...]
  }
}
```

**Definições dos campos:**

| Campo | Definição |
|---|---|
| `totals.activeAgreements` | Acordos com `operationalStatus = ACTIVE` |
| `totals.pendingMyAction` | Acordos onde o usuário ainda precisa agir (ver abaixo) |
| `totals.pendingOtherPartyAction` | Acordos aguardando ação da outra parte |
| `totals.awaitingAcceptance` | Acordos em `AWAITING_ACCEPTANCE` |
| `totals.awaitingPayment` | Acordos em `financialStatus = AWAITING_PAYMENT` |
| `totals.awaitingConfirmation` | Acordos em `operationalStatus = AWAITING_CONFIRMATION` |
| `totals.withGuarantee` | Acordos do tipo `WITH_GUARANTEE` |
| `totals.inDispute` | Acordos com disputa `OPEN`, `UNDER_REVIEW` ou `AWAITING_EVIDENCE` |
| `totals.dueSoon` | Acordos não terminais com `dueDate` nos próximos 7 dias |
| `financial.amountsToReceive` | Somatório de garantias onde o usuário é receiver com `financialStatus = FUNDS_HELD` ou `AWAITING_PAYOUT` |
| `financial.amountsToPay` | Somatório de acordos onde o usuário é payer com `financialStatus = AWAITING_PAYMENT` |
| `financial.protectedAmounts` | Somatório de garantias `LOCKED` ou `FROZEN_DISPUTE` |

**Lógica de "pendingMyAction" no summary (aproximada):**
1. Sou contraparte + acordo em `AWAITING_ACCEPTANCE` + meu status = `PENDING`
2. Sou o pagador + `WITH_GUARANTEE` + `financialStatus = AWAITING_PAYMENT`
3. Acordo em `AWAITING_CONFIRMATION` (aproximação: inclui quem já confirmou — use a listagem com `pendingMyAction=true` para versão precisa)

**Sections (até 10 itens cada):**
- `pendingMyAction` — acordos onde o usuário precisa agir (aproximado)
- `amountsToReceive` — acordos com valores a receber
- `amountsToPay` — acordos com valores a pagar
- `active` — acordos ativos
- `withGuarantee` — acordos com garantia não terminados
- `inDispute` — acordos em disputa aberta
- `dueSoon` — acordos vencendo em até 7 dias
- `recent` — últimos 5 acordos por updatedAt

**Cada item dos sections contém campos extras:**
- `myRole`: papel do usuário (`CREATOR`, `COUNTERPART` ou null)
- `isCreator`: se o usuário criou o acordo
- `isPayer`: se o usuário é o pagador
- `isReceiver`: se o usuário é o recebedor

---

### `POST /api/v1/agreements/simple`

Cria um Acordo Simples.

**Auth:** JWT obrigatório

**Request:**
```json
{
  "title": "Jogar bola no sábado",
  "description": "João vai pagar o campo se a gente jogar sábado às 10h.",
  "counterpartyKey": "@joao",
  "amount": 80.00,
  "currency": "BRL",
  "dueDate": "2026-06-10T10:00:00.000Z",
  "acceptanceExpiresAt": "2026-06-07T23:59:59.000Z",
  "confirmationRule": "SINGLE_PARTY"
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `title` | string (3–100) | Sim | Título do acordo |
| `counterpartyKey` | string | Sim | Handle da contraparte (ex: `@joao` ou `joao`) |
| `description` | string (máx 2000) | Não | Observação adicional |
| `amount` | number | Não | Valor apenas registrado (sem bloqueio) |
| `currency` | string | Não | Moeda, default `BRL` |
| `dueDate` | ISO8601 | Não | Prazo do acordo |
| `acceptanceExpiresAt` | ISO8601 | Não | Prazo para aceite |
| `confirmationRule` | enum | Não | `MANUAL` ou `SINGLE_PARTY` (default) |

**Response 201:** objeto `Agreement` completo com `participants`, `financialGuarantee`, `dispute`

**Erros:**
- `400` — título inválido, data inválida, criando acordo consigo mesmo
- `401` — sem token
- `404` — chave da contraparte não encontrada ou inativa

---

### `GET /api/v1/agreements`

Lista acordos do usuário autenticado com filtros server-side.

**Auth:** JWT obrigatório

**Query params:**
| Param | Tipo | Descrição |
|---|---|---|
| `status` | `AgreementOperationalStatus` | Filtrar por status operacional |
| `type` | `AgreementType` | `SIMPLE` ou `WITH_GUARANTEE` |
| `financialStatus` | `AgreementFinancialStatus` | Filtrar por status financeiro |
| `myRole` | `creator` \| `counterpart` \| `payer` \| `receiver` | Filtrar pelo papel do usuário no acordo |
| `pendingMyAction` | `true` \| `false` | Acordos que aguardam ação do usuário (versão precisa) |
| `hasGuarantee` | `true` \| `false` | Atalho para filtro por tipo (não sobrescreve `type`) |
| `inDispute` | `true` \| `false` | Acordos com disputa bloqueante aberta |
| `dueBefore` | ISO8601 | Acordos com prazo até esta data |
| `dueAfter` | ISO8601 | Acordos com prazo a partir desta data |
| `page` | number | Default 1 |
| `limit` | number | Default 20, máx 100 |

**Lógica de `pendingMyAction=true` (precisa via Prisma):**
1. `operationalStatus = AWAITING_ACCEPTANCE` + sou COUNTERPART + meu status = PENDING
2. `payerId = userId` + tipo `WITH_GUARANTEE` + `financialStatus = AWAITING_PAYMENT`
3. `operationalStatus = AWAITING_CONFIRMATION` + **não enviei evento CONFIRMED ainda** (subquery via `events.none`)

**Como separar papéis com `myRole`:**
| Valor | Seleciona acordos onde... |
|---|---|
| `creator` | `createdById = userId` |
| `counterpart` | usuário tem papel `COUNTERPART` nos participantes |
| `payer` | `payerId = userId` (criador em acordos WITH_GUARANTEE no MVP) |
| `receiver` | `receiverId = userId` (contraparte em acordos WITH_GUARANTEE no MVP) |

**Campos na resposta (por item):**
```
id, type, operationalStatus, financialStatus, title, generatedSummary,
description, amount, currency, dueDate, acceptanceExpiresAt,
confirmationDeadlineAt, confirmationRule, createdById, payerId, receiverId,
receiverKeySnapshot, createdAt, updatedAt, completedAt, canceledAt, disputedAt,
participants[{id, userId, role, status, acceptedAt}],
financialGuarantee[{id, status, amount, currency, lockedAt}],
dispute[{id, status, reason, openedById}]
```

**Response 200:**
```json
{
  "data": [ ... ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

---

### `GET /api/v1/agreements/:id`

Detalhe de um acordo.

**Auth:** JWT obrigatório — somente participantes

**Response 200:** objeto `Agreement` completo com `participants` (incluindo perfil público de cada um)

**Erros:**
- `403` — não é participante
- `404` — não encontrado

---

### `POST /api/v1/agreements/:id/accept`

Aceitar o convite de acordo. **Somente a contraparte** pode aceitar.

**Auth:** JWT obrigatório

**Response 200:** objeto `Agreement` atualizado (`operationalStatus: "ACTIVE"`)

**Erros:**
- `400` — acordo não está aguardando aceite, prazo expirado
- `403` — não é a contraparte
- `409` — já foi aceito

---

### `POST /api/v1/agreements/:id/decline`

Recusar o convite de acordo. **Somente a contraparte** pode recusar.

**Auth:** JWT obrigatório

**Request (opcional):**
```json
{ "reason": "Não posso participar." }
```

**Response 200:** objeto `Agreement` atualizado (`operationalStatus: "CANCELLED"`, participante com `status: "REJECTED"`)

---

### `POST /api/v1/agreements/:id/cancel`

Cancelar um acordo.

**Auth:** JWT obrigatório

**Regras:**
- Se `AWAITING_ACCEPTANCE`: somente o **criador** pode cancelar
- Se `ACTIVE`: **qualquer participante** pode cancelar (acordos simples não têm dinheiro travado)
- Se `COMPLETED` ou `CANCELLED`: impossível cancelar

**Request (opcional):**
```json
{ "reason": "Mudei de ideia." }
```

**Response 200:** objeto `Agreement` atualizado (`operationalStatus: "CANCELLED"`)

---

### `POST /api/v1/agreements/:id/complete`

Marcar acordo como concluído. **Qualquer participante** pode concluir.

**Auth:** JWT obrigatório

**Regras:**
- Somente acordos `ACTIVE` podem ser concluídos
- Acordos `WITH_GUARANTEE` redirecionam para `/confirm-completion`

**Response 200:** objeto `Agreement` atualizado (`operationalStatus: "COMPLETED"`)

---

### `GET /api/v1/agreements/:id/events`

Lista o histórico de eventos do acordo em ordem cronológica.

**Auth:** JWT obrigatório — somente participantes

---

## Como o backend diferencia papéis financeiros

No MVP, o **criador** do acordo com garantia é sempre o **pagador** (`payerId`), e a **contraparte** é sempre o **recebedor** (`receiverId`). Em fases futuras, esta relação pode ser invertida (quando o criador é o prestador de serviço que recebe).

| Campo | Significado |
|---|---|
| `createdById` | Quem criou o acordo |
| `payerId` | Quem deposita a garantia (WITH_GUARANTEE) |
| `receiverId` | Quem recebe o payout (WITH_GUARANTEE) |
| `participants[].role = CREATOR` | Participante que criou (= payer no MVP) |
| `participants[].role = COUNTERPART` | Participante convidado (= receiver no MVP) |

---

## Como identificar "a pagar" e "a receber" pelo frontend

```
Valores a receber:
  receiverId === myUserId
  AND type === WITH_GUARANTEE
  AND financialStatus IN (FUNDS_HELD, AWAITING_PAYOUT)

Valores a pagar:
  payerId === myUserId
  AND type === WITH_GUARANTEE
  AND financialStatus === AWAITING_PAYMENT

Valores protegidos (todos):
  financialGuarantee.status IN (LOCKED, FROZEN_DISPUTE)
  (independente do papel do usuário)
```

---

## Como identificar "aguardando minha ação"

Versão precisa via API (use `?pendingMyAction=true`):
1. `operationalStatus = AWAITING_ACCEPTANCE` + sou COUNTERPART + status PENDING
2. `payerId = userId` + `WITH_GUARANTEE` + `financialStatus = AWAITING_PAYMENT`
3. `operationalStatus = AWAITING_CONFIRMATION` + ainda não enviei evento CONFIRMED

Versão no summary (aproximada, sem subquery de eventos):
- Igual acima, exceto o item 3 que inclui todos em AWAITING_CONFIRMATION

---

## Limitações conhecidas

- **`summary.totals.pendingMyAction`** inclui usuários que já confirmaram conclusão mas ainda esperam a outra parte. É uma aproximação. Para contagem precisa use `GET /agreements?pendingMyAction=true` + `count`.
- **Filtros `hasGuarantee` e `type` não se sobrepõem**: se ambos forem fornecidos, `type` prevalece.
- **`financial.amountsToReceive` e `amountsToPay` são em BRL apenas** — somatório por `currency` será implementado quando múltiplas moedas forem suportadas.
- **Pix e Fitbank continuam simulados** — nenhuma movimentação financeira real ocorre.

---

## Segurança

- Todos os endpoints exigem JWT
- Usuário só visualiza acordos dos quais é participante
- Aceite e recusa: somente a contraparte
- Cancelamento em AWAITING_ACCEPTANCE: somente o criador
- Cancelamento em ACTIVE: qualquer participante
- Conclusão: qualquer participante
- Respostas nunca expõem: CPF, email, senha, dados financeiros, KYC

---

## Testes com PowerShell

### Setup — dois usuários

```powershell
# Usuário A — criador
$bodyA = '{"email":"usera@selo.dev","password":"senha-123","firstName":"User","lastName":"A"}'
$regA = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -Body $bodyA -ContentType "application/json"
$tokenA = $regA.accessToken
$userAId = (Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/me" -Headers @{ Authorization = "Bearer $tokenA" }).id

# Criar chave para usuário A
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" } `
  -Body '{"key":"@usera"}' -ContentType "application/json"

# Usuário B — contraparte
$bodyB = '{"email":"userb@selo.dev","password":"senha-123","firstName":"User","lastName":"B"}'
$regB = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -Body $bodyB -ContentType "application/json"
$tokenB = $regB.accessToken

# Criar chave para usuário B
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenB" } `
  -Body '{"key":"@userb"}' -ContentType "application/json"
```

### Summary da wallet (home)

```powershell
# Summary de A (antes de criar acordos — tudo zerado)
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/summary" `
  -Headers @{ Authorization = "Bearer $tokenA" } | ConvertTo-Json -Depth 6

# Summary de A após criar um acordo com B
$body = '{"title":"Pagar o almoço","counterpartyKey":"@userb","amount":45.50,"dueDate":"2026-06-15T12:00:00.000Z"}'
$acordo = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/simple" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" } -Body $body -ContentType "application/json"
$acordoId = $acordo.id

# Summary de A: pendingOtherPartyAction deve ser 1 (aguardando B aceitar)
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/summary" `
  -Headers @{ Authorization = "Bearer $tokenA" } | ConvertTo-Json -Depth 4

# Summary de B: pendingMyAction deve ser 1 (B precisa aceitar)
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/summary" `
  -Headers @{ Authorization = "Bearer $tokenB" } | ConvertTo-Json -Depth 4
```

### Novos filtros da listagem

```powershell
# Acordos aguardando minha ação (B)
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements?pendingMyAction=true" `
  -Headers @{ Authorization = "Bearer $tokenB" } | ConvertTo-Json -Depth 4

# Acordos onde sou o criador
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements?myRole=creator" `
  -Headers @{ Authorization = "Bearer $tokenA" } | ConvertTo-Json -Depth 3

# Acordos onde sou a contraparte
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements?myRole=counterpart" `
  -Headers @{ Authorization = "Bearer $tokenB" } | ConvertTo-Json -Depth 3

# Acordos com garantia em disputa
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements?hasGuarantee=true&inDispute=true" `
  -Headers @{ Authorization = "Bearer $tokenA" } | ConvertTo-Json -Depth 3

# Acordos vencendo até uma data
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements?dueBefore=2026-06-20T00:00:00.000Z" `
  -Headers @{ Authorization = "Bearer $tokenA" } | ConvertTo-Json -Depth 3

# Acordos por status financeiro
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements?financialStatus=FUNDS_HELD" `
  -Headers @{ Authorization = "Bearer $tokenA" } | ConvertTo-Json -Depth 3
```

### Fluxo completo com summary

```powershell
# ─── Setup ───────────────────────────────────────────────────────────────────
$bodyA = '{"email":"pagador2@selo.dev","password":"senha-dev-123","firstName":"Joao","lastName":"Pagador"}'
$regA = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -Body $bodyA -ContentType "application/json"
$tokenA = $regA.accessToken
$bodyB = '{"email":"recebedor2@selo.dev","password":"senha-dev-123","firstName":"Maria","lastName":"Recebedora"}'
$regB = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -Body $bodyB -ContentType "application/json"
$tokenB = $regB.accessToken
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys" -Method Post -Headers @{ Authorization = "Bearer $tokenB" } -Body '{"key":"@maria2"}' -ContentType "application/json"

# ─── Acordo com garantia ──────────────────────────────────────────────────────
$body = '{"title":"Serviço de design","counterpartyKey":"@maria2","amount":350.00}'
$ac = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/guaranteed" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" } -Body $body -ContentType "application/json"
$id = $ac.id
Write-Host "Acordo: $id"

# B aceita
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id/accept" -Method Post -Headers @{ Authorization = "Bearer $tokenB" }

# Summary A: amountsToPay.total deve ser 350
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/summary" `
  -Headers @{ Authorization = "Bearer $tokenA" } | Select-Object -ExpandProperty financial | ConvertTo-Json

# A paga
$pi = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id/payment-intents" -Method Post -Headers @{ Authorization = "Bearer $tokenA" }
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/payments/$($pi.id)/simulate-confirmation" -Method Post -Headers @{ Authorization = "Bearer $tokenA" }

# Summary B: amountsToReceive.total deve ser 350
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/summary" `
  -Headers @{ Authorization = "Bearer $tokenB" } | Select-Object -ExpandProperty financial | ConvertTo-Json

# Summary: protectedAmounts deve ser 350
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/summary" `
  -Headers @{ Authorization = "Bearer $tokenA" } | Select-Object -ExpandProperty financial | ConvertTo-Json

# Listagem com filtro financialStatus=FUNDS_HELD
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements?financialStatus=FUNDS_HELD" `
  -Headers @{ Authorization = "Bearer $tokenA" } | ConvertTo-Json -Depth 3
```

---

## Mensagens de erro

| Código | Situação | Mensagem |
|---|---|---|
| 400 | Acordo não aguarda aceite | Este acordo não está aguardando aceite. |
| 400 | Acordo não pode ser cancelado | Este acordo não pode ser cancelado no estado atual. |
| 400 | Acordo não está ativo | Somente acordos ativos podem ser concluídos. |
| 400 | Criando consigo mesmo | Você não pode criar um acordo consigo mesmo. |
| 401 | Sem token | Unauthorized |
| 403 | Não é a contraparte | Somente a contraparte pode aceitar/recusar este acordo. |
| 403 | Não é o criador | Somente o criador pode cancelar um acordo aguardando aceite. |
| 403 | Sem acesso | Você não tem acesso a este acordo. |
| 404 | Acordo não encontrado | Acordo não encontrado. |
| 404 | Chave não encontrada | Chave da contraparte não encontrada ou inativa. |
| 409 | Já aceito | Este acordo já foi aceito. |
| 409 | Prazo de aceite expirado | O prazo de aceite deste acordo expirou. |

---

## Arquivos implementados

- `apps/api/src/modules/agreements/agreements.service.ts` — `getWalletSummary`, `findAllByUser` (atualizado)
- `apps/api/src/modules/agreements/agreements.controller.ts` — `GET /summary` (antes de `GET /:id`)
- `apps/api/src/modules/agreements/dto/list-agreements.dto.ts` — novos filtros + `MyAgreementRole` enum
- `apps/api/src/modules/agreements/dto/create-simple-agreement.dto.ts`
- `apps/api/src/modules/agreements/dto/cancel-agreement.dto.ts`
- `apps/api/src/modules/agreements/dto/decline-agreement.dto.ts`
- `apps/api/src/modules/agreement-events/agreement-events.service.ts`
