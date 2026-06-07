-- DropIndex
DROP INDEX "public"."blockchain_records_agreementId_key";

-- AlterTable
ALTER TABLE "public"."blockchain_records" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "eventType" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "blockchain_records_agreementId_idx" ON "public"."blockchain_records"("agreementId");

-- CreateIndex
CREATE INDEX "blockchain_records_status_idx" ON "public"."blockchain_records"("status");
