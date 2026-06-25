/**
 * T-002: 权限码常量
 *
 * 与 prisma/seed.ts 中的权限码一一对应。
 * 后端守卫用这些字符串做 @RequirePermission('post.audit.pass') 注解。
 *
 * ⚠️ 注意：改动这里后必须同步 prisma/seed.ts 后重新 seed，
 * 否则两端会不一致。
 */
export const PermissionCodes = {
  // 帖子
  POST_VIEW: 'post.view',
  POST_AUDIT_PASS: 'post.audit.pass',
  POST_AUDIT_REJECT: 'post.audit.reject',
  POST_AUDIT_BATCH: 'post.audit.batch',
  POST_OFFLINE: 'post.offline',
  POST_OFFLINE_BATCH: 'post.offline.batch',
  POST_RESTORE: 'post.restore',
  POST_PURGE: 'post.purge',
  // 评论
  COMMENT_VIEW: 'comment.view',
  COMMENT_DELETE: 'comment.delete',
  // 举报
  REPORT_VIEW: 'report.view',
  REPORT_HANDLE: 'report.handle',
  // 用户
  USER_VIEW: 'user.view',
  USER_BAN: 'user.ban',
  USER_UNBAN: 'user.unban',
  USER_VIEW_ROLES: 'user.viewRoles',
  USER_ASSIGN_ROLE: 'user.assignRole',
  // 角色
  ROLE_VIEW: 'role.view',
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',
  // 权限
  PERMISSION_VIEW: 'permission.view',
  // 公告
  ANNOUNCEMENT_VIEW: 'announcement.view',
  ANNOUNCEMENT_CREATE: 'announcement.create',
  ANNOUNCEMENT_UPDATE: 'announcement.update',
  ANNOUNCEMENT_DELETE: 'announcement.delete',
  // Banner
  BANNER_CREATE: 'banner.create',
  BANNER_UPDATE: 'banner.update',
  BANNER_DELETE: 'banner.delete',
  // 分类 (T-003 新增)
  CATEGORY_VIEW: 'category.view',
  CATEGORY_CREATE: 'category.create',
  CATEGORY_UPDATE: 'category.update',
  CATEGORY_DELETE: 'category.delete',
  // 公司 (T-003 新增)
  COMPANY_VIEW: 'company.view',
  COMPANY_VERIFY: 'company.verify',
  COMPANY_UNVERIFY: 'company.unverify',
  // 日志
  AUDIT_LOG_VIEW: 'auditLog.view',
  LOGIN_LOG_VIEW: 'loginLog.view',
  AI_USAGE_VIEW: 'aiUsage.view',
  // 仪表盘
  DASHBOARD_VIEW: 'dashboard.view',
} as const;

export type PermissionCode = typeof PermissionCodes[keyof typeof PermissionCodes];

/**
 * 系统预置角色 code
 */
export const SystemRoleCodes = {
  SUPER_ADMIN: 'super_admin',
  CONTENT_AUDITOR: 'content_auditor',
  CUSTOMER_SERVICE: 'customer_service',
  FINANCE: 'finance',
  OPERATOR: 'operator',
} as const;

export type SystemRoleCode = typeof SystemRoleCodes[keyof typeof SystemRoleCodes];
