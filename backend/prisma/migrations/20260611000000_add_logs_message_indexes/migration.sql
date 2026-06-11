-- =====================================================
-- MUST-16: 3 张日志表（AuditLog / LoginLog / ViewLog）
-- MUST-17: 站内信 Message 表
-- 同时补充缺失索引（User.role, Company.verified, PostHouse 复合）
-- 注：FULLTEXT 索引在下一个 migration（20260611000100_add_fulltext）
-- =====================================================

-- AlterTable: users 加 role+status 复合索引
CREATE INDEX `users_role_status_idx` ON `users`(`role`, `status`);

-- AlterTable: companies 加 verified 索引
CREATE INDEX `companies_verified_idx` ON `companies`(`verified`);

-- AlterTable: post_houses 加复合索引（房屋筛选优化）
CREATE INDEX `post_houses_rental_type_property_type_area_sqm_idx` ON `post_houses`(`rental_type`, `property_type`, `area_sqm`);

-- CreateTable: messages
CREATE TABLE `messages` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `sender_id` BIGINT NOT NULL,
    `receiver_id` BIGINT NOT NULL,
    `content` VARCHAR(1000) NOT NULL,
    `is_read` TINYINT NOT NULL DEFAULT 0,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `messages_receiver_id_is_read_created_at_idx`(`receiver_id`, `is_read`, `created_at`),
    INDEX `messages_sender_id_created_at_idx`(`sender_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: audit_logs
CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `admin_user_id` BIGINT NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `target_type` VARCHAR(30) NOT NULL,
    `target_id` BIGINT NULL,
    `reason` VARCHAR(500) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_admin_user_id_created_at_idx`(`admin_user_id`, `created_at`),
    INDEX `audit_logs_module_action_created_at_idx`(`module`, `action`, `created_at`),
    INDEX `audit_logs_target_type_target_id_idx`(`target_type`, `target_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: login_logs
CREATE TABLE `login_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `ip` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `device` VARCHAR(100) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'success',
    `fail_reason` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `login_logs_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `login_logs_ip_created_at_idx`(`ip`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: view_logs
CREATE TABLE `view_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT NOT NULL,
    `user_id` BIGINT NULL,
    `ip` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `view_logs_post_id_created_at_idx`(`post_id`, `created_at`),
    INDEX `view_logs_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `view_logs_ip_created_at_idx`(`ip`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `messages` ADD CONSTRAINT `messages_receiver_id_fkey` FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_admin_user_id_fkey` FOREIGN KEY (`admin_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_logs` ADD CONSTRAINT `login_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
