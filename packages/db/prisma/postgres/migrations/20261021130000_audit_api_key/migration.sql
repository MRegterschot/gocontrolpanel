-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "apiKeyId" TEXT;

-- CreateIndex
CREATE INDEX "audit_logs_apiKeyId_idx" ON "audit_logs"("apiKeyId");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

