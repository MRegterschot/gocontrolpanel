/*
  Warnings:

  - You are about to drop the `players` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `players`;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `login` VARCHAR(191) NOT NULL,
    `nickName` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `roles` JSON NOT NULL,
    `ubiUid` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `users_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
