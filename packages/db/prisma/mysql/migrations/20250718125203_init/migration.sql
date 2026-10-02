-- AlterTable
ALTER TABLE `servers` ADD COLUMN `connectMessage` VARCHAR(191) NULL,
    ADD COLUMN `disconnectMessage` VARCHAR(191) NULL,
    ADD COLUMN `manualRouting` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `messageFormat` VARCHAR(191) NULL,
    MODIFY `filemanagerUrl` VARCHAR(191) NULL;
