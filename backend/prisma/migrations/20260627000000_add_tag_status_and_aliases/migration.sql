-- =====================================================
-- T-015: 标签后台管理 — 加 status (停用) + aliases (别名) 字段
-- =====================================================
-- 设计要点：
--   - status: 1=启用 0=禁用（独立于 deletedAt）
--     停用 = status=0, deletedAt=null (admin 可重新启用, 数据保留)
--     已删 = deletedAt 非空 (admin 软删, 数据保留 30 天)
--   - aliases: 逗号分隔字符串, 用于 TagSelector 搜索联想
--   - 已有 30 seed 全部 status=1 (启用), 无需数据回填

-- 1) 加列
ALTER TABLE `tags`
  ADD COLUMN `status`  TINYINT      NOT NULL DEFAULT 1 COMMENT '1=启用 0=禁用' AFTER `sort_order`,
  ADD COLUMN `aliases` VARCHAR(500) NULL                COMMENT '别名(CSV,用于搜索联想)' AFTER `description`;

-- 2) 加 status 索引(便于按状态过滤)
CREATE INDEX `idx_tag_status` ON `tags` (`status`);
