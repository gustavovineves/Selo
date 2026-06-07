# Acordos com Garantia — Selo API

## Conceito

Um **Acordo com Garantia** (`type: WITH_GUARANTEE`) é um combinado em que o pagador deposita um valor que fica protegido na plataforma até o acordo ser cumprido. Quando o acordo é concluído, o valor é liberado ao recebedor. Se houver cancelamento ou disputa, o valor segue a regra de reembolso.

### Princípios do modelo financeiro

| Princípio | Detalhe |
|---|---|
| A plataforma **não custodia** diretamente o dinheiro | O parceiro financeiro (Fitbank/BaaS) é o responsável real |
| Blockchain é **prova**, não custódia | O hash dos termos é registrado como rastreabilidade; o dinheiro fica com o BaaS |
| Valor protegido só existe após confirmação do parceiro | `financialStatus = FUNDS_HELD` só muda após webhook/simulação |
| Pix é o método de entrada no MVP | Débito/cartão fora do escopo inicial |
| Chave de Recebimento do App ≠ chave Pix | O handle `@usuario` é interno do Selo; a chave Pix real fica no BaaS |
| **Recebedor precisa ter Destino de Recebimento** | Antes de criar acordo com garantia, o recebedor deve ter um destino ativo cadastrado |

---

## Conceitos: Chave de Recebimento vs. Destino de Recebimento

| | Chave de Recebimento do App | Destino de Recebimento |
|---|---|---|
| **Para que serve** | Localizar o recebedor dentro da plataforma | Indicar para onde o dinheiro será enviado futuramente |
| **Exemplo** | `@maria`, `@joao` | CPF Pix `***.456`, Email Pix `m***@gmail.com` |
| **Quem configura** | Qualquer usuário para ser encontrado | Usuário que queira receber valor protegido |
| **Obrigatório para** | Qualquer acordo | Apenas acordos com garantia (como recebedor) |
| **Mudança afeta acordos antigos?** | Não — snapshot já salvo | Não — snapshot já salvo no acordo |
| **Integração Pix real** | Não — handle interno | Futuro (Fase 5 / Fitbank) — simulado no MVP |

> **Fluxo de criação do acordo com garantia:**
> ```
> Criador informa @maria (Chave de Recebimento)
>   → sistema resolve maria = User#xyz
>   → sistema busca destino ativo de User#xyz (Destino de Recebimento)
>   → se não tiver: 400 "O recebedor precisa configurar um destino de recebimento"
>   → se tiver: snapshot salvo no acordo (imutável após criação)
> ```

---

## Princípio Central

> **Acordo com garantia só libera o valor se ambas as partes confirmarem que o combinado foi cumprido.**
>
> - Nenhum participante libera o valor sozinho.
> - A primeira confirmação move o acordo para `AWAITING_CONFIRMATION`.
> - A segunda confirmação libera automaticamente o payout ao recebedor.
> - Se uma parte contestar antes da segunda confirmação, abre-se disputa e o valor fica travado.

---

## Ciclo de Vida

```
[CRIAÇÃO — POST /agreements/guaranteed]
    │   operationalStatus = AWAITING_ACCEPTANCE
    │   financialStatus   = AWAITING_PAYMENT
    │   confirmationRule  = MANUAL (dupla confirmação obrigatória)
    │   FinancialGuarantee.status = AWAITING_PAYMENT
    ▼
[ACEITE — POST /agreements/:id/accept]  (somente contraparte)
    │   operationalStatus → ACTIVE
    ▼
[PAGAMENTO — POST /agreements/:id/payment-intents]  (somente pagador)
    │   Cria PaymentIntent (AWAITING_PAYMENT) + PixCharge (ACTIVE)
    │   Retorna QR Code para o pagador escanear
    ▼
[CONFIRMAÇÃO DO PIX — POST /payments/:paymentIntentId/simulate-confirmation]  (dev)
    │   PaymentIntent → PAID
    │   PixCharge → COMPLETED
    │   FinancialGuarantee → LOCKED
    │   financialStatus → FUNDS_HELD  ← valor protegido confirmado
    ▼
    ┌──[1ª CONFIRMAÇÃO DE CONCLUSÃO — POST /agreements/:id/confirm-completion]
    │       AgreementEvent CONFIRMED (actorId = quem confirmou)
    │       operationalStatus → AWAITING_CONFIRMATION
    │       AgreementEvent CONFIRMATION_REQUESTED (SYSTEM)
    │       financialStatus permanece FUNDS_HELD
    │
    ├──[2ª CONFIRMAÇÃO — POST /agreements/:id/confirm-completion]  (a outra parte)
    │       AgreementEvent CONFIRMED (actorId = segundo confirmador)
    │       Payout criado automaticamente (COMPLETED, simulado)
    │       FinancialGuarantee → PAID_OUT
    │       financialStatus → PAID_OUT
    │       operationalStatus → COMPLETED
    │       TrustScore +20 para ambos
    │
    ├──[CONTESTAÇÃO — POST /agreements/:id/dispute]  (antes da 2ª confirmação)
    │       Dispute aberto (OPEN)
    │       FinancialGuarantee → FROZEN_DISPUTE
    │       financialStatus → DISPUTED
    │       operationalStatus permanece AWAITING_CONFIRMATION
    │       Release, refund e confirm-completion bloqueados até resolução admin
    │
    │   [RESOLUÇÃO ADMIN — POST /admin/disputes/:id/resolve-release  OU  resolve-refund]
    │       Admin analisa evidências e decide
    │       resolve-release → Payout simulado + COMPLETED + PAID_OUT
    │       resolve-refund  → Refund simulado + CANCELLED + REFUNDED
    │       TrustScore atualizado para ambas as partes
    │       AuditLog + BlockchainRecord PENDING registrados
    │
    └──[REEMBOLSO — POST /agreements/:id/refund]  (só antes da 1ª confirmação)
            Refund criado e simulado como concluído
            FinancialGuarantee → REFUNDED
            financialStatus → REFUNDED
            operationalStatus → CANCELLED
```

### Tabela de transições

| operationalStatus | financialStatus | Ação disponível | Resultado |
|---|---|---|---|
| ACTIVE | FUNDS_HELD | `confirm-completion` (1ª) | → AWAITING_CONFIRMATION |
| ACTIVE | FUNDS_HELD | `refund` | → CANCELLED + REFUNDED |
| ACTIVE | FUNDS_HELD | `dispute` | financialStatus → DISPUTED |
| AWAITING_CONFIRMATION | FUNDS_HELD | `confirm-completion` (2ª) | → COMPLETED + PAID_OUT (auto-payout) |
| AWAITING_CONFIRMATION | FUNDS_HELD | `dispute` | financialStatus → DISPUTED |
| AWAITING_CONFIRMATION | FUNDS_HELD | `refund` | ❌ Bloqueado — use /dispute |
| \* | DISPUTED | qualquer (user) | ❌ Bloqueado até admin resolver |
| \* | DISPUTED | `resolve-release` (admin) | → COMPLETED + PAID_OUT |
| \* | DISPUTED | `resolve-refund` (admin) | → CANCELLED + REFUNDED |

---

## Endpoints

### `POST /api/v1/agreements/guaranteed`

Cria um Acordo com Garantia.

**Auth:** JWT obrigatório

**Request:**
```json
{
  "title": "Serviço de design de logo",
  "description": "Maria vai criar o logo em até 7 dias.",
  "counterpartyKey": "@maria",
  "amount": 350.00,
  "currency": "BRL",
  "dueDate": "2026-06-20T23:59:59.000Z",
  "confirmationRule": "SINGLE_PARTY",
  "releaseRule": "MANUAL",
  "refundRule": "MANUAL",
  "disputeRule": "ALLOWED"
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `title` | string (3–100) | Sim | Título do acordo |
| `counterpartyKey` | string | Sim | Handle da contraparte (`@maria`) |
| `amount` | number | Sim | Valor da garantia (min 0.01) |
| `currency` | string | Não | Default `BRL` |
| `description` | string (máx 2000) | Não | Descrição |
| `dueDate` | ISO8601 | **Sim** | Prazo do acordo (obrigatório desde a Fase 18) |
| `acceptanceExpiresAt` | ISO8601 | Não | Prazo para aceite |
| `confirmationDeadlineAt` | ISO8601 | Não | Prazo para confirmação |
| `confirmationRule` | enum | Não | **MANUAL (default — dupla confirmação obrigatória)** |
| `releaseRule` | enum | Não | MANUAL (default) |
| `refundRule` | enum | Não | MANUAL (default) |
| `disputeRule` | enum | Não | ALLOWED (default) |

> **confirmationRule = MANUAL** é o padrão para acordos com garantia. Significa que ambas as partes precisam confirmar explicitamente via `/confirm-completion` antes do payout ser liberado. `SINGLE_PARTY` existe no schema mas não é o padrão para acordos com garantia — usá-lo permite liberação unilateral.

**Pré-condição:** O recebedor localizado via `counterpartyKey` deve ter pelo menos um **Destino de Recebimento** ativo cadastrado. Caso contrário, a criação é bloqueada com 400.

**Response 201:** objeto `Agreement` com `financialGuarantee` embutido e `receiverDestinationSnapshot` preenchido

**`receiverDestinationSnapshot` (salvo no acordo, imutável):**
```json
{
  "type": "PIX_CPF",
  "maskedValue": "***.456",
  "provider": "SIMULATED",
  "receivingDestinationId": "cm..."
}
```

**Erros:**
| Código | Situação | Mensagem |
|---|---|---|
| `400` | Amount inválido, criando consigo mesmo, counterpartyKey ausente | — |
| `400` | Recebedor sem destino de recebimento ativo | "O recebedor precisa configurar um destino de recebimento antes de receber valor protegido." |
| `404` | Chave da contraparte não encontrada ou inativa | — |

---

### `POST /api/v1/agreements/:id/payment-intents`

Inicia o depósito Pix da garantia. Gera QR Code para o pagador.

**Auth:** JWT obrigatório — somente o pagador (criador)

**Pré-condições:**
- `operationalStatus = ACTIVE` (contraparte já aceitou)
- `financialStatus = AWAITING_PAYMENT`
- Sem PaymentIntent ativo para este acordo

**Response 200:**
```json
{
  "id": "cm...",
  "status": "AWAITING_PAYMENT",
  "amount": "350.00",
  "currency": "BRL",
  "expiresAt": "2026-06-04T00:30:00.000Z",
  "pixCharge": {
    "id": "cm...",
    "txid": "a3f7b...",
    "pixKey": "SELO-PLATFORM@DEV.LOCAL",
    "qrCode": "00020126...",
    "amount": "350.00",
    "status": "ACTIVE",
    "expiresAt": "2026-06-04T00:30:00.000Z"
  }
}
```

> **Dev/local:** `pixKey = SELO-PLATFORM@DEV.LOCAL` é uma chave simulada. Na integração real com Fitbank, seria a chave da conta de custódia do parceiro.

**Erros:**
- `400` — acordo não é WITH_GUARANTEE, não está ACTIVE, ou não aguarda pagamento
- `403` — usuário não é o pagador
- `409` — já existe PaymentIntent ativo

---

### `POST /api/v1/payments/:paymentIntentId/simulate-confirmation`

**Dev/local apenas.** Simula o webhook de confirmação do parceiro financeiro (Fitbank/BaaS).

Em produção, esse fluxo seria acionado pelo webhook real do PSP. Este endpoint existe apenas para testar localmente sem integração real.

**Auth:** JWT obrigatório — deve ser participante do acordo

**O que acontece:**
1. `PaymentIntent.status → PAID`
2. `PixCharge.status → COMPLETED`
3. `FinancialGuarantee.status → LOCKED`
4. `Agreement.financialStatus → FUNDS_HELD`
5. `AgreementEvent` `FUNDS_LOCKED` registrado pelo SYSTEM
6. `AuditLog` `PAYMENT_COMPLETED` registrado
7. `BlockchainRecord` criado com status `PENDING` (será submetido à blockchain na Fase 6)

**Response 200:** objeto PaymentIntent com pixCharge e acordo atualizados

**Erros:**
- `400` — pagamento não pode ser confirmado no estado atual
- `409` — pagamento já foi confirmado

---

### `POST /api/v1/agreements/:id/confirm-completion`

Confirma que o combinado foi cumprido. **Ambas as partes precisam confirmar** para o valor ser liberado.

**Auth:** JWT obrigatório — qualquer participante

**Pré-condições:**
- `type = WITH_GUARANTEE`
- `operationalStatus = ACTIVE` ou `AWAITING_CONFIRMATION`
- `financialStatus = FUNDS_HELD`
- Sem disputa em aberto
- Usuário ainda não confirmou (idempotente — retorna 409 se chamar duas vezes)

**O que acontece na 1ª confirmação:**
1. `AgreementEvent CONFIRMED` registrado com `actorId` do confirmador
2. `operationalStatus → AWAITING_CONFIRMATION`
3. `AgreementEvent CONFIRMATION_REQUESTED` registrado pelo SYSTEM (com payload indicando quem falta confirmar)
4. `financialStatus` permanece `FUNDS_HELD`

**O que acontece na 2ª confirmação (ambas as partes confirmaram):**
1. `AgreementEvent CONFIRMED` registrado com `actorId` do segundo confirmador
2. `Payout` criado automaticamente (`status = COMPLETED`, simulado)
3. `FinancialGuarantee → PAID_OUT`, `releasedAt` preenchido
4. `Agreement.financialStatus → PAID_OUT`
5. `Agreement.operationalStatus → COMPLETED`, `completedAt` preenchido
6. Eventos: `PAYOUT_INITIATED`, `PAYOUT_COMPLETED`, `COMPLETED` (todos SYSTEM)
7. `TrustScore +20` para ambos os participantes
8. `AuditLog PAYOUT_COMPLETED` com `trigger: dual_confirmation`
9. `BlockchainRecord PENDING`

**Response 200:** objeto `Agreement` atualizado

**Erros:**
| Código | Situação |
|---|---|
| 400 | Não é WITH_GUARANTEE |
| 400 | operationalStatus inválido (CANCELLED, COMPLETED, etc.) |
| 400 | financialStatus não é FUNDS_HELD |
| 403 | Não é participante |
| 404 | Acordo não encontrado |
| 409 | Disputa em aberto |
| 409 | Usuário já confirmou |

---

### `POST /api/v1/agreements/:id/release`

Libera o valor protegido ao recebedor **manualmente** (para `confirmationRule = SINGLE_PARTY` ou após dupla confirmação via `/confirm-completion`).

> **Nota:** Para acordos com `confirmationRule = MANUAL` (padrão de `WITH_GUARANTEE`), o `release` exige que **ambas as partes tenham chamado `/confirm-completion`** antes de funcionar. Caso contrário, retorna 400 com instrução para usar `/confirm-completion`.

**Auth:** JWT obrigatório — qualquer participante

**Pré-condições:**
- `financialStatus = FUNDS_HELD`
- Sem disputa em aberto (`OPEN`, `UNDER_REVIEW`, `AWAITING_EVIDENCE`)
- Se `confirmationRule = MANUAL`: ambas as partes devem ter confirmado via `/confirm-completion`

**O que acontece:**
1. `Payout` criado com `status = COMPLETED` (simulado)
2. `FinancialGuarantee → PAID_OUT`, `releasedAt` preenchido
3. `Agreement.financialStatus → PAID_OUT`
4. `Agreement.operationalStatus → COMPLETED`, `completedAt` preenchido
5. Eventos: `PAYOUT_INITIATED`, `PAYOUT_COMPLETED`, `COMPLETED`
6. `TrustScore +20` para ambos os participantes (`AGREEMENT_COMPLETED`)
7. `AuditLog PAYOUT_COMPLETED`
8. `BlockchainRecord PENDING`

**Response 200:** objeto `Agreement` atualizado

**Erros:**
- `400` — não é WITH_GUARANTEE, financialStatus não é FUNDS_HELD
- `409` — disputa em aberto

---

### `POST /api/v1/agreements/:id/refund`

Reembolsa o valor protegido ao pagador.

**Auth:** JWT obrigatório — qualquer participante

**Pré-condições:**
- `financialStatus = FUNDS_HELD` ou `AWAITING_PAYOUT`
- `operationalStatus = ACTIVE` (não pode reembolsar em `AWAITING_CONFIRMATION`)
- Valor não deve ter sido liberado (`PAID_OUT`)

> Se uma das partes já confirmou (`AWAITING_CONFIRMATION`), o reembolso unilateral é bloqueado — use `/dispute` para contestar.

**Body (opcional):**
```json
{ "reason": "Serviço não foi entregue." }
```

**O que acontece:**
1. `Refund` criado com `status = COMPLETED` (simulado)
2. `FinancialGuarantee → REFUNDED`, `revertedAt` preenchido
3. `Agreement.financialStatus → REFUNDED`
4. `Agreement.operationalStatus → CANCELLED`
5. Eventos: `REFUND_INITIATED`, `REFUND_COMPLETED`, `CANCELLED`
6. `TrustScore -10` para quem solicitou o reembolso
7. `AuditLog REFUND_COMPLETED`

**Erros:**
- `400` — não é WITH_GUARANTEE, não pode ser reembolsado no estado atual, sem pagamento confirmado

---

### `POST /api/v1/agreements/:id/dispute`

Abre uma disputa e trava o valor.

**Auth:** JWT obrigatório — qualquer participante

**Pré-condições:**
- `financialStatus = FUNDS_HELD`
- `disputeRule = ALLOWED`
- Sem disputa existente

**Request:**
```json
{
  "reason": "Serviço diferente do combinado",
  "description": "O logo entregue não seguiu o briefing combinado."
}
```

**O que acontece:**
1. `Dispute` criado com `status = OPEN`
2. `FinancialGuarantee → FROZEN_DISPUTE`
3. `Agreement.financialStatus → DISPUTED`
4. `Agreement.disputedAt` preenchido
5. `AgreementEvent DISPUTE_OPENED`
6. `TrustScore` evento neutro para o abridor (`DISPUTE_OPENED`, delta 0)
7. `AuditLog AGREEMENT_DISPUTED`

**Response 200:** objeto `Agreement` atualizado com `dispute` resumido

**Erros:**
- `400` — não é WITH_GUARANTEE, financialStatus não é FUNDS_HELD, disputeRule NOT_ALLOWED
- `409` — já existe disputa

---

### `GET /api/v1/agreements/:id/dispute`

Retorna a disputa e o histórico de mensagens.

**Auth:** JWT obrigatório — somente participantes

**Response 200:**
```json
{
  "id": "cm...",
  "agreementId": "cm...",
  "openedById": "cm...",
  "reason": "Serviço diferente do combinado",
  "description": "O logo entregue não seguiu o briefing combinado.",
  "status": "OPEN",
  "resolution": null,
  "messages": [
    {
      "id": "cm...",
      "senderId": "cm...",
      "senderType": "USER",
      "type": "TEXT",
      "content": "Vou enviar o briefing que combinamos.",
      "createdAt": "2026-06-04T10:00:00.000Z"
    }
  ],
  "createdAt": "2026-06-04T09:00:00.000Z"
}
```

---

### `GET /api/v1/agreements/:id/guarantee`

Retorna o estado atual da garantia financeira.

**Auth:** JWT obrigatório — somente participantes

**Response 200:**
```json
{
  "id": "cm...",
  "amount": "350.00",
  "currency": "BRL",
  "status": "LOCKED",
  "lockedAt": "2026-06-04T01:00:00.000Z",
  "releasedAt": null,
  "revertedAt": null,
  "createdAt": "2026-06-04T00:00:00.000Z"
}
```

---

### `GET /api/v1/financial-guarantees/:id`

Retorna garantia pelo ID (atalho direto sem agreementId).

**Auth:** JWT obrigatório — somente participantes do acordo associado

---

### `GET /api/v1/disputes/:id`

Retorna disputa pelo ID direto (sem agreementId na URL).

**Auth:** JWT obrigatório — somente participantes do acordo associado

---

### `POST /api/v1/disputes/:id/messages`

Adiciona mensagem à disputa.

**Auth:** JWT obrigatório — somente participantes do acordo associado

**Request:**
```json
{
  "content": "Segue o comprovante do briefing enviado.",
  "type": "TEXT"
}
```

**Tipos:** `TEXT`, `EVIDENCE`, `SYSTEM_NOTE`, `ADMIN_NOTE`, `RESOLUTION`

**Erros:**
- `400` — disputa encerrada (CLOSED ou WITHDRAWN)
- `404` — disputa não encontrada

---

## Regras de Score de Confiança

| Evento | Delta | Quem recebe |
|---|---|---|
| Liberação concluída (`AGREEMENT_COMPLETED`) | +20 | Ambos os participantes |
| Reembolso solicitado (`AGREEMENT_CANCELLED_BY_USER`) | -10 | Quem solicitou o reembolso |
| Disputa aberta (`DISPUTE_OPENED`) | 0 (neutro) | Quem abriu |

> Score mede comportamento em acordos, não valor moral. Delta -10 é mínimo e informacional — o histórico completo é visível no perfil.

---

## Ambiente de Desenvolvimento

O provider de pagamento é selecionado via env `PAYMENT_PROVIDER` (Fase 24):

| `PAYMENT_PROVIDER` | Confirmação | Chave Pix |
|---|---|---|
| `simulated` (padrão) | `POST /payments/:id/simulate-confirmation` | `SELO-PLATFORM@DEV.LOCAL` |
| `fitbank_sandbox` | `POST /payments/webhooks/fitbank` + simulate-confirmation | Configurada via `FITBANK_PIX_KEY` |

Em todos os casos, nenhuma chamada real ao Fitbank é feita enquanto `FITBANK_ENABLE_REAL_CALLS=false`.

| Comportamento real (produção futura) | Dev / Sandbox (atual) |
|---|---|
| Webhook de confirmação Pix (Fitbank) | `POST /payments/webhooks/fitbank` (sandbox) ou `simulate-confirmation` |
| Chave Pix da conta de custódia | Simulada ou `FITBANK_PIX_KEY` sandbox |
| Liberação real via Pix/TEF | Payout `status=COMPLETED` imediatamente (simulado) |
| Reembolso real via Pix | Refund `status=COMPLETED` imediatamente (simulado) |
| Submissão à blockchain | `BlockchainRecord status=PENDING` (Fase 26) |

---

## Testes com PowerShell

### Setup

```powershell
# Usuário A (pagador — quem cria o acordo garantido)
$bodyA = '{"email":"pagador@selo.dev","password":"senha-123","firstName":"Joao","lastName":"Pagador"}'
$regA = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -Body $bodyA -ContentType "application/json"
$tokenA = $regA.accessToken

# Usuário B (recebedor — contraparte)
$bodyB = '{"email":"recebedor@selo.dev","password":"senha-123","firstName":"Maria","lastName":"Recebedora"}'
$regB = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" -Method Post -Body $bodyB -ContentType "application/json"
$tokenB = $regB.accessToken

# Criar chave para B
$keyBody = '{"key":"@maria"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/receiving-keys" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenB" } `
  -Body $keyBody -ContentType "application/json"
```

### Fluxo positivo completo (dupla confirmação)

```powershell
# 1. A cria acordo com garantia para B (confirmationRule = MANUAL por padrão)
$body = '{"title":"Serviço de design","counterpartyKey":"@maria","amount":350.00,"dueDate":"2026-07-01T23:59:59Z"}'
$acordo = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/guaranteed" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" } `
  -Body $body -ContentType "application/json"
$id = $acordo.id
Write-Host "Acordo: $id | status: $($acordo.operationalStatus) | confirmationRule: $($acordo.confirmationRule)"

# 2. B aceita
$aceite = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id/accept" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenB" }
Write-Host "Após aceite: $($aceite.operationalStatus)"  # ACTIVE

# 3. A inicia pagamento (gera QR Code)
$pi = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id/payment-intents" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" }
$piId = $pi.id
Write-Host "PaymentIntent: $piId | QR: $($pi.pixCharge.qrCode.Substring(0,30))..."

# 4. Simular confirmação do Pix (webhook do parceiro financeiro)
$conf = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/payments/$piId/simulate-confirmation" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" }
Write-Host "Financeiro: $($conf.agreement.financialStatus)"  # FUNDS_HELD

# 5. A confirma conclusão (1ª confirmação)
$c1 = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id/confirm-completion" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" }
Write-Host "Após 1ª confirmação: $($c1.operationalStatus)"  # AWAITING_CONFIRMATION

# 6. B confirma conclusão (2ª confirmação — dispara payout automático)
$c2 = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id/confirm-completion" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenB" }
Write-Host "Após 2ª confirmação: $($c2.operationalStatus) | $($c2.financialStatus)"  # COMPLETED | PAID_OUT

# 7. Ver garantia final
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id/guarantee" `
  -Headers @{ Authorization = "Bearer $tokenA" } | ConvertTo-Json

# 8. Ver eventos (sequência esperada: CREATED → SENT → ACCEPTED → PAYMENT_REQUESTED →
#    FUNDS_LOCKED → CONFIRMED → CONFIRMATION_REQUESTED → CONFIRMED → PAYOUT_INITIATED →
#    PAYOUT_COMPLETED → COMPLETED)
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id/events" `
  -Headers @{ Authorization = "Bearer $tokenA" } | ConvertTo-Json -Depth 3
```

### Fluxo de disputa (contestação após 1ª confirmação)

```powershell
# Criar novo acordo para testar disputa
$body = '{"title":"Serviço com disputa","counterpartyKey":"@maria","amount":200.00}'
$ac2 = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/guaranteed" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" } -Body $body -ContentType "application/json"
$id2 = $ac2.id

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id2/accept" -Method Post -Headers @{ Authorization = "Bearer $tokenB" }
$pi2 = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id2/payment-intents" -Method Post -Headers @{ Authorization = "Bearer $tokenA" }
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/payments/$($pi2.id)/simulate-confirmation" -Method Post -Headers @{ Authorization = "Bearer $tokenA" }

# A confirma conclusão (1ª confirmação)
$c1 = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id2/confirm-completion" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" }
Write-Host "Após 1ª confirmação: $($c1.operationalStatus)"  # AWAITING_CONFIRMATION

# B contesta em vez de confirmar → abre disputa
$dispBody = '{"reason":"Serviço não entregue conforme combinado","description":"O prazo venceu sem entrega do item prometido."}'
$disp = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id2/dispute" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenB" } -Body $dispBody -ContentType "application/json"
Write-Host "Financeiro com disputa: $($disp.financialStatus)"  # DISPUTED

# Tentar confirm-completion com disputa aberta (deve retornar 409)
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id2/confirm-completion" -Method Post `
    -Headers @{ Authorization = "Bearer $tokenA" }
} catch { "Bloqueado corretamente: $($_.Exception.Response.StatusCode)" }  # 409

# Tentar release com disputa aberta (deve retornar 409)
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id2/release" -Method Post `
    -Headers @{ Authorization = "Bearer $tokenA" }
} catch { "Bloqueado corretamente: $($_.Exception.Response.StatusCode)" }  # 409

# Enviar mensagem na disputa
$dispId = (Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id2/dispute" -Headers @{ Authorization = "Bearer $tokenA" }).id
$msgBody = '{"content":"Aqui está o comprovante do prazo acordado.","type":"EVIDENCE"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/disputes/$dispId/messages" -Method Post `
  -Headers @{ Authorization = "Bearer $tokenA" } -Body $msgBody -ContentType "application/json"
```

### Fluxo negativo rápido

```powershell
# 1. Chave inexistente → 404
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/guaranteed" -Method Post `
    -Headers @{ Authorization = "Bearer $tokenA" } `
    -Body '{"title":"Teste","counterpartyKey":"@naoexiste","amount":100}' -ContentType "application/json"
} catch { "404 esperado: $($_.Exception.Response.StatusCode)" }

# 2. Consigo mesmo → 400
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/guaranteed" -Method Post `
    -Headers @{ Authorization = "Bearer $tokenA" } `
    -Body '{"title":"Teste","counterpartyKey":"@pagador","amount":100}' -ContentType "application/json"
} catch { "400 esperado: $($_.Exception.Response.StatusCode)" }

# 3. Release sem valor protegido → 400
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/v1/agreements/$id/release" -Method Post `
    -Headers @{ Authorization = "Bearer $tokenA" }
} catch { "400 esperado: $($_.Exception.Response.StatusCode)" }
```

---

## Erros

| Código | Situação | Mensagem |
|---|---|---|
| 400 | Acordo não é WITH_GUARANTEE | Este acordo não exige garantia financeira. |
| 400 | Não está ACTIVE para pagamento | O acordo precisa estar ativo... |
| 400 | Não aguarda pagamento | Este acordo não está aguardando pagamento. |
| 400 | confirm-completion em acordo SIMPLE | Confirmação de conclusão é exclusiva para acordos com garantia. |
| 400 | confirm-completion em estado inválido | Este acordo não pode ser confirmado no estado atual. |
| 400 | confirm-completion sem FUNDS_HELD | O valor precisa estar protegido para confirmar a conclusão. |
| 400 | release sem dupla confirmação | Este acordo exige confirmação das duas partes antes da liberação. Use /confirm-completion. |
| 400 | Valor não protegido para release | O valor precisa estar protegido para ser liberado. |
| 400 | Já liberado / reembolsado | Este acordo não pode ser reembolsado no estado financeiro atual. |
| 400 | refund em AWAITING_CONFIRMATION | Uma das partes já confirmou. Use /dispute se houver contestação. |
| 400 | Sem pagamento confirmado | Nenhum pagamento confirmado encontrado para reembolso. |
| 400 | WITH_GUARANTEE + /complete | Use o endpoint /confirm-completion. |
| 400 | FUNDS_HELD + /cancel | Use o endpoint de reembolso (/refund). |
| 400 | Disputa em acordo SIMPLE | Disputas financeiras só em WITH_GUARANTEE. |
| 400 | Disputa sem FUNDS_HELD | Disputas só enquanto valor protegido. |
| 400 | Recebedor sem destino de recebimento | O recebedor precisa configurar um destino de recebimento antes de receber valor protegido. |
| 400 | disputeRule NOT_ALLOWED | Este acordo não permite disputas. |
| 403 | Não é o pagador | Somente o pagador pode iniciar o depósito. |
| 403 | Sem acesso | Você não tem acesso a este acordo/garantia/disputa. |
| 409 | PaymentIntent já ativo | Já existe um pagamento em andamento. |
| 409 | Já confirmado pelo parceiro | Este pagamento já foi confirmado. |
| 409 | Usuário já confirmou conclusão | Você já confirmou a conclusão deste acordo. |
| 409 | Disputa em aberto (confirm/release) | Existe uma disputa em aberto. |
| 409 | Já existe disputa | Já existe uma disputa para este acordo. |

---

## Destino de Recebimento — Endpoints relacionados

Ver [docs/receiving-destinations.md](receiving-destinations.md) para documentação completa do módulo.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/v1/receiving-destinations` | Cadastrar destino de recebimento |
| GET | `/api/v1/receiving-destinations/me` | Listar meus destinos |
| PATCH | `/api/v1/receiving-destinations/:id` | Atualizar label ou default |
| DELETE | `/api/v1/receiving-destinations/:id` | Excluir logicamente |

**Antes de criar acordo com garantia**, o recebedor deve ter pelo menos um destino ativo.
**Após o acordo ser criado**, o destino fica registrado no `receiverDestinationSnapshot` e não pode ser alterado retroativamente.

---

## Arquivos implementados

- `apps/api/src/modules/agreements/agreements.service.ts` — `createGuaranteed`, `initiatePayment`, `confirmCompletion`, `release`, `refund`, `openDispute`, `getDispute` (+ atualização de `findOne`, `cancel`, `complete`); Fase 8: verificação de destino + snapshot
- `apps/api/src/modules/agreements/agreements.controller.ts` — todos os novos endpoints
- `apps/api/src/modules/agreements/agreements.module.ts` — imports de AuditLogsModule, TrustScoreModule, BlockchainRecordsModule, FinancialGuaranteesModule, ReceivingDestinationsModule (Fase 8)
- `apps/api/src/modules/agreements/dto/create-guaranteed-agreement.dto.ts`
- `apps/api/src/modules/agreements/dto/open-dispute.dto.ts`
- `apps/api/src/modules/payments/payments.service.ts` — `simulateConfirmation`
- `apps/api/src/modules/payments/payments.controller.ts`
- `apps/api/src/modules/payments/payments.module.ts`
- `apps/api/src/modules/financial-guarantees/financial-guarantees.service.ts` — `findByAgreement`, `findById`
- `apps/api/src/modules/financial-guarantees/financial-guarantees.controller.ts`
- `apps/api/src/modules/disputes/disputes.service.ts` — `findOne`, `addMessage`
- `apps/api/src/modules/disputes/disputes.controller.ts`
- `apps/api/src/modules/disputes/disputes.module.ts`
- `apps/api/src/modules/disputes/dto/add-dispute-message.dto.ts`
- `apps/api/src/modules/trust-score/trust-score.service.ts` — `recordEvent`
- `apps/api/src/modules/blockchain-records/blockchain-records.service.ts` — `createPending`

---

## Fluxo Completo no App Mobile (Fase 11)

O app implementa toda a jornada do acordo com garantia, do pagamento à contestação.

### Sequência de telas/estados no detalhe do acordo

| Estado do acordo | O que o app exibe |
|---|---|
| `AWAITING_ACCEPTANCE` + criador | Botão "Cancelar convite" |
| `AWAITING_ACCEPTANCE` + contraparte | Botões "Aceitar" e "Recusar" |
| `ACTIVE` + `AWAITING_PAYMENT` + criador | Card "Pagar com Pix" + botão "Gerar Pix" |
| `ACTIVE` + `AWAITING_PAYMENT` + contraparte | "Aguardando pagamento do criador." |
| `ACTIVE` + `FUNDS_HELD` | Card "Valor protegido" + botões "Confirmar conclusão" e "Contestar" |
| `AWAITING_CONFIRMATION` + `FUNDS_HELD` | Card "Valor protegido" + botão "Confirmar conclusão" (2ª confirmação) + "Contestar" |
| `DISPUTED` | Card "Em contestação" + seção formal da contestação + "Adicionar evidência" |
| `COMPLETED` + `PAID_OUT` | "Combinado concluído. Pagamento liberado ao recebedor." |
| `CANCELLED` + `REFUNDED` | "Combinado encerrado. Valor reembolsado ao pagador." |
| Contestação resolvida | Card de resolução com justificativa e status final |

### Verificação de contexto

- `isCreator` = `agreement.createdById === currentUserId` (JWT decode client-side)
- `isCounterpart` = participante com `role = COUNTERPART`
- No MVP: criador = pagador, contraparte = recebedor

### Limitações do app no MVP

- Reembolso (botão refund) não implementado no app → Fase 12
- Sem upload de arquivo como evidência → Fase 12
- Sem notificações push de mudança de estado → Fase 12
