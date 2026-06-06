# Disputas — Selo API

## Conceito

Uma **Disputa** trava o valor protegido de um acordo `WITH_GUARANTEE` e abre um processo de mediação entre as partes. Enquanto a disputa estiver aberta, nenhum participante pode liberar ou reembolsar o valor. No MVP da Fase 6, a resolução é feita por **análise humana do administrador**.

### O que NÃO é uma disputa no Selo

- Não é um mecanismo de cancelamento de acordo simples
- Não bloqueia o acordo operacionalmente — apenas o fluxo financeiro
- Não pune automaticamente nenhuma das partes na abertura
- Não é resolvida automaticamente pelo sistema nesta fase

### Princípios do produto

- A plataforma **não custodia diretamente** o dinheiro — o parceiro financeiro (Fitbank/BaaS) é o responsável real
- Enquanto a disputa está aberta, o valor fica **travado em FROZEN_DISPUTE**
- **O administrador decide** liberar ao recebedor ou reembolsar ao pagador
- Toda decisão precisa de **justificativa obrigatória** e é registrada em audit log
- Em produção, a decisão administrativa acionaria o parceiro financeiro/BaaS real — no MVP, é simulado localmente

---

## Estados de Disputa

| Status | Descrição |
|---|---|
| `OPEN` | Disputa aberta, aguardando revisão admin |
| `UNDER_REVIEW` | Admin está analisando (Fase futura) |
| `AWAITING_EVIDENCE` | Partes foram solicitadas a enviar evidências (Fase futura) |
| `RESOLVED_FAVOR_CREATOR` | Resolvida a favor do criador/pagador — reembolso executado |
| `RESOLVED_FAVOR_COUNTERPART` | Resolvida a favor da contraparte/recebedor — payout executado |
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
| confirm-completion permitido | **confirm-completion bloqueado** (409) |

`operationalStatus` permanece `AWAITING_CONFIRMATION` durante a disputa. Apenas o eixo financeiro é bloqueado.

---

## Fluxo de Resolução Administrativa (Fase 6)

```
[DISPUTA ABERTA — POST /agreements/:id/dispute]
    │   financialStatus → DISPUTED
    │   FinancialGuarantee → FROZEN_DISPUTE
    │   Dispute.status = OPEN
    │   Release, refund e confirm-completion bloqueados
    ▼
[ADMIN ANALISA — GET /admin/disputes/:id]
    │   Admin lê acordo, participantes, garantia, eventos e mensagens
    │   Admin revisa evidências das partes
    ▼
    ┌──[LIBERAR AO RECEBEDOR — POST /admin/disputes/:id/resolve-release]
    │       Dispute → RESOLVED_FAVOR_COUNTERPART
    │       FinancialGuarantee → PAID_OUT (releasedAt preenchido)
    │       Agreement.financialStatus → PAID_OUT
    │       Agreement.operationalStatus → COMPLETED
    │       Payout simulado criado (metadata: simulated=true)
    │       Eventos: DISPUTE_RESOLVED, PAYOUT_INITIATED, PAYOUT_COMPLETED, COMPLETED
    │       TrustScore: +30 para recebedor, -20 para pagador
    │       AuditLog: ADMIN_DISPUTE_RESOLVED
    │       BlockchainRecord: PENDING
    │
    └──[REEMBOLSAR AO PAGADOR — POST /admin/disputes/:id/resolve-refund]
            Dispute → RESOLVED_FAVOR_CREATOR
            FinancialGuarantee → REFUNDED (revertedAt preenchido)
            Agreement.financialStatus → REFUNDED
            Agreement.operationalStatus → CANCELLED
            Refund simulado criado (metadata: simulated=true)
            Eventos: DISPUTE_RESOLVED, REFUND_INITIATED, REFUND_COMPLETED, CANCELLED
            TrustScore: +30 para pagador, -20 para recebedor
            AuditLog: ADMIN_DISPUTE_RESOLVED
            BlockchainRecord: PENDING
```

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
| `RESOLUTION` | Mensagem de resolução — gerada automaticamente ao resolver |

---

## Endpoints Administrativos (Fase 6)

**Auth:** Header `Authorization: Bearer <accessToken>` (JWT admin obtido em `POST /admin/auth/login`)

> Desde a Fase 17, a autenticação do painel admin usa `AdminUser` com JWT separado do JWT de usuário comum.

---

### `GET /api/v1/admin/disputes`

Lista disputas com dados suficientes para análise.

**Query params:**
| Param | Tipo | Descrição |
|---|---|---|
| `status` | `DisputeStatus` | Filtrar por status (ex: `OPEN`) |
| `page` | number | Default 1 |
| `limit` | number | Default 20, máx 100 |

**Response 200:**
```json
{
  "data": [
    {
      "id": "cm...",
      "status": "OPEN",
      "openedById": "cm...",
      "reason": "Serviço não entregue",
      "createdAt": "...",
      "openedBy": { "id": "cm...", "profile": { "fullName": "João" } },
      "agreement": {
        "id": "cm...",
        "title": "Serviço de design",
        "amount": "350.00",
        "financialStatus": "DISPUTED",
        "financialGuarantee": { "status": "FROZEN_DISPUTE", "amount": "350.00" },
        "payer": { "profile": { "fullName": "João Pagador" } },
        "receiver": { "profile": { "fullName": "Maria Recebedora" } }
      },
      "_count": { "messages": 3 },
      "messages": [{ "type": "EVIDENCE", "content": "...", "createdAt": "..." }]
    }
  ],
  "total": 2,
  "page": 1,
  "limit": 20
}
```

---

### `GET /api/v1/admin/disputes/:id`

Retorna detalhe completo da disputa para análise admin.

Inclui: acordo completo, participantes, garantia, paymentIntents/pixCharge/payouts/refunds, eventos, mensagens e resolução.

---

### `POST /api/v1/admin/disputes/:id/resolve-release`

Resolve a disputa liberando o valor ao recebedor.

**Auth:** `X-Admin-Token`

**Request:**
```json
{
  "reason": "string obrigatória (mín. 10 chars)",
  "adminNote": "string opcional"
}
```

**Regras:**
- Disputa deve estar `OPEN`
- Acordo deve ser `WITH_GUARANTEE`
- Garantia deve estar `FROZEN_DISPUTE`
- `financialStatus` deve ser `DISPUTED`
- Payout simulado é criado imediatamente (`status: COMPLETED`)
- Em produção, acionaria o parceiro financeiro/BaaS para o payout real

**Response 200:** disputa completa com acordo, garantia, eventos e mensagens atualizados

**Erros:**
- `400` — disputa não está OPEN / acordo sem garantia / garantia no estado incorreto
- `401` — token admin ausente ou inválido
- `404` — disputa não encontrada

---

### `POST /api/v1/admin/disputes/:id/resolve-refund`

Resolve a disputa reembolsando o valor ao pagador.

**Auth:** `X-Admin-Token`

**Request:**
```json
{
  "reason": "string obrigatória (mín. 10 chars)",
  "adminNote": "string opcional"
}
```

**Regras:**
- Mesmas pré-condições de `resolve-release`
- Refund simulado é criado imediatamente (`status: COMPLETED`)
- Em produção, acionaria o parceiro financeiro/BaaS para o reembolso real

**Response 200:** disputa completa atualizada

---

## Score de Confiança nas Disputas

| Momento | Evento | Delta | Quem |
|---|---|---|---|
| Abertura | `DISPUTE_OPENED` | 0 | Abridor |
| Resolução a favor | `DISPUTE_WON` | +30 | Quem ganhou |
| Resolução contra | `DISPUTE_LOST` | -20 (MVP) | Quem perdeu |

> Delta de -20 é conservador para o MVP. Em produção, usar -50 conforme documentado no schema.

---

## Nota sobre Pix/Fitbank

Em ambiente local (MVP), payout e refund são **simulados** — criados com `status=COMPLETED` e `metadata.simulated=true`. Nenhuma chamada a API externa é feita.

Em produção, a decisão administrativa acionaria o parceiro financeiro (Fitbank/BaaS) para executar a transferência real.

---

## Erros

| Código | Situação |
|---|---|
| 400 | Disputa em acordo SIMPLE (não WITH_GUARANTEE) |
| 400 | financialStatus diferente de FUNDS_HELD (abertura) |
| 400 | Disputa não está OPEN (resolução) |
| 400 | Garantia não está FROZEN_DISPUTE (resolução) |
| 400 | disputeRule = NOT_ALLOWED |
| 400 | reason ausente ou muito curta |
| 400 | Disputa encerrada (mensagem) |
| 401 | Token admin ausente ou inválido |
| 403 | Usuário não é participante |
| 404 | Disputa não encontrada |
| 409 | Já existe disputa para este acordo |
| 409 | Release/confirm-completion bloqueado por disputa aberta |

---

## Painel Admin Web (Fase 15)

A partir da Fase 15, o administrador pode operar disputas diretamente pelo painel web em `apps/admin`, sem precisar de Postman ou curl.

### Telas disponíveis

| Rota | Função |
|---|---|
| `/login` | Entrada no painel via X-Admin-Token |
| `/dashboard` | Estatísticas gerais + alerta de contestações abertas |
| `/disputes` | Lista com filtros por status + paginação |
| `/disputes/[id]` | Detalhe completo + modais de resolução |

### Fluxo de resolução pelo painel

1. Admin acessa `/disputes?status=OPEN`
2. Clica em "Analisar →" em uma contestação
3. Lê os 6 blocos: resumo, acordo, participantes, valor protegido, evidências, histórico
4. Clica em "Liberar ao recebedor" ou "Reembolsar pagador"
5. Modal abre: confirma a decisão com justificativa obrigatória (≥10 chars)
6. Painel chama o endpoint correto; contestação é encerrada; página recarrega com status atualizado

### Terminologia no painel

Os `DisputeMessage` do backend são exibidos como **Evidências e registros formais** — nunca como "chat" ou "mensagens".

### Como rodar o painel

```bash
cp apps/admin/.env.example apps/admin/.env.local
pnpm dev:admin   # http://localhost:3001
```

Ver [docs/admin.md](admin.md) para documentação completa.

---

## Contestação no App Mobile (Fase 11)

### O que é e o que não é

A contestação no Selo não é um chat. É um **registro formal para análise administrativa**.

| O que é | O que não é |
|---|---|
| Registro formal de ocorrência | Chat entre as partes |
| Evidências pontuais para análise | Conversa livre |
| Decisão administrativa | Negociação entre participantes |
| Histórico imutável | Troca de mensagens em tempo real |

### Interface no app

- **Botão "Contestar"**: aparece quando `FUNDS_HELD` e sem disputa aberta
- **Formulário de contestação**: campos `motivo` e `descrição objetiva`
- **Aviso obrigatório**: "Quando uma contestação é aberta, o valor fica travado até resolução administrativa."
- **Seção "Contestação"**: exibe status, abertura, motivo, descrição, histórico formal
- **"Adicionar evidência"**: campo de texto → enviado como `type: EVIDENCE` ao endpoint `/messages` (tratado como registro formal, não chat)
- **Card de resolução**: exibido quando disputa resolvida pelo admin

### Terminologia no app

| No código/backend | No app para o usuário |
|---|---|
| `messages` | evidências, histórico formal |
| `DisputeMessage` | evidência, registro, informação para análise |
| `OPEN` | Aberta — aguardando análise |
| `RESOLVED_FAVOR_COUNTERPART` | Contestação resolvida — valor liberado ao recebedor |
| `RESOLVED_FAVOR_CREATOR` | Contestação resolvida — valor reembolsado ao pagador |
