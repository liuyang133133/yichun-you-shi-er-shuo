-- =====================================================
-- T-P15-02 V1: SEO 三件套 — Category / Area 加 slug + TDK 字段，Post 加 slug (V2 预留)
-- =====================================================
-- 设计要点：
--   - categories 加 slug @unique + seo_title/seo_keywords/seo_description（SEO 三件套）
--   - areas 加 slug @unique + seo_title/seo_keywords/seo_description
--   - posts 加 slug (nullable, V2 用) + @@index([slug])
--   - slug unique 仅在 seed 写入时保证；运行时手动创建 category/area 若冲突返回 P2002
--   - TDK 字段全部 nullable，seed 回填兜底（参考 seo-tdk.seed.ts）

-- 1) categories 加 SEO 字段
ALTER TABLE `categories`
  ADD COLUMN `slug`             VARCHAR(60)  NULL,
  ADD COLUMN `seo_title`        VARCHAR(200) NULL,
  ADD COLUMN `seo_keywords`     VARCHAR(300) NULL,
  ADD COLUMN `seo_description`  VARCHAR(500) NULL;

CREATE UNIQUE INDEX `categories_slug_key` ON `categories` (`slug`);

-- 2) areas 加 SEO 字段
ALTER TABLE `areas`
  ADD COLUMN `slug`             VARCHAR(60)  NULL,
  ADD COLUMN `seo_title`        VARCHAR(200) NULL,
  ADD COLUMN `seo_keywords`     VARCHAR(300) NULL,
  ADD COLUMN `seo_description`  VARCHAR(500) NULL;

CREATE UNIQUE INDEX `areas_slug_key` ON `areas` (`slug`);

-- 3) posts 加 slug（V2 预留，nullable 不加 unique）
ALTER TABLE `posts`
  ADD COLUMN `slug` VARCHAR(120) NULL;

CREATE INDEX `posts_slug_idx` ON `posts` (`slug`);