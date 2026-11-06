-- DropIndex
DROP INDEX `users_ubiUid_key` ON `users`;

-- AlterTable
ALTER TABLE `users` MODIFY `ubiUid` VARCHAR(191) NULL;
