-- =====================================================
-- MUST-18: MySQL FULLTEXT 索引
-- V1 简化版用空格分词；中文支持有限（V1.1 接 ES）
-- =====================================================
-- 注：FULLTEXT 索引不能用 Prisma @@index 直接定义，必须用原始 SQL
-- WITH PARSER ngram 支持中文（ngram_token_size 默认 2）

ALTER TABLE `posts` ADD FULLTEXT INDEX `ft_title_description`(`title`, `description`) WITH PARSER ngram;
