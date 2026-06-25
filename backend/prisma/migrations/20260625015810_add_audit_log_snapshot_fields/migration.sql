-- AlterTable
ALTER TABLE `audit_logs` ADD COLUMN `after_snapshot` JSON NULL,
    ADD COLUMN `before_snapshot` JSON NULL,
    ADD COLUMN `ip` VARCHAR(45) NULL,
    ADD COLUMN `request_id` VARCHAR(64) NULL,
    ADD COLUMN `user_agent` VARCHAR(500) NULL;

-- CreateIndex
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs`(`created_at`);
