ALTER TABLE `codriver_panel_settings` ADD COLUMN `jevEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `jevApiKeyEncrypted` LONGTEXT NULL;
