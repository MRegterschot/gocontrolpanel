-- AlterTable
ALTER TABLE "records" ADD COLUMN     "serverId" TEXT;

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
