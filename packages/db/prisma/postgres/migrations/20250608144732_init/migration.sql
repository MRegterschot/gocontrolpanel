-- CreateTable
CREATE TABLE "interfaces" (
    "id" TEXT NOT NULL,
    "interfaceString" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "interfaces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interfaces_deletedAt_idx" ON "interfaces"("deletedAt");
