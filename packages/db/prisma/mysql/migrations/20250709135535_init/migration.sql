/*
  Warnings:

  - You are about to drop the column `roles` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `admin` BOOLEAN NOT NULL DEFAULT false;

UPDATE users
SET admin = true
WHERE JSON_CONTAINS(roles, JSON_QUOTE('admin'), '$');

ALTER TABLE `users` DROP COLUMN `roles`;

-- CreateTable
CREATE TABLE `groups` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `serverUuids` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `groups_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group_members` (
    `userId` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `role` ENUM('Admin', 'Moderator', 'User') NOT NULL,

    PRIMARY KEY (`userId`, `groupId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `group_members` ADD CONSTRAINT `group_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_members` ADD CONSTRAINT `group_members_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
