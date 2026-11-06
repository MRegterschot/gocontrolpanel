-- CreateTable
CREATE TABLE `codriver_panel_settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'panel',
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `sharedApiKeyEncrypted` LONGTEXT NULL,
    `sharedKeyModels` JSON NOT NULL,
    `sharedMonthlyBudgetCents` INTEGER NULL,
    `allowServerKeys` BOOLEAN NOT NULL DEFAULT false,
    `userMode` ENUM('everyone', 'allowlist') NOT NULL DEFAULT 'everyone',
    `retentionDays` INTEGER NOT NULL DEFAULT 90,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `codriver_access_rules` (
    `id` VARCHAR(191) NOT NULL,
    `targetType` ENUM('server', 'group', 'user') NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `effect` ENUM('allow', 'deny') NOT NULL,
    `useSharedKey` BOOLEAN NOT NULL DEFAULT false,
    `sharedMonthlyBudgetCents` INTEGER NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `codriver_access_rules_targetType_targetId_key`(`targetType`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `codriver_settings` (
    `serverId` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `apiKeyEncrypted` LONGTEXT NULL,
    `model` ENUM('haiku', 'sonnet') NOT NULL DEFAULT 'haiku',
    `escalation` BOOLEAN NOT NULL DEFAULT true,
    `monthlyBudgetCents` INTEGER NULL,
    `guestAccess` ENUM('off', 'read') NOT NULL DEFAULT 'off',
    `memberAccess` BOOLEAN NOT NULL DEFAULT false,
    `cooldownSeconds` INTEGER NOT NULL DEFAULT 3,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`serverId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `codriver_requests` (
    `id` VARCHAR(191) NOT NULL,
    `serverId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `login` VARCHAR(191) NOT NULL,
    `source` ENUM('game', 'panel', 'cli') NOT NULL,
    `text` LONGTEXT NOT NULL,
    `toolCalls` JSON NULL,
    `status` ENUM('done', 'needs_confirmation', 'planned', 'unclear', 'denied', 'failed', 'over_budget') NOT NULL,
    `keySource` ENUM('server', 'shared', 'none') NOT NULL,
    `model` VARCHAR(191) NULL,
    `inputTokens` INTEGER NOT NULL DEFAULT 0,
    `outputTokens` INTEGER NOT NULL DEFAULT 0,
    `cacheReadTokens` INTEGER NOT NULL DEFAULT 0,
    `costMicros` INTEGER NOT NULL DEFAULT 0,
    `latencyMs` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `codriver_requests_serverId_createdAt_idx`(`serverId`, `createdAt`),
    INDEX `codriver_requests_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `codriver_access_rules` ADD CONSTRAINT `codriver_access_rules_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `codriver_settings` ADD CONSTRAINT `codriver_settings_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `codriver_requests` ADD CONSTRAINT `codriver_requests_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `codriver_requests` ADD CONSTRAINT `codriver_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

