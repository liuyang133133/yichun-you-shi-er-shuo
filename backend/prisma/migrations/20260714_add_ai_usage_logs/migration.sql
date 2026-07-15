-- [P0-AUDIT-2026-07-14] P0-5: ai_usage_logs 表在 schema.prisma 有定义但 DB 没建.
-- 之前 drop_ai_features migration 标 finished 但 ai_usage_logs 实际还在用 (AI 发帖服务调用).
-- 修复: 建表 + 2 个 index, 跟 schema.prisma 一致.

CREATE TABLE IF NOT EXISTS `ai_usage_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NULL,
  `kind` VARCHAR(32) NOT NULL COMMENT 'extract | suggest-title | classify | smart-fill',
  `model` VARCHAR(64) NOT NULL COMMENT 'claude-haiku-4-5-20251001 | glm-4-air | ...',
  `input_tokens` INT NOT NULL,
  `output_tokens` INT NOT NULL,
  `cost_usd` DECIMAL(10, 6) NOT NULL,
  `latency_ms` INT NOT NULL,
  `cached` BOOLEAN NOT NULL DEFAULT false,
  `success` BOOLEAN NOT NULL DEFAULT true,
  `error_code` VARCHAR(64) NULL,
  `input_hash` VARCHAR(64) NULL COMMENT 'sha256(rawText), 用于审计去重',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ai_usage_logs_user_id_created_at_idx`(`user_id`, `created_at`),
  INDEX `ai_usage_logs_kind_created_at_idx`(`kind`, `created_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;