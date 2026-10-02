-- CreateTable
CREATE TABLE `hetzner_server` (
    `id` VARCHAR(191) NOT NULL,
    `hetznerId` INTEGER NOT NULL,
    `publicKey` VARCHAR(191) NULL,
    `privateKey` LONGBLOB NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `hetzner_server_hetznerId_key`(`hetznerId`),
    INDEX `hetzner_server_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
