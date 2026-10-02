-- CreateTable
CREATE TABLE "servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "user" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "filemanagerUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "servers_deletedAt_idx" ON "servers"("deletedAt");
