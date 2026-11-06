/*
  Warnings:

  - Made the column `description` on table `servers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `filemanagerUrl` on table `servers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `servers` MODIFY `description` VARCHAR(191) NOT NULL,
    MODIFY `filemanagerUrl` VARCHAR(191) NOT NULL;
