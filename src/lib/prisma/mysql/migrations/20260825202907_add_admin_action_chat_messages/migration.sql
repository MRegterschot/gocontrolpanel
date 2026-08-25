-- AlterTable
ALTER TABLE `servers` ADD COLUMN `mapListChangeMessage` VARCHAR(191) NULL,
    ADD COLUMN `matchSettingsLoadedMessage` VARCHAR(191) NULL,
    ADD COLUMN `scriptNameChangeMessage` VARCHAR(191) NULL,
    ADD COLUMN `scriptSettingsSavedMessage` VARCHAR(191) NULL;
