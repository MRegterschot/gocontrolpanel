-- CreateEnum
CREATE TYPE "PluginSource" AS ENUM ('builtin', 'marketplace', 'upload');

-- AlterTable
ALTER TABLE "plugins" ADD COLUMN     "author" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "source" "PluginSource" NOT NULL DEFAULT 'builtin';

-- AlterTable
ALTER TABLE "server_plugins" ADD COLUMN     "grantedCapabilities" JSONB,
ADD COLUMN     "installedAt" TIMESTAMP(3),
ADD COLUMN     "installedById" TEXT,
ADD COLUMN     "versionId" TEXT;

-- CreateTable
CREATE TABLE "plugin_versions" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "sdk" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "manifest" JSONB NOT NULL,
    "package" BYTEA NOT NULL,
    "yanked" BOOLEAN NOT NULL DEFAULT false,
    "yankReason" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_storage" (
    "serverId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_storage_pkey" PRIMARY KEY ("serverId","pluginId","key")
);

-- CreateIndex
CREATE UNIQUE INDEX "plugin_versions_pluginId_version_key" ON "plugin_versions"("pluginId", "version");

-- CreateIndex
CREATE INDEX "plugins_ownerId_idx" ON "plugins"("ownerId");

-- CreateIndex
CREATE INDEX "server_plugins_versionId_idx" ON "server_plugins"("versionId");

-- AddForeignKey
ALTER TABLE "plugins" ADD CONSTRAINT "plugins_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_versions" ADD CONSTRAINT "plugin_versions_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "plugins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_plugins" ADD CONSTRAINT "server_plugins_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "plugin_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_storage" ADD CONSTRAINT "plugin_storage_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plugin_storage" ADD CONSTRAINT "plugin_storage_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "plugins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

