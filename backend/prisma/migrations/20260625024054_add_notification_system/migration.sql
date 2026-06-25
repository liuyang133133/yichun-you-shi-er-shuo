-- CreateTable
CREATE TABLE `notification_templates` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `event` VARCHAR(50) NOT NULL,
    `channel` VARCHAR(20) NOT NULL,
    `key` VARCHAR(50) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `variables` JSON NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 3,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` BIGINT NULL,
    `updated_by` BIGINT NULL,
    `deleted_by` BIGINT NULL,

    INDEX `notification_templates_event_channel_idx`(`event`, `channel`),
    INDEX `notification_templates_deleted_at_idx`(`deleted_at`),
    UNIQUE INDEX `uniq_event_channel_key`(`event`, `channel`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `event` VARCHAR(50) NOT NULL,
    `channel` VARCHAR(20) NOT NULL DEFAULT 'site',
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `payload` JSON NULL,
    `priority` INTEGER NOT NULL DEFAULT 3,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` BIGINT NULL,

    INDEX `notifications_user_id_read_at_created_at_idx`(`user_id`, `read_at`, `created_at`),
    INDEX `notifications_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `notifications_event_created_at_idx`(`event`, `created_at`),
    INDEX `notifications_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_notification_settings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `event` VARCHAR(50) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `quiet_hours` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_notification_settings_user_id_idx`(`user_id`),
    UNIQUE INDEX `uniq_user_event`(`user_id`, `event`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `device_tokens` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `platform` VARCHAR(20) NOT NULL,
    `token` VARCHAR(500) NOT NULL,
    `device_id` VARCHAR(200) NULL,
    `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,
    `deleted_by` BIGINT NULL,

    INDEX `device_tokens_user_id_idx`(`user_id`),
    INDEX `device_tokens_deleted_at_idx`(`deleted_at`),
    UNIQUE INDEX `uniq_user_token`(`user_id`, `token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_notification_settings` ADD CONSTRAINT `user_notification_settings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `device_tokens` ADD CONSTRAINT `device_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
