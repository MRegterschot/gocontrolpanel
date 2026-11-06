-- AlterTable
ALTER TABLE `records` ADD COLUMN `checkpoints` JSON NULL,
    ADD COLUMN `matchId` VARCHAR(191) NULL,
    ADD COLUMN `round` INTEGER NULL;

-- CreateTable
CREATE TABLE `matches` (
    `id` VARCHAR(191) NOT NULL,
    `mapId` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `matches_deletedAt_idx`(`deletedAt`),
    INDEX `matches_mapId_idx`(`mapId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `records` ADD CONSTRAINT `records_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `matches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matches` ADD CONSTRAINT `matches_mapId_fkey` FOREIGN KEY (`mapId`) REFERENCES `maps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
