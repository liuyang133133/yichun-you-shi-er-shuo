# Changelog

伊春有事儿说 所有重要变更记录在此。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [Unreleased] — T-002 RBAC 角色 / 权限 / 关联表

### Added
- T-002: 4 张 RBAC 表 `Role` / `Permission` / `UserRole` / `RolePermission`
- T-002: 5 个预置角色 seed: `super_admin` / `content_auditor` / `customer_service` / `finance` / `operator`
- T-002: 32 个权限码 seed（按 12 个模块分组：post / comment / report / user / role / permission / announcement / banner / auditLog / loginLog / aiUsage / dashboard）
- T-002: 62 条角色-权限关联 seed
- T-002: `RbacService` 提供 `getUserPermissions / userHasPermission / userHasAnyPermission / assignRole / revokeRole / listRolePermissions / setRolePermissions`
- T-002: `PermissionGuard` + `@RequirePermission('post.audit.pass')` 装饰器
- T-002: API 端点：
  - `GET /api/v1/admin/roles` (CRUD)
  - `GET /api/v1/admin/roles/:id/permissions`
  - `PUT /api/v1/admin/roles/:id/permissions` (全量替换)
  - `GET /api/v1/admin/permissions` (按 module 过滤)
  - `GET /api/v1/admin/permissions/modules`
  - `GET /api/v1/admin/users/:id/roles`
  - `POST /api/v1/admin/users/:id/roles` (分配)
  - `DELETE /api/v1/admin/users/:id/roles/:roleId` (撤销)
- T-002: 单元测试 `rbac.service.spec.ts`（10 case）
- T-002: 单元测试 `admin-role.service.spec.ts`（9 case）
- T-002: Playwright E2E `admin/e2e/admin-rbac.spec.ts`（9 case）

### Database
- 新增迁移 `20260624145040_add_rbac`：4 张表 + 索引 + 5 角色 + 32 权限 + 62 关联

### Notes
- 兼容期 1 个月：`User.role` 字符串字段保留，与 `UserRole` 表并存
- super_admin 短路：自动拥有所有 32 个权限码（不查 DB）
- 系统预置角色（isSystem=true）不可软删

## [T-001] 软删除 + 审计字段 (2026-06-24)

### Added
- T-001: 18 张业务表新增 `deletedAt` / `createdBy` / `updatedBy` / `deletedBy` 字段 + `@@index([deletedAt])`（User / Category / Post / Area / PostImage / Favorite / Comment / Report / PostHouse / PostSecondhand / PostLifebiz / Company / PostJob / Resume / JobApplication / Message / Announcement / Banner）
- T-001: Prisma 中间件（`PrismaService.$use`）自动为所有列表类查询（findUnique / findFirst / findMany / count / aggregate / groupBy）注入 `where.deletedAt = null`；`findUnique` 自动改写为 `findFirst`
- T-001: 支持 `where.includeDeleted = true` 显式绕过软删除过滤（仅供 admin 后台使用）
- T-001: `POST /api/v1/admin/posts/:id/restore` 恢复已软删的 post + 写 `AuditLog`
- T-001: `GET /api/v1/admin/posts?includeDeleted=true` 包含已软删
- T-001: `User.remove` / `AdminPostService.offline` / `offlineBatch` 同步写 `deletedAt` / `deletedBy` / `updatedBy` 审计字段
- T-001: 管理后台 `/posts` 页面新增「包含已删除」复选框 + 「恢复」按钮
- T-001: 单元测试 `prisma.service.spec.ts`（9 case）
- T-001: 单元测试 `admin-post.service.spec.ts`（8 case）
- T-001: Playwright E2E `admin/e2e/admin-posts-soft-delete.spec.ts`（2 case）

### Database
- 新增迁移 `20260624133637_add_soft_delete_and_audit_fields`：18 张表添加 4 字段 + 索引

### Notes
- 4 张日志表（AuditLog / LoginLog / ViewLog / AiUsageLog / SitemapPushLog）+ SmsCode **不**应用软删除中间件
- 业务侧如需绕过中间件：`prisma.post.findFirst({ where: { includeDeleted: true } as any })`
- 已软删的 post 由 `POST /api/v1/admin/posts/purge` 在 30 天后硬清（不可恢复）

## 之前版本

无
