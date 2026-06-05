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

## Ambiente Dev vs. Produção

| Campo | Dev (local) | Produção (Fitbank) |
|---|---|---|
| `PixCharge.pixKey` | `SELO-PLATFORM@DEV.LOCAL` | Chave Pix da conta Fitbank |
| `PixCharge.txid` | UUID gerado localmente | txid do PSP |
| `PixCharge.qrCode` | String EMV simulada | QR Code real do PSP |
| Confirmação | `POST /payments/:id/simulate-confirmation` | Webhook `POST /webhooks/pix/confirmation` |
| Payout | `status=COMPLETED` imediato | Transação real Fitbank → recebedor |
| Refund | `status=COMPLETED` imediato | Transação real Fitbank → pagador |
