/*
  Warnings:

  - Added the required column `role` to the `hetzner_project_users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "HetznerProjectRole" AS ENUM ('Admin', 'Moderator');

-- AlterTable
ALTER TABLE "hetzner_project_users" ADD COLUMN     "role" "HetznerProjectRole" NOT NULL;
