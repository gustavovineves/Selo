# Banco de Dados — Selo

Schema Prisma completo. Fonte da verdade: [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma).

---

## Visão Geral do Modelo de Dados

```
User ─────────────────────────────────────────────────────────
 │
 ├── UserProfile          (1:1)  perfil público
 ├── DeviceSession[]      (1:N)  sessões autenticadas por dispositivo
 ├── ReceivingKey[]       (1:N)  chaves Pix do usuário
 ├── ReceivingDestination[] (1:N) destinos salvos para pagar
 │
 ├── Agreement[] (creator)   ──── AgreementParticipant[]
 │   Agreement[] (payer)          AgreementEvent[]
 │   Agreement[] (receiver)       AgreementStatusHistory[]
 │                                FinancialGuarantee ─── PaymentIntent ─── PixCharge
 │                                                    └── Payout
 │                                                    └── Refund
 │                                Dispute ─── DisputeMessage[]
 │                                BlockchainRecord
 │
 ├── TrustScore (1:1) ──── TrustScoreEvent[]
 ├── Notification[]
 └── AuditLog[]

AdminUser (autenticação separada)
```

---

## Enums (34)

### Usuários e Identidade

| Enum | Valores |
|------|---------|
| `UserStatus` | ACTIVE, SUSPENDED, PENDING_VERIFICATION, DELETED |
| `KycStatus` | PENDING, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED |

### Chaves e Destinos

| Enum | Valores |
|------|---------|
| `ReceivingKeyType` | CPF, CNPJ, EMAIL, PHONE, RANDOM |
| `ReceivingKeyStatus` | ACTIVE, PENDING_VALIDATION, QUARANTINED, DELETED |
| `ReceivingDestinationType` | PIX_CPF, PIX_CNPJ, PIX_EMAIL, PIX_PHONE, PIX_RANDOM |
| `ReceivingDestinationStatus` | ACTIVE, DELETED |

### Acordos

| Enum | Valores |
|------|---------|
| `AgreementType` | SIMPLE, WITH_GUARANTEE |
| `AgreementMode` | STANDARD, REAL_TIME |
| `AgreementOperationalStatus` | DRAFT, AWAITING_ACCEPTANCE, ACTIVE, AWAITING_CONFIRMATION, COMPLETED, CANCELLED, EXPIRED |
| `AgreementFinancialStatus` | NONE, AWAITING_PAYMENT, FUNDS_HELD, AWAITING_PAYOUT, PAID_OUT, AWAITING_REFUND, REFUNDED, DISPUTED |
| `AgreementParticipantRole` | CREATOR, COUNTERPART, WITNESS, MEDIATOR |
| `AgreementParticipantStatus` | PENDING, ACCEPTED, REJECTED, WITHDRAWN |
| `AgreementEventType` | CREATED, SENT, ACCEPTED, REJECTED, FUNDS_LOCKED, COMPLETED, DISPUTE_OPENED, PAYOUT_COMPLETED, REFUND_COMPLETED, ... |
| `ConfirmationRule` | MANUAL, SINGLE_PARTY, AUTO_ON_DUE_DATE |
| `ReleaseRule` | MANUAL, AUTO_ON_CONFIRMATION, AUTO_ON_DUE_DATE |
| `RefundRule` | MANUAL, AUTO_ON_DISPUTE_WIN, AUTO_ON_EXPIRY |
| `DisputeRule` | ALLOWED, NOT_ALLOWED |

### Financeiro

| Enum | Valores |
|------|---------|
| `FinancialGuaranteeStatus` | AWAITING_PAYMENT, LOCKED, AWAITING_PAYOUT, PAID_OUT, AWAITING_REFUND, REFUNDED, FROZEN_DISPUTE |
| `PaymentProvider` | PIX, FITBANK |
| `PaymentMethod` | PIX, BANK_TRANSFER |
| `PaymentIntentStatus` | PENDING, AWAITING_PAYMENT, PAID, FAILED, CANCELLED, EXPIRED |
| `PixChargeStatus` | PENDING, ACTIVE, COMPLETED, EXPIRED, FAILED |
| `PayoutStatus` | PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED |
| `RefundStatus` | PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED |

### Disputas

| Enum | Valores |
|------|---------|
| `DisputeStatus` | OPEN, UNDER_REVIEW, AWAITING_EVIDENCE, RESOLVED_FAVOR_CREATOR, RESOLVED_FAVOR_COUNTERPART, WITHDRAWN, CLOSED |
| `DisputeMessageType` | TEXT, EVIDENCE, SYSTEM_NOTE, ADMIN_NOTE, RESOLUTION |

### Score de Confiança

| Enum | Valores |
|------|---------|
| `TrustScoreLevel` | VERY_LOW (0–199), LOW (200–399), MEDIUM (400–599), HIGH (600–799), VERY_HIGH (800–1000) |
| `TrustScoreEventType` | INITIAL_SCORE, AGREEMENT_COMPLETED, DISPUTE_OPENED, DISPUTE_WON, DISPUTE_LOST, KYC_VERIFIED, MANUAL_ADJUSTMENT |

### Blockchain, Notificações e Auditoria

| Enum | Valores |
|------|---------|
| `BlockchainNetwork` | ETHEREUM_TESTNET, POLYGON_TESTNET, ETHEREUM_MAINNET, POLYGON_MAINNET |
| `BlockchainRecordStatus` | PENDING, SUBMITTED, CONFIRMED, FAILED |
| `NotificationType` | AGREEMENT_*, PAYMENT_*, PAYOUT_*, DISPUTE_*, TRUST_SCORE_UPDATED, SYSTEM_ALERT |
| `NotificationStatus` | UNREAD, READ, DISMISSED |
| `AuditAction` | USER_*, AGREEMENT_*, PAYMENT_*, PAYOUT_*, REFUND_*, ADMIN_* |
| `AdminRole` | SUPER_ADMIN, ADMIN, SUPPORT, READ_ONLY |
| `AdminStatus` | ACTIVE, SUSPENDED, DELETED |

---

## Models (22)

### 1. User
Usuário autenticado do app.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | String (cuid) | PK |
| `email` | String unique | Email de login |
| `phone` | String? unique | Telefone |
| `document` | String? unique | CPF/CNPJ (só dígitos) |
| `documentType` | String? | "CPF" \| "CNPJ" |
| `passwordHash` | String | Bcrypt hash |
| `status` | UserStatus | Estado da conta |
| `kycStatus` | KycStatus | Estado do KYC |
| `emailVerifiedAt` | DateTime? | Timestamp da verificação |
| `phoneVerifiedAt` | DateTime? | — |
| `deletedAt` | DateTime? | Soft delete |

---

### 2. UserProfile
Perfil público do usuário.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `userId` | String unique | FK → User |
| `fullName` | String | Nome completo |
| `displayName` | String? | Apelido público |
| `avatarUrl` | String? | URL da foto |
| `bio` | String? | — |
| `birthDate` | DateTime? | Data de nascimento |

---

### 3. DeviceSession
Uma sessão autenticada por dispositivo. Suporta multi-device e logout granular.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `userId` | String | FK → User |
| `refreshToken` | String unique | Token para renovar JWT |
| `deviceName` | String? | Ex: "iPhone 15 Pro" |
| `deviceOs` | String? | Ex: "iOS 17.4" |
| `expiresAt` | DateTime | Expiração do refresh token |
| `revokedAt` | DateTime? | Revogação manual |

---

### 4. ReceivingKey
Chave Pix registrada pelo usuário para receber pagamentos.

**Regra:** `normalizedKey` é globalmente único — chaves excluídas não podem ser reutilizadas por nenhum usuário no MVP.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `userId` | String | FK → User |
| `type` | ReceivingKeyType | Tipo da chave |
| `key` | String | Chave no formato original |
| `normalizedKey` | String unique | Normalizada (lowercase/dígitos) |
| `status` | ReceivingKeyStatus | Estado da chave |
| `isDefault` | Boolean | Chave padrão do usuário |
| `quarantinedUntil` | DateTime? | Bloqueada para evitar fraude |
| `deletedAt` | DateTime? | Soft delete |

---

### 5. ReceivingDestination
Destino de pagamento salvo para conveniência (favoritos).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `userId` | String | FK → User (quem salvou) |
| `nickname` | String | Apelido do destinatário |
| `type` | ReceivingDestinationType | Tipo da chave Pix |
| `keyValue` | String | Valor da chave |
| `bankName` | String? | Nome do banco |
| `bankIspb` | String? | Código ISPB |
| `isDefault` | Boolean | Destino padrão |

---

### 6. Agreement
Núcleo do produto. Dois eixos de status independentes:

- **`operationalStatus`** — ciclo de vida: `DRAFT → AWAITING_ACCEPTANCE → ACTIVE → AWAITING_CONFIRMATION → COMPLETED`
- **`financialStatus`** — estado do dinheiro: `NONE → AWAITING_PAYMENT → FUNDS_HELD → AWAITING_PAYOUT → PAID_OUT`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `type` | AgreementType | SIMPLE ou WITH_GUARANTEE |
| `mode` | AgreementMode | STANDARD ou REAL_TIME |
| `title` | String | Título do combinado |
| `generatedSummary` | String? | Resumo gerado pelo sistema |
| `amount` | Decimal? | Valor (para WITH_GUARANTEE) |
| `dueDate` | DateTime? | Prazo de cumprimento |
| `acceptanceExpiresAt` | DateTime? | Prazo para aceitar |
| `confirmationDeadlineAt` | DateTime? | Prazo para confirmar conclusão |
| `createdById` | String | FK → User (criador) |
| `payerId` | String? | FK → User (pagador da garantia) |
| `receiverId` | String? | FK → User (recebedor do payout) |
| `receiverKeySnapshot` | Json? | Chave do recebedor no momento |
| `receiverDestinationSnapshot` | Json? | Destino do recebedor no momento |
| `confirmationRule` | ConfirmationRule | Como confirmar conclusão |
| `releaseRule` | ReleaseRule | Como liberar garantia |
| `refundRule` | RefundRule | Como devolver garantia |
| `disputeRule` | DisputeRule | Se disputa é permitida |
| `proofHash` | String? | SHA256 dos termos |

---

### 7. AgreementParticipant
Participantes formais do acordo com papéis e status de aceite.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `agreementId` | String | FK → Agreement |
| `userId` | String? | FK → User (nulo = não tem conta) |
| `email` | String? | Email de participante sem conta |
| `role` | AgreementParticipantRole | CREATOR, COUNTERPART, WITNESS... |
| `status` | AgreementParticipantStatus | PENDING, ACCEPTED, REJECTED... |

---

### 8. AgreementEvent
Linha do tempo imutável de um acordo. Nunca atualizado, apenas inserido.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `agreementId` | String | FK → Agreement |
| `actorId` | String? | Quem realizou a ação |
| `actorType` | String? | "USER" \| "SYSTEM" \| "ADMIN" |
| `type` | AgreementEventType | Tipo do evento |
| `payload` | Json? | Dados adicionais do evento |

---

### 9. AgreementStatusHistory
Histórico auditável de cada transição de status (operacional e financeiro).

---

### 10. FinancialGuarantee
Existe apenas para acordos `WITH_GUARANTEE`. Representa os fundos travados.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `agreementId` | String unique | FK → Agreement (1:1) |
| `amount` | Decimal | Valor travado |
| `status` | FinancialGuaranteeStatus | Estado dos fundos |
| `lockedAt` | DateTime? | Quando o dinheiro foi travado |
| `releasedAt` | DateTime? | Quando foi liberado ao recebedor |
| `revertedAt` | DateTime? | Quando foi devolvido ao pagador |

---

### 11. PaymentIntent
Intenção de pagamento. Representa a solicitação de cobrança ao pagador.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `agreementId` | String? | FK → Agreement |
| `financialGuaranteeId` | String? unique | FK → FinancialGuarantee |
| `payerId` | String | FK → User (quem paga) |
| `amount` | Decimal | Valor a cobrar |
| `provider` | PaymentProvider | PIX, FITBANK |
| `status` | PaymentIntentStatus | Estado do pagamento |
| `idempotencyKey` | String unique | Evita duplo processamento |
| `paidAt` | DateTime? | Quando confirmado |

---

### 12. PixCharge
Cobrança Pix específica vinculada a um PaymentIntent. Contém o QR Code e dados da liquidação.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `paymentIntentId` | String unique | FK → PaymentIntent (1:1) |
| `receivingKeyId` | String? | FK → ReceivingKey |
| `txid` | String? unique | ID da cobrança no PSP |
| `endToEndId` | String? unique | E2eId da liquidação |
| `qrCode` | String? | Copia-e-cola EMV |
| `qrCodeBase64` | String? | Imagem do QR Code |
| `rawRequest` | Json? | Payload enviado ao PSP |
| `rawResponse` | Json? | Resposta bruta do PSP |

---

### 13. Payout
Liberação de dinheiro ao recebedor após conclusão do acordo.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `agreementId` | String | FK → Agreement |
| `financialGuaranteeId` | String? unique | FK → FinancialGuarantee |
| `recipientId` | String | FK → User (recebedor) |
| `destinationId` | String? | FK → ReceivingDestination |
| `destinationSnapshot` | Json? | Snapshot do destino no momento |
| `idempotencyKey` | String unique | Evita duplo processamento |
| `status` | PayoutStatus | Estado do repasse |

---

### 14. Refund
Devolução de dinheiro ao pagador. Pode ser gerada por disputa, expiração ou cancelamento.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `paymentIntentId` | String | FK → PaymentIntent |
| `financialGuaranteeId` | String? unique | FK → FinancialGuarantee |
| `requestedById` | String | FK → User (quem pediu) |
| `recipientId` | String | FK → User (quem recebe o estorno) |
| `idempotencyKey` | String unique | Evita duplo processamento |
| `status` | RefundStatus | Estado do reembolso |

---

### 15. Dispute
Trava o acordo e abre processo de mediação. Um acordo pode ter no máximo uma disputa.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `agreementId` | String unique | FK → Agreement (1:1) |
| `openedById` | String | FK → User (quem abriu) |
| `reason` | String | Motivo resumido |
| `description` | String | Descrição detalhada |
| `status` | DisputeStatus | Estado da mediação |
| `resolvedById` | String? | ID do User ou AdminUser que resolveu |

---

### 16. DisputeMessage
Mensagens trocadas durante a mediação de uma disputa.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `disputeId` | String | FK → Dispute |
| `senderId` | String? | ID do remetente |
| `senderType` | String | "USER" \| "ADMIN" \| "SYSTEM" |
| `type` | DisputeMessageType | TEXT, EVIDENCE, ADMIN_NOTE... |
| `attachments` | Json? | Lista de URLs de evidências |

---

### 17. TrustScore
Score de confiança agregado por usuário. Range 0–1000, default 500.

**Fórmula base (Fase 3):**
- `+20` por acordo completado
- `-30` por acordo cancelado pelo próprio usuário
- `-50` por disputa aberta contra o usuário
- `-100` por disputa perdida
- `+50` por KYC aprovado

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `userId` | String unique | FK → User (1:1) |
| `score` | Int | 0–1000 |
| `level` | TrustScoreLevel | Nível calculado |
| `totalAgreements` | Int | Total de acordos participados |
| `completedAgreements` | Int | Acordos concluídos |
| `disputesWon/Lost` | Int | Histórico de disputas |

---

### 18. TrustScoreEvent
Registro imutável de cada variação no score. Permite auditar e recalcular o histórico.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `userId` | String | FK → User |
| `trustScoreId` | String | FK → TrustScore |
| `type` | TrustScoreEventType | Tipo do evento |
| `scoreBefore` | Int | Score antes |
| `scoreDelta` | Int | Variação (positivo ou negativo) |
| `scoreAfter` | Int | Score resultante |
| `referenceId` | String? | ID do acordo/disputa relacionado |

---

### 19. BlockchainRecord
Stub para Fase 4. Armazena o hash SHA256 dos termos e o txHash após submissão à chain.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `agreementId` | String unique | FK → Agreement (1:1) |
| `network` | BlockchainNetwork | Rede alvo |
| `txHash` | String? | Hash da transação na chain |
| `proofHash` | String? | SHA256 dos termos do acordo |
| `proofData` | Json? | Dados que geraram o hash |
| `status` | BlockchainRecordStatus | PENDING → SUBMITTED → CONFIRMED |
| `retryCount` | Int | Tentativas de submissão |

---

### 20. Notification
Notificações internas e push para o app mobile.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `userId` | String | FK → User |
| `type` | NotificationType | Tipo da notificação |
| `status` | NotificationStatus | UNREAD, READ, DISMISSED |
| `data` | Json? | Dados para deep link no app |
| `sentAt` | DateTime? | Quando foi enviada ao dispositivo |

---

### 21. AuditLog
Log imutável de ações críticas. `adminUserId` é string sem FK explícita para desacoplar ciclo de vida.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `userId` | String? | FK → User (quando originado pelo app) |
| `adminUserId` | String? | ID do AdminUser (quando originado pelo admin) |
| `action` | AuditAction | Tipo da ação |
| `resource` | String | Entidade afetada (ex: "Agreement") |
| `resourceId` | String? | ID da entidade |
| `oldData` | Json? | Estado anterior |
| `newData` | Json? | Estado novo |
| `requestId` | String? | Correlation ID da requisição |

---

### 22. AdminUser
Usuários do painel administrativo. Autenticação completamente separada dos usuários do app.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `email` | String unique | Login do admin |
| `role` | AdminRole | SUPER_ADMIN, ADMIN, SUPPORT, READ_ONLY |
| `status` | AdminStatus | Estado da conta |
| `deletedAt` | DateTime? | Soft delete |

---

## Decisões de Design

### Dois status no Agreement
`operationalStatus` e `financialStatus` são eixos independentes. Um acordo pode estar `ACTIVE` operacionalmente mas `DISPUTED` financeiramente sem contradição.

### normalizedKey único globalmente
`ReceivingKey.normalizedKey` tem `@unique` global. Chaves excluídas permanecem no banco e bloqueiam registro da mesma chave por qualquer usuário no MVP. O campo `quarantinedUntil` permite bloqueio temporário pós-exclusão.

### Snapshots em JSON
`receiverKeySnapshot` e `receiverDestinationSnapshot` no Agreement capturam o estado do destino no momento da criação. Isso protege contra alterações futuras na chave/destino do recebedor.

### PaymentIntent como entidade central
`Payment` foi substituído por `PaymentIntent` (a intenção) + `PixCharge` (os detalhes Pix) + `Payout` (repasse) + `Refund` (estorno). Isso separa responsabilidades e facilita suporte a múltiplos providers futuros.

### idempotencyKey em PaymentIntent, Payout e Refund
Garante que retries não causem duplo processamento. Deve ser gerado pelo backend antes de chamar qualquer PSP.

### AuditLog sem FK para AdminUser
`adminUserId` é `String?` sem `@relation`. Isso evita cascade acidental se um AdminUser for deletado e garante que logs históricos não sejam afetados.

---

## Comandos

```bash
# Aplicar migrations em desenvolvimento
pnpm db:migrate

# Gerar Prisma Client após mudanças
pnpm db:generate

# Visualizar dados
pnpm db:studio

# Validar schema sem migrar
cd apps/api && npx prisma validate

# Formatar schema
cd apps/api && npx prisma format
```
