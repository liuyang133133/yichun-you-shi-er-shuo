-- =====================================================
-- T-013: 标签系统 — Tag / PostTag 关联表
-- =====================================================
-- 设计要点：
--   - tags 表：标签字典（slug unique / name / description / useCount 冗余）
--   - post_tags 表：帖子-标签多对多关联（uniq_post_tag 防重复）
--   - useCount 是冗余字段，写入 PostTag 时事务内 +1/-1
--   - 保留期 1 个月后删除 Post.tags JSON 字段（V1 兼容季节频道标签）

-- 1) tags 字典表
CREATE TABLE `tags` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT,
  `slug`        VARCHAR(50)  NOT NULL,
  `name`        VARCHAR(50)  NOT NULL,
  `description` VARCHAR(500) NULL,
  `use_count`   INT          NOT NULL DEFAULT 0,
  `is_hot`      TINYINT(1)   NOT NULL DEFAULT 0,
  `sort_order`  INT          NOT NULL DEFAULT 0,
  `created_by`  BIGINT       NULL,
  `updated_by`  BIGINT       NULL,
  `deleted_by`  BIGINT       NULL,
  `deleted_at`  DATETIME(3)  NULL,
  `created_at`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3)  NOT NULL,

  UNIQUE KEY `tags_slug_key` (`slug`),
  INDEX `tags_use_count_idx` (`use_count`),
  INDEX `tags_is_hot_idx` (`is_hot`),
  INDEX `tags_deleted_at_idx` (`deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2) post_tags 关联表
CREATE TABLE `post_tags` (
  `id`         BIGINT      NOT NULL AUTO_INCREMENT,
  `post_id`    BIGINT      NOT NULL,
  `tag_id`     BIGINT      NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE KEY `uniq_post_tag` (`post_id`, `tag_id`),
  INDEX `post_tags_post_id_idx` (`post_id`),
  INDEX `post_tags_tag_id_idx` (`tag_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `post_tags_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `post_tags_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 注：Post.tags JSON 字段保留 1 个月（用于兼容季节频道标签：山野菜/雪地胎/避暑房等自由字符串）
-- 2026-07-26 后单独 PR 删除该字段