-- CreateEnum
CREATE TYPE "UserServerRole" AS ENUM ('Admin', 'Moderator', 'Member');

-- CreateTable
CREATE TABLE "user_servers" (
    "userId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "role" "UserServerRole" NOT NULL,

    CONSTRAINT "user_servers_pkey" PRIMARY KEY ("userId","serverId")
);

-- AddForeignKey
ALTER TABLE "user_servers" ADD CONSTRAINT "user_servers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_servers" ADD CONSTRAINT "user_servers_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
