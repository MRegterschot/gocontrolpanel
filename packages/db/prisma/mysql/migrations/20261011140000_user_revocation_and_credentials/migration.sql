ALTER TABLE `users` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `servers` MODIFY `password` TEXT NOT NULL, MODIFY `filemanagerPassword` TEXT NULL;
