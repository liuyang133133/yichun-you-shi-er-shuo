-- =====================================================
-- T10: AI 智能发布 Phase 2 - Post 字段扩展 + SitemapPushLog
-- =====================================================

-- AlterTable: Post 增加 6 个字段（SEO + 质量分 + 商业识别 + 置顶）
ALTER TABLE `posts` ADD COLUMN `seo_meta` JSON NULL,
                     ADD COLUMN `quality_score` INTEGER NULL,
                     ADD COLUMN `seo_meta_updated_at` DATETIME(3) NULL,
                     ADD COLUMN `is_business` BOOLEAN NULL,
                     ADD COLUMN `business_type` VARCHAR(32) NULL,
                     ADD COLUMN `boost_expires_at` DATETIME(3) NULL;

-- CreateIndex: 4 个新索引（SEO 重生成 / 质量分 / 商业识别 / 置顶过期）
CREATE INDEX `posts_seo_meta_updated_at_idx` ON `posts`(`seo_meta_updated_at`);
CREATE INDEX `posts_quality_score_idx` ON `posts`(`quality_score`);
CREATE INDEX `posts_is_business_business_type_idx` ON `posts`(`is_business`, `business_type`);
CREATE INDEX `posts_boost_expires_at_idx` ON `posts`(`boost_expires_at`);

-- CreateTable: SitemapPushLog 推送日志
CREATE TABLE `sitemap_push_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `target` VARCHAR(16) NOT NULL,
  `postIds` JSON NOT NULL,
  `status` VARCHAR(16) NOT NULL,
  `response` TEXT NULL,
  `pushed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `sitemap_push_logs_target_pushed_at_idx`(`target`, `pushed_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;