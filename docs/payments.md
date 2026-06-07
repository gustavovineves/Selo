# Pagamentos — Selo API

## Conceito

O módulo de pagamentos gerencia o fluxo de depósito da garantia financeira em acordos `WITH_GUARANTEE`.

### Responsabilidades da plataforma vs. parceiro financeiro

| Quem | Responsabilidade |
|---|---|
| **Plataforma Selo** | Orquestrar o fluxo, registrar intenção de pagamento, notificar partes, rastrear estado |
| **Parceiro financeiro (Fitbank/BaaS)** | Receber o Pix, custodiar os fundos, executar payout ao recebedor, processar reembolso |
| **Blockchain** | Registrar prova imutável do acordo (Fase 6) — não é a custódia dos fundos |

### Modelos envolvidos

| Model | Papel |
|---|---|
| `PaymentIntent` | Intenção de pagamento — criada antes do QR Code |
| `PixCharge` | Cobrança Pix gerada pelo parceiro (QR Code, txid, status) |
| `Payout` | Liberação de fundos ao recebedor após conclusão |
| `Refund` | Devolução de fundos ao pagador após cancelamento/disputa |

---

## Fluxo de Pagamento

```
POST /agreements/:id/payment-intents
    │  Cria PaymentIntent (AWAITING_PAYMENT)
    │  Cria PixCharge (ACTIVE) com QR Code
    ▼
Pagador escaneia o QR Code e paga via app bancário
    │
    ▼  (em produção: webhook do PSP/Fitbank)
POST /payments/:id/simulate-confirmation  ← DEV ONLY
    │  PaymentIntent → PAID
    │  PixCharge → COMPLETED
    │  FinancialGuarantee → LOCKED
    │  Agreement.financialStatus → FUNDS_HELD
    ▼
POST /agreements/:id/release  OU  POST /agreements/:id/refund
    │  Cria Payout (COMPLETED) → fundos liberados ao recebedor
    │  OU Cria Refund (COMPLETED) → fundos devolvidos ao pagador
    ▼
PAID_OUT ou REFUNDED
```

---

## Endpoint

### `POST /api/v1/payments/:paymentIntentId/simulate-confirmation`

**Dev/local apenas.** Simula o callback do parceiro financeiro confirmando o Pix.

Em produção este endpoint não existirá. A confirmação virá como webhook do PSP/Fitbank:
```
POST /webhooks/pix/confirmation  ← endpoint futuro (Fase 6)
```

**Auth:** JWT obrigatório — usuário deve ser participante do acordo

**O que o endpoint faz:**
- Valida que PaymentIntent está em `AWAITING_PAYMENT`
- Confirma: PaymentIntent → PAID, PixCharge → COMPLETED
- Protege: FinancialGuarantee → LOCKED
- Atualiza: `Agreement.financialStatus → FUNDS_HELD`
- Registra: `AgreementEvent FUNDS_LOCKED` (actorType: SYSTEM)
- Auditoria: `AuditLog PAYMENT_COMPLETED`
- Blockchain: `BlockchainRecord PENDING` (submissão real: Fase 6)

**Response 200:**
```json
{
  "id": "cm...",
  "status": "PAID",
  "paidAt": "2026-06-04T01:00:00.000Z",
  "pixCharge": { "id": "cm...", "status": "COMPLETED", "paidAt": "2026-06-04T01:00:00.000Z" },
  "agreement": {
    "id": "cm...",
    "operationalStatus": "ACTIVE",
    "financialStatus": "FUNDS_HELD",
    "financialGuarantee": {
      "id": "cm...",
      "status": "LOCKED",
      "amount": "350.00",
      "currency": "BRL",
      "lockedAt": "2026-06-04T01:00:00.000Z"
    }
  }
}
```

**Erros:**
| Código | Situação |
|---|---|
| 400 | PaymentIntent não está em AWAITING_PAYMENT |
| 400 | Sem acordo associado |
| 400 | Garantia financeira não encontrada |
| 403 | Usuário não é participante do acordo |
| 404 | PaymentIntent não encontrado |
| 409 | Pagamento já foi confirmado |

---

## Idempotência

`PaymentIntent.idempotencyKey` e `Payout.idempotencyKey` / `Refund.idempotencyKey` usam UUID v4 gerado pelo backend. Garantem que retries não causem processamento duplicado.

Uma garantia pode ter múltiplos `PaymentIntent` (retry flow): se um QR Code expirar, um novo PaymentIntent pode ser criado. O serviço verifica que não existe PaymentIntent ativo antes de criar outro.

---

## Providers de Pagamento (Fase 24)

O Selo usa uma interface `IPaymentProvider` que abstrai o provedor financeiro. O provider ativo é selecionado via env var `PAYMENT_PROVIDER`.

### Providers disponíveis

| PAYMENT_PROVIDER | Provider | Chamada real | Quando usar |
|---|---|---|---|
| `simulated` (padrão) | `SimulatedPaymentProvider` | Nunca | Desenvolvimento local, CI, unit tests |
| `fitbank_sandbox` | `FitbankSandboxPaymentProvider` | Nunca (enquanto `FITBANK_ENABLE_REAL_CALLS=false`) | Integração sandbox Fitbank futura |

### Como o provider é selecionado

```
PAYMENT_PROVIDER=simulated        → SimulatedPaymentProvider
PAYMENT_PROVIDER=fitbank_sandbox  → FitbankSandboxPaymentProvider
                                    (apenas se FITBANK_ENABLE_REAL_CALLS=false)
```

Se `FITBANK_ENABLE_REAL_CALLS=true`, o `FitbankSandboxPaymentProvider` continuará sem fazer chamadas reais na Fase 24 — essa flag está preparada para quando a integração real for implementada.

### Diferença de QR Code por provider

| Campo | simulated | fitbank_sandbox |
|---|---|---|
| `PixCharge.pixKey` | `SELO-PLATFORM@DEV.LOCAL` | `FITBANK_PIX_KEY` env (ou `sandbox@fitbank.com.br`) |
| `PixCharge.txid` | `randomUUID()` 35 chars | `SBXSELO` + UUID truncado (formato sandbox Fitbank) |
| `PixCharge.qrCode` | EMV fake simples | EMV fake mimicking Fitbank sandbox |
| `PaymentIntent.metadata.provider` | `SIMULATED` | `FITBANK_SANDBOX` |
| `instructions` retornado | "Use o botão de simulação" | "Use webhook ou simulate-confirmation" |

### Endpoint de Webhook Sandbox

`POST /api/v1/payments/webhooks/fitbank`

Recebe confirmações de pagamento do Fitbank sandbox (ou de um simulador de webhook local).

**Sem autenticação JWT** — autenticado por assinatura HMAC-SHA256 (opcional em sandbox).

**Payload esperado:**
```json
{
  "event": "PIX_PAYMENT_CONFIRMED",
  "txid": "SBXSELOABCDEF12345678901234567",
  "amount": "350.00",
  "endToEndId": "E12345678202606061000xxxxxxxx",
  "paymentDate": "2026-06-06T10:00:00Z"
}
```

**Eventos mapeados:**

| event (webhook) | Ação interna |
|---|---|
| `PIX_PAYMENT_CONFIRMED`, `PIX_RECEIVED`, `PAYMENT_CONFIRMED` | PaymentIntent → PAID, FinancialGuarantee → LOCKED, financialStatus → FUNDS_HELD |
| `PIX_PAYMENT_FAILED`, `PAYMENT_FAILED` | Registrado, sem ação automática |
| `PIX_EXPIRED`, `PAYMENT_EXPIRED` | Registrado, sem ação automática |
| Qualquer outro | Ignorado com `received: true` |

**Idempotência:** webhook duplicado com mesmo `txid` não reprocessa (verifica `PaymentIntent.status === PAID`).

**Validação de assinatura:** se `FITBANK_WEBHOOK_SECRET` estiver configurado, valida `X-Fitbank-Signature: sha256=<hmac>`. Em sandbox sem secret, aceita todos.

**Como testar o webhook sandbox localmente:**
```bash
curl -X POST http://localhost:3000/api/v1/payments/webhooks/fitbank \
  -H "Content-Type: application/json" \
  -d '{"event":"PIX_PAYMENT_CONFIRMED","txid":"SEU_TXID_AQUI","amount":"350.00"}'
```

---

## Ambiente Dev vs. Produção

| Campo | simulated (dev/CI) | fitbank_sandbox (fase atual) | Produção (futuro) |
|---|---|---|---|
| `PixCharge.pixKey` | `SELO-PLATFORM@DEV.LOCAL` | `sandbox@fitbank.com.br` | Chave Pix real da conta Fitbank |
| `PixCharge.txid` | UUID local | `SBXSELO...` (fake sandbox) | txid real do PSP |
| `PixCharge.qrCode` | EMV fake simples | EMV fake sandbox | QR Code real do PSP |
| Confirmação | `POST /payments/:id/simulate-confirmation` | `POST /payments/webhooks/fitbank` (sandbox) | Webhook real Fitbank |
| Payout | `status=COMPLETED` imediato (simulado) | `status=COMPLETED` imediato (simulado) | Transação real Fitbank → recebedor |
| Refund | `status=COMPLETED` imediato (simulado) | `status=COMPLETED` imediato (simulado) | Transação real Fitbank → pagador |

---

## Fluxo Pix no App Mobile (Fase 11)

O app mobile implementa o fluxo de pagamento simulado diretamente na tela de detalhe do acordo.

### Serviços mobile

```typescript
// agreements.service.ts
createPaymentIntent: (id: string) => POST /agreements/:id/payment-intents

// payments.service.ts
simulateConfirmation: (paymentIntentId: string) => POST /payments/:id/simulate-confirmation
```

### UX no app

1. Acordo `WITH_GUARANTEE` + aceito + `AWAITING_PAYMENT` + usuário é criador → **card "Pagar com Pix"** visível
2. Botão **"Gerar Pix"** → chama `createPaymentIntent()` → exibe `pixCharge.qrCode` como texto copiável
3. Botão **"Compartilhar código Pix"** → `Share.share()` nativo
4. Seção **"Apenas para simulação"** com botão **"Simular pagamento confirmado"**
5. Após confirmação → `financialStatus → FUNDS_HELD` → card "Valor protegido" exibido

### Termos usados no app

| Técnico | App (usuário) |
|---|---|
| `AWAITING_PAYMENT` | "Aguardando pagamento" |
| `FUNDS_HELD` | "Valor protegido" |
| `payment-intents` | "Pagar com Pix" / "Gerar Pix" |
| `simulate-confirmation` | "Simular pagamento confirmado" (dev) |
| `PAID_OUT` | "Pagamento liberado" |
| `REFUNDED` | "Reembolsado" |

> **Fitbank não foi integrado.** Pix continua simulado. Nenhum dinheiro real é movimentado.
