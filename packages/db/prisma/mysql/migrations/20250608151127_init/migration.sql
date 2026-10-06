/*
  Warnings:

  - Added the required column `serverUuid` to the `interfaces` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `interfaces` ADD COLUMN `serverUuid` VARCHAR(191) NOT NULL;
