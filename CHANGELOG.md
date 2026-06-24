# Changelog

伊春有事儿说 所有重要变更记录在此。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [Unreleased] — T-001 软删除 + 审计字段

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
