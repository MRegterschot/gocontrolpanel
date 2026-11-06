-- CreateTable
CREATE TABLE `hetzner_projects` (
    `id` VARCHAR(191) NOT NULL,
    `apiTokens` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `hetzner_projects_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hetzner_project_users` (
    `userId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`userId`, `projectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `hetzner_project_users` ADD CONSTRAINT `hetzner_project_users_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hetzner_project_users` ADD CONSTRAINT `hetzner_project_users_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `hetzner_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
