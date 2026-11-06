/*
  Warnings:

  - Added the required column `name` to the `interfaces` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "interfaces" ADD COLUMN     "name" TEXT NOT NULL;
