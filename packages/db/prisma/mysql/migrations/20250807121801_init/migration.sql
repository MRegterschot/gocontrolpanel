/*
  Warnings:

  - You are about to drop the `server_commands` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `server_commands` DROP FOREIGN KEY `server_commands_commandId_fkey`;

-- DropForeignKey
ALTER TABLE `server_commands` DROP FOREIGN KEY `server_commands_serverId_fkey`;

-- AlterTable
ALTER TABLE `commands` ADD COLUMN `pluginId` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `server_commands`;

-- CreateTable
CREATE TABLE `plugins` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `plugins_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `server_plugins` (
    `serverId` VARCHAR(191) NOT NULL,
    `pluginId` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`serverId`, `pluginId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `commands` ADD CONSTRAINT `commands_pluginId_fkey` FOREIGN KEY (`pluginId`) REFERENCES `plugins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `server_plugins` ADD CONSTRAINT `server_plugins_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `server_plugins` ADD CONSTRAINT `server_plugins_pluginId_fkey` FOREIGN KEY (`pluginId`) REFERENCES `plugins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
