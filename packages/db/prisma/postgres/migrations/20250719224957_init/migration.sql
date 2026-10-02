/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_deletedAt_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "deletedAt";
