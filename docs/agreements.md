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
| Disputa financeira | Não | Sim (Fase futura) |
| Fase | **Fase 4 (atual)** | Fase 5+ |

O Acordo Simples serve para:
- Registrar um combinado informal com força de registro
- Convidar a contraparte e aguardar aceite
- Acompanhar prazo e status
- Registrar histórico de eventos
- Preparar o terreno para score de confiança

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

> **Nota sobre recusa:** Quando a contraparte recusa (`decline`), dois registros são gerados simultaneamente:
> - O **evento** (`AgreementEvent`) registrado é do tipo `REJECTED` — identifica que foi uma recusa, não um cancelamento.
> - O **status operacional** final do acordo (`Agreement.operationalStatus`) fica `CANCELLED` — pois a recusa encerra o acordo antes do aceite, e não existe o estado `DECLINED` no enum.
> - O **participante** recusante terá `AgreementParticipant.status: REJECTED`.
>
> Portanto: evento = `REJECTED`, acordo = `CANCELLED`. Esse comportamento foi validado em teste manual.

---

## Endpoints

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

**Response 201:**
```json
{
  "id": "cm...",
  "type": "SIMPLE",
  "operationalStatus": "AWAITING_ACCEPTANCE",
  "financialStatus": "NONE",
  "title": "Jogar bola no sábado",
  "generatedSummary": "Você criou um combinado com João com prazo até 10/06/2026.",
  "description": "João vai pagar o campo...",
  "amount": "80.00",
  "currency": "BRL",
  "dueDate": "2026-06-10T10:00:00.000Z",
  "confirmationRule": "SINGLE_PARTY",
  "createdById": "cm...",
  "contentHash": "sha256...",
  "receiverKeySnapshot": {
    "key": "@joao",
    "normalizedKey": "joao",
    "userId": "cm...",
    "displayName": "João Silva",
    "avatarUrl": null
  },
  "participants": [
    { "userId": "cm...", "role": "CREATOR", "status": "ACCEPTED" },
    { "userId": "cm...", "role": "COUNTERPART", "status": "PENDING" }
  ],
  "createdAt": "2026-06-04T00:00:00.000Z",
  "updatedAt": "2026-06-04T00:00:00.000Z"
}
```

**Erros:**
- `400` — título inválido, data inválida, criando acordo consigo mesmo
- `401` — sem token
- `404` — chave da contraparte não encontrada ou inativa

---

### `GET /api/v1/agreements`

Lista acordos do usuário autenticado (criador ou contraparte).

**Auth:** JWT obrigatório

**Query params:**
| Param | Tipo | Descrição |
|---|---|---|
| `status` | `AgreementOperationalStatus` | Filtrar por status |
| `type` | `AgreementType` | `SIMPLE` ou `WITH_GUARANTEE` |
| `page` | number | Default 1 |
| `limit` | number | Default 20, máx 100 |

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

**Erros:**
- `400` — acordo não está aguardando aceite
- `403` — não é a contraparte

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
- Quem concluiu fica registrado no evento

**Response 200:** objeto `Agreement` atualizado (`operationalStatus: "COMPLETED"`)

---

### `GET /api/v1/agreements/:id/events`

Lista o histórico de eventos do acordo em ordem cronológica.

**Auth:** JWT obrigatório — somente participantes

**Response 200:**
```json
[
  {
    "id": "cm...",
    "agreementId": "cm...",
    "actorId": "cm...",
    "actorType": "USER",
    "type": "CREATED",
    "payload": { "counterpartyKey": "@joao" },
    "note": null,
    "createdAt": "2026-06-04T00:00:00.000Z"
  },
  { "type": "SENT", ... },
  { "type": "ACCEPTED", ... },
  { "type": "COMPLETED", ... }
]
```

**Tipos de evento registrados:**
| Evento | Quando |
|---|---|
| `CREATED` | Criação do acordo |
| `SENT` | Envio para a contraparte |
| `ACCEPTED` | Contraparte aceitou |
| `REJECTED` | Contraparte recusou |
| `CANCELLED` | Cancelamento |
| `COMPLETED` | Conclusão |

---

## Campos automáticos

### `generatedSummary`

Frase resumo gerada automaticamente na criação:

- `"Você criou um combinado com João com prazo até 10/06/2026."`
- `"Você criou um combinado com Maria no valor de BRL 80.00 com prazo até 10/06/2026."`

### `contentHash`

SHA256 dos termos do acordo (título, descrição, chave da contraparte, valor, prazo) calculado no momento da criação. Permite provar a existência dos termos sem blockchain real (Fase 5 fará a submissão real).

### `receiverKeySnapshot`

Snapshot da chave de recebimento da contraparte no momento da criação. Protege contra alterações futuras.

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

# Criar chave para usuário A
$body = '{"key":"@usera"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" } `
  -Body $body -ContentType "application/json"

# Usuário B — contraparte
$bodyB = '{"email":"userb@selo.dev","password":"senha-123","firstName":"User","lastName":"B"}'
$regB = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -Body $bodyB -ContentType "application/json"
$tokenB = $regB.accessToken

# Criar chave para usuário B
$body = '{"key":"@userb"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenB" } `
  -Body $body -ContentType "application/json"
```

### Criar acordo (usuário A envia para B)

```powershell
$body = '{"title":"Pagar o almoço","counterpartyKey":"@userb","amount":45.50,"dueDate":"2026-06-15T12:00:00.000Z"}'
$acordo = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/simple" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" } `
  -Body $body -ContentType "application/json"
$acordoId = $acordo.id
$acordoId
$acordo | ConvertTo-Json -Depth 5
```

### Listar acordos

```powershell
# Acordos do usuário A (criador)
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements" `
  -Headers @{ Authorization = "Bearer $tokenA" } | ConvertTo-Json -Depth 5

# Acordos do usuário B (contraparte)
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements" `
  -Headers @{ Authorization = "Bearer $tokenB" } | ConvertTo-Json -Depth 5
```

### Usuário B vê detalhe

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$acordoId" `
  -Headers @{ Authorization = "Bearer $tokenB" } | ConvertTo-Json -Depth 5
```

### Usuário B aceita

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$acordoId/accept" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenB" } | ConvertTo-Json -Depth 5
```

### Usuário A vê acordo ativo

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$acordoId" `
  -Headers @{ Authorization = "Bearer $tokenA" } | ConvertTo-Json -Depth 3
```

### Usuário A conclui

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$acordoId/complete" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" } | ConvertTo-Json -Depth 3
```

### Ver histórico de eventos

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$acordoId/events" `
  -Headers @{ Authorization = "Bearer $tokenA" } | ConvertTo-Json -Depth 5
```

### Testar recusa (novo acordo)

```powershell
$body = '{"title":"Buscar o notebook","counterpartyKey":"@userb"}'
$acordo2 = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/simple" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" } `
  -Body $body -ContentType "application/json"
$id2 = $acordo2.id

# B recusa
$body = '{"reason":"Não consigo ir até lá."}'
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id2/decline" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenB" } `
  -Body $body -ContentType "application/json" | ConvertTo-Json -Depth 3

# Resultado esperado:
# acordo.operationalStatus = "CANCELLED"   ← o acordo está encerrado
# participante B: status = "REJECTED"      ← identifica que foi uma recusa
# evento registrado: type = "REJECTED"     ← evento distinto de CANCELLED

# Ver eventos para confirmar o tipo correto
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id2/events" `
  -Headers @{ Authorization = "Bearer $tokenA" } | ConvertTo-Json -Depth 5
```

### Testar cancelamento (novo acordo)

```powershell
$body = '{"title":"Reunião amanhã","counterpartyKey":"@userb"}'
$acordo3 = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/simple" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" } `
  -Body $body -ContentType "application/json"
$id3 = $acordo3.id

# A cancela enquanto aguarda aceite
$body = '{"reason":"Mudei de planos."}'
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id3/cancel" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" } `
  -Body $body -ContentType "application/json" | ConvertTo-Json -Depth 3
```

### Tentar aceitar acordo cancelado (deve retornar 400)

```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id3/accept" -Method Post `
    -Headers @{ Authorization = "Bearer $tokenB" }
} catch {
  "Status: $($_.Exception.Response.StatusCode)" # deve ser 400
}
```

### Filtrar por status

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements?status=ACTIVE" `
  -Headers @{ Authorization = "Bearer $tokenA" } | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements?status=COMPLETED" `
  -Headers @{ Authorization = "Bearer $tokenA" } | ConvertTo-Json
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

## Histórico de Testes Manuais

### Status: ✅ Testado manualmente em 2026-06-04

| Fluxo | Resultado |
|---|---|
| Criar acordo simples (A → B) | ✅ OK — 201 com `operationalStatus: AWAITING_ACCEPTANCE` |
| Listar acordos do criador (A) | ✅ OK — aparece na listagem |
| Listar acordos da contraparte (B) | ✅ OK — aparece na listagem |
| Ver detalhe do acordo (B) | ✅ OK — participantes e perfis retornados |
| Aceitar acordo (B aceita) | ✅ OK — status vai para `ACTIVE`, evento `ACCEPTED` registrado |
| Concluir acordo (A conclui) | ✅ OK — status vai para `COMPLETED`, evento `COMPLETED` registrado |
| Ver histórico de eventos | ✅ OK — sequência `CREATED → SENT → ACCEPTED → COMPLETED` |
| **Recusar acordo (B recusa)** | ✅ OK — evento `REJECTED`, acordo `CANCELLED`, participante `REJECTED` |
| Cancelar enquanto aguarda aceite (A cancela) | ✅ OK — status vai para `CANCELLED`, evento `CANCELLED` |
| Tentar aceitar acordo já cancelado | ✅ OK — retorna `400` |
| Filtrar acordos por `status=ACTIVE` | ✅ OK |
| Filtrar acordos por `status=COMPLETED` | ✅ OK |
| Tentar acessar acordo de outro usuário | ✅ OK — retorna `403` |
| Criar acordo consigo mesmo | ✅ OK — retorna `400` |

### Comportamento confirmado: recusa vs. cancelamento

A recusa pela contraparte e o cancelamento são **semanticamente distintos**, mas compartilham o mesmo status operacional final (`CANCELLED`). A diferença está nos registros de evento e participante:

| Ação | `AgreementEvent.type` | `Agreement.operationalStatus` | `AgreementParticipant.status` |
|---|---|---|---|
| Contraparte recusa | `REJECTED` | `CANCELLED` | `REJECTED` (apenas a contraparte) |
| Criador cancela (em AWAITING) | `CANCELLED` | `CANCELLED` | sem alteração |
| Qualquer um cancela (em ACTIVE) | `CANCELLED` | `CANCELLED` | sem alteração |

Essa distinção permite que o histórico de eventos identifique **por que** um acordo foi encerrado, mesmo que o status final seja o mesmo.

---

## Arquivos implementados

- `apps/api/src/modules/agreements/agreements.service.ts`
- `apps/api/src/modules/agreements/agreements.controller.ts`
- `apps/api/src/modules/agreements/dto/create-simple-agreement.dto.ts`
- `apps/api/src/modules/agreements/dto/cancel-agreement.dto.ts`
- `apps/api/src/modules/agreements/dto/decline-agreement.dto.ts`
- `apps/api/src/modules/agreements/dto/list-agreements.dto.ts`
- `apps/api/src/modules/agreement-events/agreement-events.service.ts`
