-- CreateTable
CREATE TABLE `maps` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `uid` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `author` VARCHAR(191) NOT NULL,
    `authorNickname` VARCHAR(191) NOT NULL,
    `authorTime` INTEGER NOT NULL,
    `goldTime` INTEGER NOT NULL,
    `silverTime` INTEGER NOT NULL,
    `bronzeTime` INTEGER NOT NULL,
    `submitter` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NULL,
    `fileUrl` VARCHAR(191) NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `maps_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `players` (
    `id` VARCHAR(191) NOT NULL,
    `login` VARCHAR(191) NOT NULL,
    `nickName` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `roles` JSON NOT NULL,
    `ubiUid` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `players_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
