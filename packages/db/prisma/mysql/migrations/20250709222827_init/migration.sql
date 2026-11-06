/*
  Warnings:

  - Added the required column `name` to the `hetzner_projects` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `hetzner_projects` ADD COLUMN `name` VARCHAR(191) NOT NULL;
