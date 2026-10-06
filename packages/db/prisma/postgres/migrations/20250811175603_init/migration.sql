-- CreateTable
CREATE TABLE "hetzner_server" (
    "id" TEXT NOT NULL,
    "hetznerId" INTEGER NOT NULL,
    "publicKey" TEXT,
    "privateKey" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "hetzner_server_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hetzner_server_hetznerId_key" ON "hetzner_server"("hetznerId");

-- CreateIndex
CREATE INDEX "hetzner_server_deletedAt_idx" ON "hetzner_server"("deletedAt");
