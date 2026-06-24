-- DropIndex
DROP INDEX `ft_title_description` ON `posts`;

-- AlterTable
ALTER TABLE `announcements` ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `areas` ADD COLUMN `created_by` BIGINT NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `banners` ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `categories` ADD COLUMN `created_by` BIGINT NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `comments` ADD COLUMN `created_by` BIGINT NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `companies` ADD COLUMN `created_by` BIGINT NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `favorites` ADD COLUMN `created_by` BIGINT NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `job_applications` ADD COLUMN `created_by` BIGINT NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `messages` ADD COLUMN `created_by` BIGINT NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `post_houses` ADD COLUMN `created_by` BIGINT NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `post_images` ADD COLUMN `created_by` BIGINT NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `post_jobs` ADD COLUMN `created_by` BIGINT NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `post_lifebizs` ADD COLUMN `created_by` BIGINT NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `post_secondhands` ADD COLUMN `created_by` BIGINT NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `posts` ADD COLUMN `created_by` BIGINT NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `reports` ADD COLUMN `created_by` BIGINT NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `resumes` ADD COLUMN `created_by` BIGINT NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `created_by` BIGINT NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_by` BIGINT NULL,
    ADD COLUMN `updated_by` BIGINT NULL;

-- CreateTable
CREATE TABLE `sms_codes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(20) NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `purpose` VARCHAR(32) NOT NULL DEFAULT 'login',
    `ip` VARCHAR(45) NULL,
    `consumed` BOOLEAN NOT NULL DEFAULT false,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `consumed_at` DATETIME(3) NULL,

    INDEX `sms_codes_phone_purpose_created_at_idx`(`phone`, `purpose`, `created_at`),
    INDEX `sms_codes_ip_created_at_idx`(`ip`, `created_at`),
    INDEX `sms_codes_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_usage_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NULL,
    `kind` VARCHAR(32) NOT NULL,
    `model` VARCHAR(64) NOT NULL,
    `input_tokens` INTEGER NOT NULL,
    `output_tokens` INTEGER NOT NULL,
    `cost_usd` DECIMAL(10, 6) NOT NULL,
    `latency_ms` INTEGER NOT NULL,
    `cached` BOOLEAN NOT NULL DEFAULT false,
    `success` BOOLEAN NOT NULL DEFAULT true,
    `error_code` VARCHAR(64) NULL,
    `input_hash` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_usage_logs_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `ai_usage_logs_kind_created_at_idx`(`kind`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `announcements_deleted_at_idx` ON `announcements`(`deleted_at`);

-- CreateIndex
CREATE INDEX `areas_deleted_at_idx` ON `areas`(`deleted_at`);

-- CreateIndex
CREATE INDEX `banners_deleted_at_idx` ON `banners`(`deleted_at`);

-- CreateIndex
CREATE INDEX `categories_deleted_at_idx` ON `categories`(`deleted_at`);

-- CreateIndex
CREATE INDEX `comments_deleted_at_idx` ON `comments`(`deleted_at`);

-- CreateIndex
CREATE INDEX `companies_deleted_at_idx` ON `companies`(`deleted_at`);

-- CreateIndex
CREATE INDEX `favorites_deleted_at_idx` ON `favorites`(`deleted_at`);

-- CreateIndex
CREATE INDEX `job_applications_deleted_at_idx` ON `job_applications`(`deleted_at`);

-- CreateIndex
CREATE INDEX `messages_deleted_at_idx` ON `messages`(`deleted_at`);

-- CreateIndex
CREATE INDEX `post_houses_deleted_at_idx` ON `post_houses`(`deleted_at`);

-- CreateIndex
CREATE INDEX `post_images_deleted_at_idx` ON `post_images`(`deleted_at`);

-- CreateIndex
CREATE INDEX `post_jobs_deleted_at_idx` ON `post_jobs`(`deleted_at`);

-- CreateIndex
CREATE INDEX `post_lifebizs_deleted_at_idx` ON `post_lifebizs`(`deleted_at`);

-- CreateIndex
CREATE INDEX `post_secondhands_deleted_at_idx` ON `post_secondhands`(`deleted_at`);

-- CreateIndex
CREATE INDEX `posts_deleted_at_idx` ON `posts`(`deleted_at`);

-- CreateIndex
CREATE INDEX `reports_deleted_at_idx` ON `reports`(`deleted_at`);

-- CreateIndex
CREATE INDEX `resumes_deleted_at_idx` ON `resumes`(`deleted_at`);

-- CreateIndex
CREATE INDEX `users_deleted_at_idx` ON `users`(`deleted_at`);
