-- CreateTable
CREATE TABLE `post_secondhands` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT NOT NULL,
    `category_name` VARCHAR(50) NOT NULL,
    `condition` VARCHAR(20) NOT NULL,
    `original_price` DECIMAL(10, 2) NULL,
    `trade_method` VARCHAR(30) NULL,
    `usage_duration` VARCHAR(50) NULL,

    UNIQUE INDEX `post_secondhands_post_id_key`(`post_id`),
    INDEX `post_secondhands_category_name_idx`(`category_name`),
    INDEX `post_secondhands_condition_idx`(`condition`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `post_secondhands` ADD CONSTRAINT `post_secondhands_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
