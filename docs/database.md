# Banco de Dados — Selo

Schema Prisma completo. Fonte da verdade: [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma).

---

## Visão Geral do Modelo de Dados

```
User ─────────────────────────────────────────────────────────────────────
 │
 ├── UserProfile            (1:1)  perfil público
 ├── DeviceSession[]        (1:N)  sessões por dispositivo (multi-device)
 ├── ReceivingKey[]         (1:N)  próprias chaves Pix do usuário
 ├── ReceivingDestination[] (1:N)  favoritos para enviar dinheiro
 │
 ├── Agreement[] (creator / payer / receiver)
 │    ├── AgreementParticipant[]
 │    ├── AgreementEvent[]          (linha do tempo imutável)
 │    ├── AgreementStatusHistory[]  (histórico de mudanças de status)
 │    ├── FinancialGuarantee (1:1, WITH_GUARANTEE only)
 │    │    ├── PaymentIntent[] (1:N — permite retry)
 │    │    │    └── PixCharge  (1:1)
 │    │    ├── Payout[]        (1:N — permite retry)
 │    │    └── Refund[]        (1:N — permite retry)
 │    ├── Dispute (1:1)
 │    │    └── DisputeMessage[]
 │    └── BlockchainRecord (1:1, Fase 4)
 │
 ├── TrustScore (1:1)
 │    └── TrustScoreEvent[]   (imutável, permite recalcular histórico)
 ├── Notification[]
 └── AuditLog[]

AdminUser (autenticação completamente separada — Fase 4)
```

---

## Enums (36)

### Usuários e Identidade

| Enum | Valores |
|------|---------|
| `UserStatus` | ACTIVE, SUSPENDED, PENDING_VERIFICATION, DELETED |
| `KycStatus` | PENDING, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED |
| `DocumentType` | CPF, CNPJ, PASSPORT, OTHER |
| `ActorType` | USER, ADMIN, SYSTEM — identifica tipo de ator em eventos, histórico de status e resoluções |

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
| `document` | String? unique | Número do documento (só dígitos/código) |
| `documentType` | DocumentType? | Tipo: CPF, CNPJ, PASSPORT, OTHER |
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
Chave Pix registrada pelo usuário para **receber** pagamentos no Selo.
Separada de `ReceivingDestination`, que são chaves de **outros** salvas pelo usuário.

**Regras:**
- `normalizedKey` é globalmente único — chaves excluídas não podem ser reutilizadas no MVP.
- `isDefault = true` para no máximo uma chave por usuário — enforçado pelo serviço (Prisma não suporta partial unique index).
- `quarantinedUntil`: bloqueia uso da chave pós-exclusão por um período para evitar fraude.

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
Chave Pix de **outros usuários** salva pelo usuário como favorito para envio.
Completamente separada de `ReceivingKey` (que são as chaves próprias do usuário).

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

- **`operationalStatus`**: `DRAFT → AWAITING_ACCEPTANCE → ACTIVE → AWAITING_CONFIRMATION → COMPLETED`
- **`financialStatus`**: `NONE → AWAITING_PAYMENT → FUNDS_HELD → AWAITING_PAYOUT → PAID_OUT`

**Hashes distintos:**
- `contentHash`: SHA256 dos **termos do acordo**, calculado localmente pelo backend no momento da criação. Não depende de blockchain.
- `BlockchainRecord.proofHash`: hash enviado/registrado na blockchain na Fase 4. Pode ser igual ou derivado do `contentHash`.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `type` | AgreementType | SIMPLE ou WITH_GUARANTEE |
| `mode` | AgreementMode | STANDARD ou REAL_TIME |
| `title` | String | Título do combinado |
| `generatedSummary` | String? | Resumo gerado pelo sistema |
| `amount` | Decimal? | Valor (obrigatório para WITH_GUARANTEE, enforçado pelo serviço) |
| `dueDate` | DateTime? | Prazo de cumprimento |
| `acceptanceExpiresAt` | DateTime? | Prazo para aceitar o convite |
| `confirmationDeadlineAt` | DateTime? | Prazo para confirmar conclusão |
| `createdById` | String | FK → User (criador) |
| `payerId` | String? | FK → User (pagador da garantia, WITH_GUARANTEE) |
| `receiverId` | String? | FK → User (recebedor do payout, WITH_GUARANTEE) |
| `receiverKeySnapshot` | Json? | Snapshot da chave do recebedor no momento da criação |
| `receiverDestinationSnapshot` | Json? | Snapshot do destino do recebedor no momento da criação |
| `confirmationRule` | ConfirmationRule | Como confirmar conclusão |
| `releaseRule` | ReleaseRule | Como liberar garantia |
| `refundRule` | RefundRule | Como devolver garantia |
| `disputeRule` | DisputeRule | Se disputa é permitida |
| `contentHash` | String? | SHA256 local dos termos (distinto de BlockchainRecord.proofHash) |

---

### 7. AgreementParticipant
Participantes formais do acordo com papéis e status de aceite.

**Unicidade:**
- `@@unique([agreementId, userId])`: usuário registrado não pode participar duas vezes.
- `@@unique([agreementId, email])`: email não registrado não pode ser convidado duas vezes.
- Validação de duplicidade para registros com `userId = null AND email = null` deve ser enforçada pelo serviço.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `agreementId` | String | FK → Agreement |
| `userId` | String? | FK → User (null = não tem conta) |
| `email` | String? | Email do participante sem conta |
| `role` | AgreementParticipantRole | CREATOR, COUNTERPART, WITNESS, MEDIATOR |
| `status` | AgreementParticipantStatus | PENDING, ACCEPTED, REJECTED, WITHDRAWN |

---

### 8. AgreementEvent
Linha do tempo imutável de um acordo. Nunca atualizado, apenas inserido.
`actorType` identifica se a ação veio de um usuário, admin ou sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `agreementId` | String | FK → Agreement |
| `actorId` | String? | ID de quem realizou a ação |
| `actorType` | ActorType? | USER, ADMIN ou SYSTEM |
| `type` | AgreementEventType | Tipo do evento |
| `payload` | Json? | Dados adicionais do evento |

---

### 9. AgreementStatusHistory
Histórico auditável de cada transição de status (operacional e financeiro).
`actorType` identifica a origem da mudança para auditabilidade completa.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `agreementId` | String | FK → Agreement |
| `actorId` | String? | ID de quem causou a mudança |
| `actorType` | ActorType? | USER, ADMIN ou SYSTEM |
| `previousOperational` | AgreementOperationalStatus? | Status operacional anterior |
| `newOperational` | AgreementOperationalStatus? | Status operacional novo |
| `previousFinancial` | AgreementFinancialStatus? | Status financeiro anterior |
| `newFinancial` | AgreementFinancialStatus? | Status financeiro novo |

---

### 10. FinancialGuarantee
Existe apenas para acordos `WITH_GUARANTEE`. Representa os fundos travados.

**Relações 1:N com PaymentIntent, Payout e Refund:**
Uma garantia pode ter múltiplas tentativas de cada operação (retry flow). O controle de "operação ativa" é feito por `status + idempotencyKey` na camada de serviço — não por constraint de banco.

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
Intenção de pagamento. Uma garantia pode ter múltiplos PaymentIntents (tentativas).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `agreementId` | String? | FK → Agreement |
| `financialGuaranteeId` | String? | FK → FinancialGuarantee (sem @unique — permite retry) |
| `payerId` | String | FK → User (quem paga) |
| `amount` | Decimal | Valor a cobrar |
| `provider` | PaymentProvider | PIX, FITBANK |
| `status` | PaymentIntentStatus | Estado do pagamento |
| `idempotencyKey` | String unique | Evita duplo processamento em retries |
| `paidAt` | DateTime? | Quando confirmado |

---

### 12. PixCharge
Cobrança Pix específica vinculada a um PaymentIntent (1:1). Contém QR Code e dados da liquidação.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `paymentIntentId` | String unique | FK → PaymentIntent (1:1) |
| `receivingKeyId` | String? | FK → ReceivingKey (nullable: chave pode ser excluída depois) |
| `txid` | String? unique | ID da cobrança no PSP |
| `endToEndId` | String? unique | E2eId da liquidação Pix |
| `qrCode` | String? | Copia-e-cola EMV |
| `qrCodeBase64` | String? | Imagem do QR Code |
| `rawRequest` | Json? | Payload enviado ao PSP |
| `rawResponse` | Json? | Resposta bruta do PSP |

---

### 13. Payout
Liberação de dinheiro ao recebedor. Uma garantia pode ter múltiplos Payouts (tentativas).

**Semântica de destino (explícita para o recebedor):**
- `recipientKeyId`: FK para `ReceivingKey` do recebedor registrada no Selo.
- `recipientDestinationId`: FK para `ReceivingDestination` salva pelo usuário.
- `destinationSnapshot`: snapshot exato do destino usado — sempre preenchido, independente dos FKs.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `agreementId` | String | FK → Agreement |
| `financialGuaranteeId` | String? | FK → FinancialGuarantee (sem @unique — permite retry) |
| `recipientId` | String | FK → User (recebedor) |
| `recipientKeyId` | String? | FK → ReceivingKey do recebedor no Selo |
| `recipientDestinationId` | String? | FK → ReceivingDestination (favorito) |
| `destinationSnapshot` | Json? | Snapshot do destino no momento do payout |
| `idempotencyKey` | String unique | Evita duplo processamento |
| `status` | PayoutStatus | Estado do repasse |

---

### 14. Refund
Devolução de dinheiro ao pagador. Uma garantia pode ter múltiplos Refunds (tentativas).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `paymentIntentId` | String | FK → PaymentIntent |
| `financialGuaranteeId` | String? | FK → FinancialGuarantee (sem @unique — permite retry) |
| `requestedById` | String | FK → User (quem solicitou) |
| `recipientId` | String | FK → User (quem recebe o estorno) |
| `idempotencyKey` | String unique | Evita duplo processamento |
| `status` | RefundStatus | Estado do reembolso |

---

### 15. Dispute
Trava o acordo e abre processo de mediação. Um acordo pode ter no máximo uma disputa.

**Campo `resolvedByType`:** identifica quem resolveu (USER, ADMIN ou SYSTEM), desambiguando o `resolvedById` que pode apontar para User ou AdminUser.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `agreementId` | String unique | FK → Agreement (1:1) |
| `openedById` | String | FK → User (quem abriu) |
| `reason` | String | Motivo resumido |
| `description` | String | Descrição detalhada |
| `status` | DisputeStatus | Estado da mediação |
| `resolvedById` | String? | ID do User ou AdminUser que resolveu |
| `resolvedByType` | ActorType? | USER, ADMIN ou SYSTEM — desambigua resolvedById |

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

**Distinção importante de hashes:**
- `proofHash` (este model): hash **registrado/enviado à blockchain**. Calculado pela blockchain service na Fase 4.
- `Agreement.contentHash`: hash **local dos termos**, calculado pelo backend no momento da criação do acordo, independente de blockchain.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `agreementId` | String unique | FK → Agreement (1:1) |
| `network` | BlockchainNetwork | Rede alvo |
| `txHash` | String? | Hash da transação na chain |
| `proofHash` | String? | Hash registrado na blockchain |
| `proofData` | Json? | Dados que geraram o proofHash |
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
Log imutável de ações críticas. `adminUserId` é string sem FK explícita para desacoplar ciclo de vida do AdminUser.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `userId` | String? | FK → User (quando originado pelo app) |
| `adminUserId` | String? | ID do AdminUser sem FK (quando pelo admin) |
| `action` | AuditAction | Tipo da ação |
| `resource` | String | Entidade afetada (ex: "Agreement") |
| `resourceId` | String? | ID da entidade |
| `oldData` | Json? | Estado anterior |
| `newData` | Json? | Estado novo |
| `requestId` | String? | Correlation ID da requisição |

---

### 22. AdminUser
Usuários do painel administrativo. Autenticação completamente separada dos usuários do app. (Fase 4)

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

### ReceivingKey vs ReceivingDestination
- `ReceivingKey`: chave Pix **própria** do usuário (para receber dinheiro no Selo).
- `ReceivingDestination`: chave Pix de **outras pessoas**, salva pelo usuário como favorito (para enviar dinheiro).
- São entidades distintas com propósitos opostos.

### Snapshots em JSON
`receiverKeySnapshot` e `receiverDestinationSnapshot` no Agreement capturam o estado do destino no momento da criação. Isso protege contra alterações futuras na chave/destino do recebedor.

### contentHash vs proofHash
- `Agreement.contentHash`: SHA256 dos termos do acordo, calculado localmente pelo backend no momento da criação. Não depende de blockchain.
- `BlockchainRecord.proofHash`: hash registrado/enviado à blockchain. Calculado pela blockchain service na Fase 4. Pode ser idêntico ou derivado do `contentHash`.

### FinancialGuarantee com relações 1:N (sem @unique nos FKs)
`PaymentIntent`, `Payout` e `Refund` podem ter múltiplos registros por `FinancialGuarantee`. Isso suporta o **retry flow**: se um pagamento expira, um novo `PaymentIntent` pode ser criado para a mesma garantia. O controle de "operação ativa" é feito por `status + idempotencyKey` na camada de serviço.

### idempotencyKey em PaymentIntent, Payout e Refund
Garante que retries não causem duplo processamento. Deve ser gerado pelo backend antes de chamar qualquer PSP. Geração sugerida: `UUID v4` ou `ULID`.

### AgreementParticipant com unicidade dupla
- `@@unique([agreementId, userId])`: impede usuário registrado duplicado.
- `@@unique([agreementId, email])`: impede email convidado duplicado.
- PostgreSQL não considera `NULL == NULL` em constraints UNIQUE, então registros com ambos nulos precisam de validação no serviço.

### ActorType em AgreementEvent, AgreementStatusHistory e Dispute
O enum `ActorType { USER ADMIN SYSTEM }` identifica a origem de cada ação. Essencial para auditabilidade e para resolver ambiguidades (ex: `resolvedById` pode ser ID de User ou AdminUser — `resolvedByType` desambigua).

### AuditLog sem FK para AdminUser
`adminUserId` é `String?` sem `@relation`. Isso evita cascade acidental se um AdminUser for deletado e garante que logs históricos não sejam afetados.

### Payout com semântica explícita de destino
- `recipientKeyId`: FK para `ReceivingKey` do recebedor cadastrada no Selo.
- `recipientDestinationId`: FK para `ReceivingDestination` (favorito salvo pelo pagador).
- `destinationSnapshot`: snapshot exato do destino no momento do payout — sempre preenchido.
- O `destinationSnapshot` é o campo operacional; os FKs são de rastreabilidade.

---

## Comandos

```bash
# Aplicar migrations em desenvolvimento
pnpm db:migrate

# Gerar Prisma Client após mudanças no schema
pnpm db:generate

# Visualizar e editar dados
pnpm db:studio

# Formatar e validar estrutura do schema
cd apps/api && npx prisma format
```
