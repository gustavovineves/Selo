-- CreateEnum
CREATE TYPE "FinancialVerificationLevel" AS ENUM ('NONE', 'BASIC', 'STANDARD', 'FULL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'KYC_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'KYC_APPROVED_ADMIN';
ALTER TYPE "AuditAction" ADD VALUE 'KYC_REJECTED_ADMIN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'KYC_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'KYC_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'KYC_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'FINANCIAL_VERIFICATION_REQUIRED';

-- CreateTable
CREATE TABLE "financial_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acceptedFinancialTermsAt" TIMESTAMP(3),
    "kycSubmittedAt" TIMESTAMP(3),
    "kycApprovedAt" TIMESTAMP(3),
    "kycRejectedAt" TIMESTAMP(3),
    "kycRejectionReason" TEXT,
    "verificationLevel" "FinancialVerificationLevel" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "financial_profiles_userId_key" ON "financial_profiles"("userId");

-- AddForeignKey
ALTER TABLE "financial_profiles" ADD CONSTRAINT "financial_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
