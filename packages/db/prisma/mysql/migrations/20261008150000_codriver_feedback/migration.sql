ALTER TABLE `codriver_requests` ADD COLUMN `reply` LONGTEXT NULL,
    ADD COLUMN `feedback` LONGTEXT NULL,
    ADD COLUMN `feedbackAt` DATETIME(3) NULL;
