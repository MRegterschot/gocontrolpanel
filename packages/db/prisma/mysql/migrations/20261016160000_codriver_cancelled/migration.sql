ALTER TABLE `codriver_requests` MODIFY `status` ENUM('done', 'needs_confirmation', 'planned', 'unclear', 'denied', 'failed', 'over_budget', 'cancelled') NOT NULL;
