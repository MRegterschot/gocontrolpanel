/*
  Warnings:

  - A unique constraint covering the columns `[uid]` on the table `maps` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fileUrl]` on the table `maps` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[thumbnailUrl]` on the table `maps` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "records" (
    "id" TEXT NOT NULL,
    "mapId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mapUid" TEXT NOT NULL,
    "time" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "records_deletedAt_idx" ON "records"("deletedAt");

-- CreateIndex
CREATE INDEX "records_mapId_idx" ON "records"("mapId");

-- CreateIndex
CREATE INDEX "records_userId_idx" ON "records"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "maps_uid_key" ON "maps"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "maps_fileUrl_key" ON "maps"("fileUrl");

-- CreateIndex
CREATE UNIQUE INDEX "maps_thumbnailUrl_key" ON "maps"("thumbnailUrl");

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_mapId_fkey" FOREIGN KEY ("mapId") REFERENCES "maps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
