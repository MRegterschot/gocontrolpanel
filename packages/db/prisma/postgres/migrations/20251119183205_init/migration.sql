/*
  Warnings:

  - You are about to drop the `commands` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "commands" DROP CONSTRAINT "commands_pluginId_fkey";

-- DropTable
DROP TABLE "commands";
