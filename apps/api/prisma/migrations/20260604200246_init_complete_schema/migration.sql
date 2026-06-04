-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'DELETED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CPF', 'CNPJ', 'PASSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReceivingKeyType" AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM');

-- CreateEnum
CREATE TYPE "ReceivingKeyStatus" AS ENUM ('ACTIVE', 'PENDING_VALIDATION', 'QUARANTINED', 'DELETED');

-- CreateEnum
CREATE TYPE "ReceivingDestinationType" AS ENUM ('PIX_CPF', 'PIX_CNPJ', 'PIX_EMAIL', 'PIX_PHONE', 'PIX_RANDOM');

-- CreateEnum
CREATE TYPE "ReceivingDestinationStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "AgreementType" AS ENUM ('SIMPLE', 'WITH_GUARANTEE');

-- CreateEnum
CREATE TYPE "AgreementMode" AS ENUM ('STANDARD', 'REAL_TIME');

-- CreateEnum
CREATE TYPE "AgreementOperationalStatus" AS ENUM ('DRAFT', 'AWAITING_ACCEPTANCE', 'ACTIVE', 'AWAITING_CONFIRMATION', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AgreementFinancialStatus" AS ENUM ('NONE', 'AWAITING_PAYMENT', 'FUNDS_HELD', 'AWAITING_PAYOUT', 'PAID_OUT', 'AWAITING_REFUND', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "AgreementParticipantRole" AS ENUM ('CREATOR', 'COUNTERPART', 'WITNESS', 'MEDIATOR');

-- CreateEnum
CREATE TYPE "AgreementParticipantStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AgreementEventType" AS ENUM ('CREATED', 'SENT', 'ACCEPTANCE_REQUESTED', 'ACCEPTED', 'REJECTED', 'ACTIVATED', 'PAYMENT_REQUESTED', 'PAYMENT_RECEIVED', 'FUNDS_LOCKED', 'CONFIRMATION_REQUESTED', 'CONFIRMED', 'COMPLETED', 'DISPUTE_OPENED', 'DISPUTE_RESOLVED', 'CANCELLED', 'EXPIRED', 'BLOCKCHAIN_SUBMITTED', 'BLOCKCHAIN_CONFIRMED', 'PAYOUT_INITIATED', 'PAYOUT_COMPLETED', 'REFUND_INITIATED', 'REFUND_COMPLETED');

-- CreateEnum
CREATE TYPE "ConfirmationRule" AS ENUM ('MANUAL', 'SINGLE_PARTY', 'AUTO_ON_DUE_DATE');

-- CreateEnum
CREATE TYPE "ReleaseRule" AS ENUM ('MANUAL', 'AUTO_ON_CONFIRMATION', 'AUTO_ON_DUE_DATE');

-- CreateEnum
CREATE TYPE "RefundRule" AS ENUM ('MANUAL', 'AUTO_ON_DISPUTE_WIN', 'AUTO_ON_EXPIRY');

-- CreateEnum
CREATE TYPE "DisputeRule" AS ENUM ('ALLOWED', 'NOT_ALLOWED');

-- CreateEnum
CREATE TYPE "FinancialGuaranteeStatus" AS ENUM ('AWAITING_PAYMENT', 'LOCKED', 'AWAITING_PAYOUT', 'PAID_OUT', 'AWAITING_REFUND', 'REFUNDED', 'FROZEN_DISPUTE');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PIX', 'FITBANK');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('PENDING', 'AWAITING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PixChargeStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'AWAITING_EVIDENCE', 'RESOLVED_FAVOR_CREATOR', 'RESOLVED_FAVOR_COUNTERPART', 'WITHDRAWN', 'CLOSED');

-- CreateEnum
CREATE TYPE "DisputeMessageType" AS ENUM ('TEXT', 'EVIDENCE', 'SYSTEM_NOTE', 'ADMIN_NOTE', 'RESOLUTION');

-- CreateEnum
CREATE TYPE "TrustScoreLevel" AS ENUM ('VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "TrustScoreEventType" AS ENUM ('INITIAL_SCORE', 'AGREEMENT_COMPLETED', 'AGREEMENT_CANCELLED_BY_USER', 'DISPUTE_OPENED', 'DISPUTE_WON', 'DISPUTE_LOST', 'KYC_VERIFIED', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "BlockchainNetwork" AS ENUM ('ETHEREUM_TESTNET', 'POLYGON_TESTNET', 'ETHEREUM_MAINNET', 'POLYGON_MAINNET');

-- CreateEnum
CREATE TYPE "BlockchainRecordStatus" AS ENUM ('PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('AGREEMENT_RECEIVED', 'AGREEMENT_ACCEPTED', 'AGREEMENT_REJECTED', 'AGREEMENT_COMPLETED', 'AGREEMENT_CANCELLED', 'AGREEMENT_EXPIRED', 'PAYMENT_RECEIVED', 'FUNDS_LOCKED', 'PAYOUT_SENT', 'REFUND_PROCESSED', 'DISPUTE_OPENED', 'DISPUTE_RESOLVED', 'TRUST_SCORE_UPDATED', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_CREATED', 'USER_UPDATED', 'USER_SUSPENDED', 'USER_DELETED', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGED', 'AGREEMENT_CREATED', 'AGREEMENT_SENT', 'AGREEMENT_ACCEPTED', 'AGREEMENT_REJECTED', 'AGREEMENT_COMPLETED', 'AGREEMENT_CANCELLED', 'AGREEMENT_DISPUTED', 'PAYMENT_INITIATED', 'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'PAYOUT_INITIATED', 'PAYOUT_COMPLETED', 'REFUND_INITIATED', 'REFUND_COMPLETED', 'ADMIN_ACTION', 'ADMIN_DISPUTE_RESOLVED', 'ADMIN_USER_SUSPENDED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "document" TEXT,
    "documentType" "DocumentType",
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'BR',
    "birthDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceOs" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receiving_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReceivingKeyType" NOT NULL,
    "key" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "status" "ReceivingKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "quarantinedUntil" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receiving_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receiving_destinations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "type" "ReceivingDestinationType" NOT NULL,
    "keyValue" TEXT NOT NULL,
    "status" "ReceivingDestinationStatus" NOT NULL DEFAULT 'ACTIVE',
    "bankName" TEXT,
    "bankIspb" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receiving_destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreements" (
    "id" TEXT NOT NULL,
    "type" "AgreementType" NOT NULL,
    "mode" "AgreementMode" NOT NULL DEFAULT 'STANDARD',
    "operationalStatus" "AgreementOperationalStatus" NOT NULL DEFAULT 'DRAFT',
    "financialStatus" "AgreementFinancialStatus" NOT NULL DEFAULT 'NONE',
    "title" TEXT NOT NULL,
    "generatedSummary" TEXT,
    "description" TEXT,
    "amount" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "dueDate" TIMESTAMP(3),
    "acceptanceExpiresAt" TIMESTAMP(3),
    "confirmationDeadlineAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "payerId" TEXT,
    "receiverId" TEXT,
    "receiverKeySnapshot" JSONB,
    "receiverDestinationSnapshot" JSONB,
    "confirmationRule" "ConfirmationRule" NOT NULL DEFAULT 'MANUAL',
    "releaseRule" "ReleaseRule" NOT NULL DEFAULT 'MANUAL',
    "refundRule" "RefundRule" NOT NULL DEFAULT 'MANUAL',
    "disputeRule" "DisputeRule" NOT NULL DEFAULT 'ALLOWED',
    "contentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "disputedAt" TIMESTAMP(3),

    CONSTRAINT "agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreement_participants" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "role" "AgreementParticipantRole" NOT NULL,
    "status" "AgreementParticipantStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agreement_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreement_events" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" "ActorType",
    "type" "AgreementEventType" NOT NULL,
    "payload" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agreement_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreement_status_history" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" "ActorType",
    "previousOperational" "AgreementOperationalStatus",
    "newOperational" "AgreementOperationalStatus",
    "previousFinancial" "AgreementFinancialStatus",
    "newFinancial" "AgreementFinancialStatus",
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agreement_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_guarantees" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "FinancialGuaranteeStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "lockedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "revertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_guarantees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intents" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT,
    "financialGuaranteeId" TEXT,
    "payerId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'PIX',
    "method" "PaymentMethod" NOT NULL DEFAULT 'PIX',
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "externalId" TEXT,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pix_charges" (
    "id" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "receivingKeyId" TEXT,
    "txid" TEXT,
    "endToEndId" TEXT,
    "pixKey" TEXT NOT NULL,
    "pixKeyType" "ReceivingKeyType" NOT NULL,
    "qrCode" TEXT,
    "qrCodeBase64" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "PixChargeStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "rawRequest" JSONB,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pix_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "financialGuaranteeId" TEXT,
    "recipientId" TEXT NOT NULL,
    "recipientKeyId" TEXT,
    "recipientDestinationId" TEXT,
    "destinationSnapshot" JSONB,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'PIX',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "externalId" TEXT,
    "metadata" JSONB,
    "initiatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "agreementId" TEXT,
    "financialGuaranteeId" TEXT,
    "requestedById" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "reason" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "externalId" TEXT,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "openedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedById" TEXT,
    "resolvedByType" "ActorType",
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_messages" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderType" TEXT NOT NULL,
    "type" "DisputeMessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 500,
    "level" "TrustScoreLevel" NOT NULL DEFAULT 'MEDIUM',
    "totalAgreements" INTEGER NOT NULL DEFAULT 0,
    "completedAgreements" INTEGER NOT NULL DEFAULT 0,
    "canceledAgreements" INTEGER NOT NULL DEFAULT 0,
    "disputesOpened" INTEGER NOT NULL DEFAULT 0,
    "disputesWon" INTEGER NOT NULL DEFAULT 0,
    "disputesLost" INTEGER NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trust_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_score_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trustScoreId" TEXT NOT NULL,
    "type" "TrustScoreEventType" NOT NULL,
    "scoreBefore" INTEGER NOT NULL,
    "scoreDelta" INTEGER NOT NULL,
    "scoreAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_score_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_records" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "network" "BlockchainNetwork" NOT NULL DEFAULT 'ETHEREUM_TESTNET',
    "txHash" TEXT,
    "blockNumber" BIGINT,
    "contractAddress" TEXT,
    "proofHash" TEXT,
    "proofData" JSONB,
    "status" "BlockchainRecordStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "confirmedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blockchain_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "adminUserId" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SUPPORT',
    "status" "AdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_document_key" ON "users"("document");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_document_idx" ON "users"("document");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "device_sessions_refreshToken_key" ON "device_sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "device_sessions_userId_idx" ON "device_sessions"("userId");

-- CreateIndex
CREATE INDEX "device_sessions_userId_expiresAt_idx" ON "device_sessions"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "receiving_keys_normalizedKey_key" ON "receiving_keys"("normalizedKey");

-- CreateIndex
CREATE INDEX "receiving_keys_userId_status_idx" ON "receiving_keys"("userId", "status");

-- CreateIndex
CREATE INDEX "receiving_keys_normalizedKey_idx" ON "receiving_keys"("normalizedKey");

-- CreateIndex
CREATE INDEX "receiving_destinations_userId_status_idx" ON "receiving_destinations"("userId", "status");

-- CreateIndex
CREATE INDEX "agreements_createdById_idx" ON "agreements"("createdById");

-- CreateIndex
CREATE INDEX "agreements_payerId_idx" ON "agreements"("payerId");

-- CreateIndex
CREATE INDEX "agreements_receiverId_idx" ON "agreements"("receiverId");

-- CreateIndex
CREATE INDEX "agreements_operationalStatus_idx" ON "agreements"("operationalStatus");

-- CreateIndex
CREATE INDEX "agreements_financialStatus_idx" ON "agreements"("financialStatus");

-- CreateIndex
CREATE INDEX "agreements_createdAt_idx" ON "agreements"("createdAt");

-- CreateIndex
CREATE INDEX "agreement_participants_agreementId_role_idx" ON "agreement_participants"("agreementId", "role");

-- CreateIndex
CREATE INDEX "agreement_participants_userId_idx" ON "agreement_participants"("userId");

-- CreateIndex
CREATE INDEX "agreement_participants_email_idx" ON "agreement_participants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agreement_participants_agreementId_userId_key" ON "agreement_participants"("agreementId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "agreement_participants_agreementId_email_key" ON "agreement_participants"("agreementId", "email");

-- CreateIndex
CREATE INDEX "agreement_events_agreementId_idx" ON "agreement_events"("agreementId");

-- CreateIndex
CREATE INDEX "agreement_events_type_idx" ON "agreement_events"("type");

-- CreateIndex
CREATE INDEX "agreement_status_history_agreementId_idx" ON "agreement_status_history"("agreementId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_guarantees_agreementId_key" ON "financial_guarantees"("agreementId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_idempotencyKey_key" ON "payment_intents"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payment_intents_agreementId_idx" ON "payment_intents"("agreementId");

-- CreateIndex
CREATE INDEX "payment_intents_payerId_idx" ON "payment_intents"("payerId");

-- CreateIndex
CREATE INDEX "payment_intents_payerId_status_idx" ON "payment_intents"("payerId", "status");

-- CreateIndex
CREATE INDEX "payment_intents_status_idx" ON "payment_intents"("status");

-- CreateIndex
CREATE INDEX "payment_intents_financialGuaranteeId_idx" ON "payment_intents"("financialGuaranteeId");

-- CreateIndex
CREATE UNIQUE INDEX "pix_charges_paymentIntentId_key" ON "pix_charges"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "pix_charges_txid_key" ON "pix_charges"("txid");

-- CreateIndex
CREATE UNIQUE INDEX "pix_charges_endToEndId_key" ON "pix_charges"("endToEndId");

-- CreateIndex
CREATE INDEX "pix_charges_txid_idx" ON "pix_charges"("txid");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_idempotencyKey_key" ON "payouts"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payouts_agreementId_idx" ON "payouts"("agreementId");

-- CreateIndex
CREATE INDEX "payouts_agreementId_status_idx" ON "payouts"("agreementId", "status");

-- CreateIndex
CREATE INDEX "payouts_recipientId_idx" ON "payouts"("recipientId");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE INDEX "payouts_financialGuaranteeId_idx" ON "payouts"("financialGuaranteeId");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_idempotencyKey_key" ON "refunds"("idempotencyKey");

-- CreateIndex
CREATE INDEX "refunds_paymentIntentId_idx" ON "refunds"("paymentIntentId");

-- CreateIndex
CREATE INDEX "refunds_agreementId_idx" ON "refunds"("agreementId");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE INDEX "refunds_financialGuaranteeId_idx" ON "refunds"("financialGuaranteeId");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_agreementId_key" ON "disputes"("agreementId");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

-- CreateIndex
CREATE INDEX "dispute_messages_disputeId_idx" ON "dispute_messages"("disputeId");

-- CreateIndex
CREATE UNIQUE INDEX "trust_scores_userId_key" ON "trust_scores"("userId");

-- CreateIndex
CREATE INDEX "trust_score_events_userId_idx" ON "trust_score_events"("userId");

-- CreateIndex
CREATE INDEX "trust_score_events_trustScoreId_idx" ON "trust_score_events"("trustScoreId");

-- CreateIndex
CREATE INDEX "trust_score_events_userId_type_idx" ON "trust_score_events"("userId", "type");

-- CreateIndex
CREATE INDEX "trust_score_events_createdAt_idx" ON "trust_score_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_records_agreementId_key" ON "blockchain_records"("agreementId");

-- CreateIndex
CREATE INDEX "blockchain_records_txHash_idx" ON "blockchain_records"("txHash");

-- CreateIndex
CREATE INDEX "notifications_userId_status_idx" ON "notifications"("userId", "status");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_adminUserId_idx" ON "audit_logs"("adminUserId");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resourceId_idx" ON "audit_logs"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_users_email_idx" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_sessions" ADD CONSTRAINT "device_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiving_keys" ADD CONSTRAINT "receiving_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receiving_destinations" ADD CONSTRAINT "receiving_destinations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreement_participants" ADD CONSTRAINT "agreement_participants_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreement_participants" ADD CONSTRAINT "agreement_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreement_events" ADD CONSTRAINT "agreement_events_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreement_status_history" ADD CONSTRAINT "agreement_status_history_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_guarantees" ADD CONSTRAINT "financial_guarantees_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_financialGuaranteeId_fkey" FOREIGN KEY ("financialGuaranteeId") REFERENCES "financial_guarantees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pix_charges" ADD CONSTRAINT "pix_charges_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "payment_intents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pix_charges" ADD CONSTRAINT "pix_charges_receivingKeyId_fkey" FOREIGN KEY ("receivingKeyId") REFERENCES "receiving_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "agreements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_financialGuaranteeId_fkey" FOREIGN KEY ("financialGuaranteeId") REFERENCES "financial_guarantees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_recipientKeyId_fkey" FOREIGN KEY ("recipientKeyId") REFERENCES "receiving_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_recipientDestinationId_fkey" FOREIGN KEY ("recipientDestinationId") REFERENCES "receiving_destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_financialGuaranteeId_fkey" FOREIGN KEY ("financialGuaranteeId") REFERENCES "financial_guarantees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_messages" ADD CONSTRAINT "dispute_messages_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_scores" ADD CONSTRAINT "trust_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_score_events" ADD CONSTRAINT "trust_score_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_score_events" ADD CONSTRAINT "trust_score_events_trustScoreId_fkey" FOREIGN KEY ("trustScoreId") REFERENCES "trust_scores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_records" ADD CONSTRAINT "blockchain_records_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
