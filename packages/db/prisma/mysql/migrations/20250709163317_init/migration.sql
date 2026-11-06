/*
  Warnings:

  - The values [User] on the enum `group_members_role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `group_members` MODIFY `role` ENUM('Admin', 'Moderator', 'Member') NOT NULL;
