-- CreateTable
CREATE TABLE `post_lifebizs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT NOT NULL,
    `sub_category` VARCHAR(50) NOT NULL,
    `service_type` VARCHAR(20) NOT NULL,
    `price` DECIMAL(10, 2) NULL,
    `price_text` VARCHAR(50) NULL,
    `validity_period` VARCHAR(20) NULL,
    `expire_at` DATETIME(3) NULL,

    UNIQUE INDEX `post_lifebizs_post_id_key`(`post_id`),
    INDEX `post_lifebizs_sub_category_idx`(`sub_category`),
    INDEX `post_lifebizs_service_type_idx`(`service_type`),
    INDEX `post_lifebizs_expire_at_idx`(`expire_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `post_lifebizs` ADD CONSTRAINT `post_lifebizs_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
