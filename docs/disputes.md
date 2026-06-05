# Disputas — Selo API

## Conceito

Uma **Disputa** trava o valor protegido de um acordo `WITH_GUARANTEE` e abre um processo de mediação entre as partes. Enquanto a disputa estiver aberta, nenhum participante pode liberar ou reembolsar o valor — somente um administrador poderá resolver.

### O que NÃO é uma disputa no Selo

- Não é um mecanismo de cancelamento de acordo simples
- Não bloqueia o acordo operacionalmente — apenas o fluxo financeiro
- Não pune automaticamente nenhuma das partes na abertura

---

## Estados de Disputa

| Status | Descrição |
|---|---|
| `OPEN` | Disputa aberta, aguardando revisão |
| `UNDER_REVIEW` | Admin está analisando (Fase futura) |
| `AWAITING_EVIDENCE` | Partes foram solicitadas a enviar evidências |
| `RESOLVED_FAVOR_CREATOR` | Resolvida a favor do criador (Fase futura) |
| `RESOLVED_FAVOR_COUNTERPART` | Resolvida a favor da contraparte (Fase futura) |
| `WITHDRAWN` | Retirada pela parte que abriu |
| `CLOSED` | Encerrada (após resolução ou expiração) |

---

## Impacto no Acordo

| Antes da disputa | Depois da abertura |
|---|---|
| `financialStatus = FUNDS_HELD` | `financialStatus = DISPUTED` |
| `FinancialGuarantee.status = LOCKED` | `FinancialGuarantee.status = FROZEN_DISPUTE` |
| Release permitido | **Release bloqueado** (409) |
| Refund permitido | **Refund bloqueado** (400 — estado financeiro inválido) |

`operationalStatus` permanece `ACTIVE` durante a disputa. Apenas o eixo financeiro é bloqueado.

---

## Endpoints

### `POST /api/v1/agreements/:id/dispute`

Abre uma disputa. Ver detalhes em [guaranteed-agreements.md](guaranteed-agreements.md).

---

### `GET /api/v1/agreements/:id/dispute`

Retorna a disputa do acordo, com histórico de mensagens.

**Auth:** JWT — somente participantes

---

### `GET /api/v1/disputes/:id`

Retorna disputa pelo ID direto (sem agreementId).

**Auth:** JWT — somente participantes do acordo associado

**Response 200:**
```json
{
  "id": "cm...",
  "agreementId": "cm...",
  "openedById": "cm...",
  "reason": "Serviço não entregue",
  "description": "O prazo venceu sem entrega do trabalho.",
  "status": "OPEN",
  "resolution": null,
  "resolvedById": null,
  "resolvedByType": null,
  "resolvedAt": null,
  "closedAt": null,
  "createdAt": "2026-06-04T09:00:00.000Z",
  "updatedAt": "2026-06-04T09:00:00.000Z",
  "messages": [...]
}
```

---

### `POST /api/v1/disputes/:id/messages`

Adiciona mensagem à disputa.

**Auth:** JWT — somente participantes do acordo associado

**Pré-condições:**
- Disputa não está `CLOSED` nem `WITHDRAWN`

**Request:**
```json
{
  "content": "Aqui está o comprovante de entrega.",
  "type": "EVIDENCE"
}
```

**Tipos de mensagem:**
| Tipo | Uso |
|---|---|
| `TEXT` | Mensagem de texto comum (default) |
| `EVIDENCE` | Envio de evidência (URL no content ou `attachments`) |
| `SYSTEM_NOTE` | Mensagem automática do sistema |
| `ADMIN_NOTE` | Nota do admin (Fase futura) |
| `RESOLUTION` | Mensagem de resolução (Fase futura) |

**Response 201:**
```json
{
  "id": "cm...",
  "disputeId": "cm...",
  "senderId": "cm...",
  "senderType": "USER",
  "type": "EVIDENCE",
  "content": "Aqui está o comprovante de entrega.",
  "attachments": null,
  "createdAt": "2026-06-04T10:00:00.000Z"
}
```

---

## Score de Confiança nas Disputas

| Momento | Evento | Delta | Nota |
|---|---|---|---|
| Abertura | `DISPUTE_OPENED` | 0 | Neutro — abridor não é punido |
| Resolução a favor | `DISPUTE_WON` | +30 | (Fase futura — admin resolve) |
| Resolução contra | `DISPUTE_LOST` | -50 | (Fase futura — admin resolve) |

A linguagem preferida do produto é "histórico em evolução", não "score baixo".

---

## Resolução de Disputas (Fase Futura)

A resolução de disputas por admins está prevista para quando o painel admin estiver operacional (Fase 6). Fluxo esperado:

1. Admin recebe notificação de disputa aberta
2. Admin revisa mensagens e evidências
3. Admin decide a favor de uma das partes
4. Sistema executa payout ou refund conforme decisão
5. TrustScore das partes atualizado com `DISPUTE_WON` / `DISPUTE_LOST`
6. Disputa → `CLOSED`

---

## Erros

| Código | Situação |
|---|---|
| 400 | Disputa em acordo SIMPLE (não WITH_GUARANTEE) |
| 400 | financialStatus diferente de FUNDS_HELD |
| 400 | disputeRule = NOT_ALLOWED |
| 400 | Disputa encerrada (mensagem) |
| 403 | Usuário não é participante |
| 404 | Disputa não encontrada |
| 409 | Já existe disputa para este acordo |
