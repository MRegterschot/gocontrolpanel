-- AlterTable
ALTER TABLE `commands` ADD COLUMN `parameters` JSON NULL;

-- AlterTable
ALTER TABLE `server_commands` ADD COLUMN `enabled` BOOLEAN NOT NULL DEFAULT true;
