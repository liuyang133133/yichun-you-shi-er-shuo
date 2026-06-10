-- CreateTable
CREATE TABLE `post_houses` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT NOT NULL,
    `rental_type` VARCHAR(20) NOT NULL,
    `property_type` VARCHAR(20) NOT NULL,
    `decoration` VARCHAR(20) NULL,
    `area_sqm` DECIMAL(8, 2) NULL,
    `rooms` TINYINT NULL,
    `living_rooms` TINYINT NULL,
    `bathrooms` TINYINT NULL,
    `floor_info` VARCHAR(50) NULL,
    `orientation` VARCHAR(50) NULL,
    `building_year` INTEGER NULL,
    `community_name` VARCHAR(100) NULL,
    `address` VARCHAR(255) NULL,
    `longitude` DECIMAL(10, 6) NULL,
    `latitude` DECIMAL(10, 6) NULL,
    `facilities` JSON NULL,

    UNIQUE INDEX `post_houses_post_id_key`(`post_id`),
    INDEX `post_houses_rental_type_idx`(`rental_type`),
    INDEX `post_houses_property_type_idx`(`property_type`),
    INDEX `post_houses_area_sqm_idx`(`area_sqm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `post_houses` ADD CONSTRAINT `post_houses_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
