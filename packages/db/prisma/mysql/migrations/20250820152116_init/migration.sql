/*
  Warnings:

  - Made the column `checkpoints` on table `records` required. This step will fail if there are existing NULL values in that column.

*/

UPDATE `records`
SET `checkpoints` = JSON_ARRAY()
WHERE `checkpoints` IS NULL;

-- AlterTable
ALTER TABLE `records` MODIFY `checkpoints` JSON NOT NULL DEFAULT (JSON_ARRAY());
