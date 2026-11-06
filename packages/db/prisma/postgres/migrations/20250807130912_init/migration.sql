/*
  Warnings:

  - You are about to drop the `server_commands` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."server_commands" DROP CONSTRAINT "server_commands_commandId_fkey";

-- DropForeignKey
ALTER TABLE "public"."server_commands" DROP CONSTRAINT "server_commands_serverId_fkey";

-- AlterTable
ALTER TABLE "public"."commands" ADD COLUMN     "pluginId" TEXT;

-- DropTable
DROP TABLE "public"."server_commands";

-- CreateTable
CREATE TABLE "public"."plugins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "plugins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."server_plugins" (
    "serverId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,

    CONSTRAINT "server_plugins_pkey" PRIMARY KEY ("serverId","pluginId")
);

-- CreateIndex
CREATE INDEX "plugins_deletedAt_idx" ON "public"."plugins"("deletedAt");

-- AddForeignKey
ALTER TABLE "public"."commands" ADD CONSTRAINT "commands_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "public"."plugins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."server_plugins" ADD CONSTRAINT "server_plugins_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "public"."servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."server_plugins" ADD CONSTRAINT "server_plugins_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "public"."plugins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
