-- AlterTable
ALTER TABLE "commands" ADD COLUMN     "parameters" JSONB;

-- AlterTable
ALTER TABLE "server_commands" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true;
