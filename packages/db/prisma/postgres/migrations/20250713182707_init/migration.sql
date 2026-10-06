/*
  Warnings:

  - Made the column `description` on table `servers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `filemanagerUrl` on table `servers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "servers" ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "filemanagerUrl" SET NOT NULL;
