/*
  Warnings:

  - You are about to drop the column `userId` on the `records` table. All the data in the column will be lost.

*/

-- AlterTable
ALTER TABLE `records` MODIFY `login` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `records` ADD CONSTRAINT `records_login_fkey` FOREIGN KEY (`login`) REFERENCES `users`(`login`) ON DELETE SET NULL ON UPDATE CASCADE;
