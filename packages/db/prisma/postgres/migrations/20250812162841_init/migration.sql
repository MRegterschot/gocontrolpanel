/*
  Warnings:

  - You are about to drop the `hetzner_server` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "hetzner_server";

-- CreateTable
CREATE TABLE "hetzner_servers" (
    "id" TEXT NOT NULL,
    "hetznerId" INTEGER NOT NULL,
    "publicKey" TEXT,
    "privateKey" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "hetzner_servers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hetzner_servers_hetznerId_key" ON "hetzner_servers"("hetznerId");

-- CreateIndex
CREATE INDEX "hetzner_servers_deletedAt_idx" ON "hetzner_servers"("deletedAt");
