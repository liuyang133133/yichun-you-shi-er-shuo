# 伊春有事儿说

> 面向伊春本地居民的信息发布平台 - 房屋出租 / 二手交易 / 招聘求职 / 便民信息

## 项目状态

🚧 **V1 开发中** - 架构设计已完成，详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 15 + TypeScript + TailwindCSS + Shadcn UI |
| 移动端 | H5 响应式（V1）/ 微信小程序（V2） |
| 后端 | NestJS + Prisma |
| 数据库 | MySQL 8 |
| 缓存 | Redis 7 |
| 部署 | Docker Compose |

## 仓库结构

```
.
├── backend/       # NestJS 后端
├── frontend/      # Next.js 15 用户端
├── admin/         # Next.js 15 管理后台
├── docs/          # 文档
└── docker/        # Docker 配置
```

## 快速开始

> 待 T1.2 完成后补充

## 软删除（T-001）

T-001 已上线：18 张业务表统一添加 `deletedAt` / `createdBy` / `updatedBy` / `deletedBy` 字段及 `@@index([deletedAt])`。

**核心机制**：
- Prisma 中间件自动注入 `deletedAt: null` 过滤，业务侧无感
- 通过 `where.includeDeleted: true` 显式绕过过滤（仅 admin 后台使用）
- 4 张日志表（AuditLog / LoginLog / ViewLog / AiUsageLog / SitemapPushLog）+ SmsCode 不参与软删

**Admin 端点**：
- `GET /api/v1/admin/posts?includeDeleted=true` — 包含已软删
- `POST /api/v1/admin/posts/:id/restore` — 恢复已软删的 post

**Cron 清理**：
- `POST /api/v1/admin/posts/purge` — 硬清 30 天前软删的 post（不可恢复）

## RBAC（T-002）

T-002 已上线：4 张 RBAC 表 + 5 预置角色 + 32 权限码 + 62 关联。

**核心机制**：
- `@RequirePermission('post.audit.pass')` 装饰器 + `PermissionGuard` 守卫
- `RbacService.getUserPermissions(userId)` 查用户拥有的所有权限码
- super_admin 短路：自动拥有全部 32 个权限
- 兼容期 1 个月：`User.role` 字符串字段保留，与 `UserRole` 表并存

**预置角色**：
- `super_admin` — 全部权限
- `content_auditor` — 帖子 / 评论 / 举报 (12 权限)
- `customer_service` — 用户 / 评论 / 举报 (7 权限)
- `finance` — post.view + dashboard.view (2 权限)
- `operator` — Banner / 公告 / 推送 / 仪表盘 (9 权限)

**Admin 端点**：
- `GET /api/v1/admin/roles` — 角色列表
- `PUT /api/v1/admin/roles/:id/permissions` — 全量替换角色权限
- `GET /api/v1/admin/permissions` — 权限码列表
- `POST /api/v1/admin/users/:id/roles` — 分配角色
- `DELETE /api/v1/admin/users/:id/roles/:roleId` — 撤销角色

详见 [CHANGELOG.md](CHANGELOG.md) 与 [docs/DATABASE.md](docs/DATABASE.md)。

## 文档

- [架构设计](docs/ARCHITECTURE.md) - V1 完整架构方案
- [开发任务清单](docs/ARCHITECTURE.md#6-claude-开发任务拆分) - 58 个任务，每个 ≤ 2h
- [CHANGELOG](CHANGELOG.md) - 变更日志

## License

MIT
