-- AlterTable
ALTER TABLE "servers" ADD COLUMN     "connectMessage" TEXT,
ADD COLUMN     "disconnectMessage" TEXT,
ADD COLUMN     "manualRouting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "messageFormat" TEXT,
ALTER COLUMN "filemanagerUrl" DROP NOT NULL;
