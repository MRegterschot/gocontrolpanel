/*
  Warnings:

  - You are about to drop the column `serverUuids` on the `groups` table. All the data in the column will be lost.
  - You are about to drop the column `serverUuid` on the `interfaces` table. All the data in the column will be lost.
  - Added the required column `serverId` to the `interfaces` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `groups` DROP COLUMN `serverUuids`;

-- AlterTable
ALTER TABLE `interfaces` DROP COLUMN `serverUuid`,
    ADD COLUMN `serverId` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `group_servers` (
    `groupId` VARCHAR(191) NOT NULL,
    `serverId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`groupId`, `serverId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `interfaces` ADD CONSTRAINT `interfaces_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_servers` ADD CONSTRAINT `group_servers_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_servers` ADD CONSTRAINT `group_servers_serverId_fkey` FOREIGN KEY (`serverId`) REFERENCES `servers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
