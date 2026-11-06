/*
  Warnings:

  - A unique constraint covering the columns `[uid]` on the table `maps` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fileUrl]` on the table `maps` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[thumbnailUrl]` on the table `maps` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[login]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ubiUid]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE `records` (
    `id` VARCHAR(191) NOT NULL,
    `mapId` VARCHAR(191) NOT NULL,
    `login` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `mapUid` VARCHAR(191) NOT NULL,
    `time` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `records_deletedAt_idx`(`deletedAt`),
    INDEX `records_mapId_idx`(`mapId`),
    INDEX `records_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `maps_uid_key` ON `maps`(`uid`);

-- CreateIndex
CREATE UNIQUE INDEX `maps_fileUrl_key` ON `maps`(`fileUrl`);

-- CreateIndex
CREATE UNIQUE INDEX `maps_thumbnailUrl_key` ON `maps`(`thumbnailUrl`);

-- CreateIndex
CREATE UNIQUE INDEX `users_login_key` ON `users`(`login`);

-- CreateIndex
CREATE UNIQUE INDEX `users_ubiUid_key` ON `users`(`ubiUid`);

-- AddForeignKey
ALTER TABLE `records` ADD CONSTRAINT `records_mapId_fkey` FOREIGN KEY (`mapId`) REFERENCES `maps`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `records` ADD CONSTRAINT `records_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
