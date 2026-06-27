-- CreateTable
CREATE TABLE `agreements` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(50) NOT NULL,
    `version` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NOT NULL,
    `effective_at` DATETIME(3) NOT NULL,
    `is_current` BOOLEAN NOT NULL DEFAULT false,
    `created_by` BIGINT NULL,
    `updated_by` BIGINT NULL,
    `deleted_by` BIGINT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `agreements_key_is_current_idx`(`key`, `is_current`),
    INDEX `agreements_deleted_at_idx`(`deleted_at`),
    UNIQUE INDEX `uniq_key_version`(`key`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
