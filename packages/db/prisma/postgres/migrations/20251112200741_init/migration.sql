/*
  Warnings:

  - You are about to drop the `interfaces` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "interfaces" DROP CONSTRAINT "interfaces_serverId_fkey";

-- DropTable
DROP TABLE "interfaces";
