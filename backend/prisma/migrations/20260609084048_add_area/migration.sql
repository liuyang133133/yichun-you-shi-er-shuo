-- CreateTable
CREATE TABLE `areas` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `parent_id` BIGINT NULL,
    `name` VARCHAR(50) NOT NULL,
    `level` TINYINT NOT NULL DEFAULT 1,
    `ad_code` VARCHAR(20) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `areas_parent_id_sort_order_idx`(`parent_id`, `sort_order`),
    INDEX `areas_ad_code_idx`(`ad_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `areas` ADD CONSTRAINT `areas_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `areas`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
