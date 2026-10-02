/*
  Warnings:

  - You are about to drop the column `userId` on the `records` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "records" DROP CONSTRAINT "records_userId_fkey";

-- DropIndex
DROP INDEX "records_userId_idx";

-- AlterTable
ALTER TABLE "records" DROP COLUMN "userId";
