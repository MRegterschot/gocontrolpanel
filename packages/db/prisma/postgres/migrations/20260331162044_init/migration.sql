-- AlterTable
ALTER TABLE "group_members" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "serversOrder" TEXT;
