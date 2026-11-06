-- AlterTable
ALTER TABLE `plugins` ADD COLUMN `author` VARCHAR(191) NULL,
    ADD COLUMN `displayName` VARCHAR(191) NULL,
    ADD COLUMN `ownerId` VARCHAR(191) NULL,
    ADD COLUMN `source` ENUM('builtin', 'marketplace', 'upload') NOT NULL DEFAULT 'builtin',
    MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `server_plugins` ADD COLUMN `grantedCapabilities` JSON NULL,
    ADD COLUMN `installedAt` DATETIME(3) NULL,
    ADD COLUMN `installedById` VARCHAR(191) NULL,
    ADD COLUMN `versionId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `plugin_versions` (
    `id` VARCHAR(191) NOT NULL,
    `pluginId` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `sdk` INTEGER NOT NULL,
    `sha256` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `manifest` JSON NOT NULL,
    `package` LONGBLOB NOT NULL,
    `yanked` BOOLEAN NOT NULL DEFAULT false,
    `yankReason` TEXT NULL,
    `uploadedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `plugin_versions_pluginId_version_key`(`pluginId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plugin_storage` (
    `serverId` VARCHAR(191) NOT NULL,
    `pluginId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `size` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`serverId`, `pluginId`, `key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `plugins_ownerId_idx` ON `plugins`(`ownerId`);

-- CreateIndex
CREATE INDEX `server_plugins_versionId_idx` ON `server_plugins`(`versionId`);

-- AddForeignKey
ALTER TABLE `plugins` ADD CONSTRAINT `plugins_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plugin_versions` ADD CONSTRAINT `plugin_versions_pluginId_fkey` FOREIGN KEY (`pluginId`) REFERENCES `plugins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `server_plugins` ADD CONSTRAINT `server_plugins_versionId_fkey` FOREIGN KEY (`versionId`) REFERENCES `plugin_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plugin_storage` ADD CONSTRAINT `plugin_storage_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plugin_storage` ADD CONSTRAINT `plugin_storage_pluginId_fkey` FOREIGN KEY (`pluginId`) REFERENCES `plugins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

