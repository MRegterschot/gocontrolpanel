/*
  Warnings:

  - Added the required column `serverId` to the `matches` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_mapId_fkey";

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "serverId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "maps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
