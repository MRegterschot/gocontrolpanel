-- CreateTable
CREATE TABLE "maps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "authorNickname" TEXT NOT NULL,
    "authorTime" INTEGER NOT NULL,
    "goldTime" INTEGER NOT NULL,
    "silverTime" INTEGER NOT NULL,
    "bronzeTime" INTEGER NOT NULL,
    "submitter" TEXT,
    "timestamp" TIMESTAMP(3),
    "fileUrl" TEXT,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "nickName" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "roles" TEXT[],
    "ubiUid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maps_deletedAt_idx" ON "maps"("deletedAt");

-- CreateIndex
CREATE INDEX "players_deletedAt_idx" ON "players"("deletedAt");
