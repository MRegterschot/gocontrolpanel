-- CreateEnum
CREATE TYPE "CodriverUserMode" AS ENUM ('everyone', 'allowlist');

-- CreateEnum
CREATE TYPE "CodriverRuleTarget" AS ENUM ('server', 'group', 'user');

-- CreateEnum
CREATE TYPE "CodriverRuleEffect" AS ENUM ('allow', 'deny');

-- CreateEnum
CREATE TYPE "CodriverModel" AS ENUM ('haiku', 'sonnet');

-- CreateEnum
CREATE TYPE "CodriverGuestAccess" AS ENUM ('off', 'read');

-- CreateEnum
CREATE TYPE "CodriverRequestSource" AS ENUM ('game', 'panel', 'cli');

-- CreateEnum
CREATE TYPE "CodriverRequestStatus" AS ENUM ('done', 'needs_confirmation', 'planned', 'unclear', 'denied', 'failed', 'over_budget');

-- CreateEnum
CREATE TYPE "CodriverKeySource" AS ENUM ('server', 'shared', 'none');

-- CreateTable
CREATE TABLE "codriver_panel_settings" (
    "id" TEXT NOT NULL DEFAULT 'panel',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sharedApiKeyEncrypted" TEXT,
    "sharedKeyModels" TEXT[] DEFAULT ARRAY['haiku']::TEXT[],
    "sharedMonthlyBudgetCents" INTEGER,
    "allowServerKeys" BOOLEAN NOT NULL DEFAULT false,
    "userMode" "CodriverUserMode" NOT NULL DEFAULT 'everyone',
    "retentionDays" INTEGER NOT NULL DEFAULT 90,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "codriver_panel_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codriver_access_rules" (
    "id" TEXT NOT NULL,
    "targetType" "CodriverRuleTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "effect" "CodriverRuleEffect" NOT NULL,
    "useSharedKey" BOOLEAN NOT NULL DEFAULT false,
    "sharedMonthlyBudgetCents" INTEGER,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "codriver_access_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codriver_settings" (
    "serverId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "apiKeyEncrypted" TEXT,
    "model" "CodriverModel" NOT NULL DEFAULT 'haiku',
    "escalation" BOOLEAN NOT NULL DEFAULT true,
    "monthlyBudgetCents" INTEGER,
    "guestAccess" "CodriverGuestAccess" NOT NULL DEFAULT 'off',
    "memberAccess" BOOLEAN NOT NULL DEFAULT false,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "codriver_settings_pkey" PRIMARY KEY ("serverId")
);

-- CreateTable
CREATE TABLE "codriver_requests" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "userId" TEXT,
    "login" TEXT NOT NULL,
    "source" "CodriverRequestSource" NOT NULL,
    "text" TEXT NOT NULL,
    "toolCalls" JSONB,
    "status" "CodriverRequestStatus" NOT NULL,
    "keySource" "CodriverKeySource" NOT NULL,
    "model" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "costMicros" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codriver_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "codriver_access_rules_targetType_targetId_key" ON "codriver_access_rules"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "codriver_requests_serverId_createdAt_idx" ON "codriver_requests"("serverId", "createdAt");

-- CreateIndex
CREATE INDEX "codriver_requests_createdAt_idx" ON "codriver_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "codriver_access_rules" ADD CONSTRAINT "codriver_access_rules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codriver_settings" ADD CONSTRAINT "codriver_settings_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codriver_requests" ADD CONSTRAINT "codriver_requests_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codriver_requests" ADD CONSTRAINT "codriver_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

