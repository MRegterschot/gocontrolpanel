-- AlterTable
ALTER TABLE "records" ADD COLUMN     "checkpoints" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "matchId" TEXT,
ADD COLUMN     "round" INTEGER;

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "matches_deletedAt_idx" ON "matches"("deletedAt");

-- CreateIndex
CREATE INDEX "matches_mapId_idx" ON "matches"("mapId");

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
