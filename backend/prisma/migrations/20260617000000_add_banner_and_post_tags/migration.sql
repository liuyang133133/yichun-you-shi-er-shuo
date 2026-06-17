-- =====================================================
-- T1: Banner 运营位 + Post.tags 季节标签
-- =====================================================

CREATE TABLE `banners` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(100) NOT NULL,
  `image_url` VARCHAR(500) NOT NULL,
  `link_type` VARCHAR(20) NOT NULL DEFAULT 'url',
  `link_target` VARCHAR(500) NOT NULL DEFAULT '',
  `position` VARCHAR(30) NOT NULL DEFAULT 'home_top',
  `sort_order` INT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `starts_at` DATETIME(3) NULL,
  `ends_at` DATETIME(3) NULL,
  `created_by` BIGINT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `banners_position_status_sort_order_idx`(`position`, `status`, `sort_order`),
  INDEX `banners_starts_at_ends_at_idx`(`starts_at`, `ends_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Post 加 tags 字段（季节频道标签：山野菜 / 雪地胎 / 避暑房等）
ALTER TABLE `posts` ADD COLUMN `tags` JSON NULL;
