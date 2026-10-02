-- CreateTable
CREATE TABLE "hetzner_projects" (
    "id" TEXT NOT NULL,
    "apiTokens" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "hetzner_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hetzner_project_users" (
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "hetzner_project_users_pkey" PRIMARY KEY ("userId","projectId")
);

-- CreateIndex
CREATE INDEX "hetzner_projects_deletedAt_idx" ON "hetzner_projects"("deletedAt");

-- AddForeignKey
ALTER TABLE "hetzner_project_users" ADD CONSTRAINT "hetzner_project_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hetzner_project_users" ADD CONSTRAINT "hetzner_project_users_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "hetzner_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
