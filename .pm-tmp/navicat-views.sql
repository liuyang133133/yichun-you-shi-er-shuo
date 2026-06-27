-- T-P1-SHOT-Navicat view: 让 Navicat SELECT 时自动显示 +8h 北京时间
-- 原因: Prisma 5 写 DATETIME 用 UTC 字符串（虽然 DATABASE_URL 有 timezone=+08:00 但 Prisma 5 已 deprecated 此参数）
-- 用法: Navicat 双击 view v_*_local, 看到的就是北京时间
-- 注意: 这是 VIEW, 不修改原表; 应用代码不受影响(应用已用 Intl.DateTimeFormat 转 +8h)

USE yichun_db;
DROP VIEW IF EXISTS v_sms_codes_local;
CREATE VIEW v_sms_codes_local AS
SELECT
  id,
  phone,
  code,
  attempts,
  consumed,
  consumed_at,
  -- 自动 +8h 转北京时间
  DATE_ADD(created_at, INTERVAL 8 HOUR) AS beijing_created_at,
  DATE_ADD(expires_at,  INTERVAL 8 HOUR) AS beijing_expires_at,
  IFNULL(DATE_ADD(consumed_at, INTERVAL 8 HOUR), NULL) AS beijing_consumed_at
FROM sms_codes;

-- 通用: 给所有表都加 view (按需)
DROP VIEW IF EXISTS v_users_local;
CREATE VIEW v_users_local AS
SELECT
  id, phone, nickname, role, status,
  DATE_ADD(last_login_at, INTERVAL 8 HOUR) AS beijing_last_login_at,
  DATE_ADD(created_at, INTERVAL 8 HOUR) AS beijing_created_at,
  DATE_ADD(updated_at, INTERVAL 8 HOUR) AS beijing_updated_at
FROM users;

DROP VIEW IF EXISTS v_posts_local;
CREATE VIEW v_posts_local AS
SELECT
  id, user_id, category_id, area_id, type, title, status, audit_status,
  DATE_ADD(created_at, INTERVAL 8 HOUR) AS beijing_created_at,
  DATE_ADD(updated_at, INTERVAL 8 HOUR) AS beijing_updated_at
FROM posts;

DROP VIEW IF EXISTS v_audit_logs_local;
CREATE VIEW v_audit_logs_local AS
SELECT
  id, admin_user_id, module, action, target_type, target_id, reason, metadata,
  DATE_ADD(created_at, INTERVAL 8 HOUR) AS beijing_created_at
FROM audit_logs;
