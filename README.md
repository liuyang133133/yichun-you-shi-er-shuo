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

## RBAC 守卫改造（T-003）

T-003 已上线：所有 `/admin/*` 端点加细粒度 `@RequirePermission` 装饰器 + 双层守卫（`AdminGuard` + `PermissionGuard`）。

**核心机制**：
- 每个端点必须显式声明 `@RequirePermission('post.audit.pass')` 才能被调用
- super_admin 短路：自动通过任意端点（不查 DB）
- 无权限 → 抛 403，前端 `api.ts` 显示 `[403] 需要权限: post.audit.pass`

**40 个权限码**（T-002 32 + T-003 新增 8）：
- 帖子 (8) / 评论 (2) / 举报 (2) / 用户 (5)
- 角色 (4) / 权限 (1)
- 公告 (4) / Banner (3)
- **分类 (4) T-003 新增** / **公司 (3) T-003 新增**
- 日志 (3) / 仪表盘 (1)

**兼容期**：`@Roles('admin')` 装饰器保留 1 个月（2026-07-25 截止），便于旧代码平滑迁移。

**端点权限码速查**：

| 模块 | 端点 | 权限码 |
|---|---|---|
| 帖子 | GET /admin/posts | `post.view` |
| 帖子 | POST /admin/posts/:id/audit | `post.audit.pass` / `post.audit.reject` |
| 帖子 | POST /admin/posts/:id/offline | `post.offline` |
| 帖子 | POST /admin/posts/audit-batch | `post.audit.batch` |
| 帖子 | POST /admin/posts/offline-batch | `post.offline.batch` |
| 帖子 | POST /admin/posts/purge | `post.purge` |
| 帖子 | POST /admin/posts/:id/restore | `post.restore` |
| 举报 | GET /admin/reports | `report.view` |
| 举报 | POST /admin/reports/:id/handle | `report.handle` |
| 用户 | GET /admin/users | `user.view` |
| 用户 | POST /admin/users/:id/ban | `user.ban` |
| 用户 | POST /admin/users/:id/unban | `user.unban` |
| 用户 | GET /admin/users/:id/roles | `user.viewRoles` |
| 用户 | POST /admin/users/:id/roles | `user.assignRole` |
| 用户 | DELETE /admin/users/:id/roles/:roleId | `user.assignRole` |
| 角色 | GET /admin/roles | `role.view` |
| 角色 | POST /admin/roles | `role.create` |
| 角色 | PATCH /admin/roles/:id | `role.update` |
| 角色 | DELETE /admin/roles/:id | `role.delete` |
| 角色 | PUT /admin/roles/:id/permissions | `role.update` |
| 权限 | GET /admin/permissions | `permission.view` |
| 公告 | GET /admin/announcements | `announcement.view` |
| 公告 | POST /admin/announcements | `announcement.create` |
| 公告 | PATCH /admin/announcements/:id | `announcement.update` |
| 公告 | DELETE /admin/announcements/:id | `announcement.delete` |
| 分类 | GET /admin/categories | `category.view` |
| 分类 | POST /admin/categories | `category.create` |
| 分类 | PATCH /admin/categories/:id | `category.update` |
| 分类 | DELETE /admin/categories/:id | `category.delete` |
| 公司 | GET /admin/companies | `company.view` |
| 公司 | POST /admin/companies/:id/verify | `company.verify` |
| 公司 | POST /admin/companies/:id/unverify | `company.unverify` |
| 仪表盘 | GET /admin/dashboard | `dashboard.view` |
| AI 用量 | GET /admin/ai-usage/stats | `aiUsage.view` |

详见 [CHANGELOG.md](CHANGELOG.md) 与 [docs/DATABASE.md](docs/DATABASE.md)。

## 文档

- [架构设计](docs/ARCHITECTURE.md) - V1 完整架构方案
- [开发任务清单](docs/ARCHITECTURE.md#6-claude-开发任务拆分) - 58 个任务，每个 ≤ 2h
- [T-010 WebSocket 设计](docs/t-010-websocket.md) - WS 网关 + Redis Adapter + 前端实时推送
- [CHANGELOG](CHANGELOG.md) - 变更日志

## WebSocket 网关（T-010）

T-010 已上线：Socket.IO Gateway + Redis Adapter + 前端实时通知。

**核心机制**：
- 命名空间 `/ws`，JWT 握手鉴权（`handshake.auth.token`）
- 每个连接 join `user:<sub>` room，`NotificationWsService.sendToUser()` 推送
- Redis Adapter 跨实例广播（pub + sub client）
- 前端 `useWs` Hook：socket.io-client 自动重连 + token 变化时重连
- NotificationBell 升级：收到 ws 推送立即 +1，未连接降级 30s 轮询

**消息约定**：
- `client → server`:  `ping` payload `{ ts }`
- `server → client`:  `connected` payload `{ userId, ts }`
- `server → client`:  `pong` payload `{ ts, serverTs }`
- `server → client`:  `notification` payload `{ event, data: { id, title, body, payload, priority, createdAt } }`

详见 [CHANGELOG.md](CHANGELOG.md) 与 [docs/t-010-websocket.md](docs/t-010-websocket.md)。

## 标签系统（T-013）

T-013 已上线：`Tag` 字典表 + `PostTag` 关联表 + 30 个伊春本地标签 seed。

**核心机制**：
- 公开 API：`GET /tags` / `GET /tags/hot` / `GET /tags/:slug` / `GET /tags/:slug/posts`
- 后台 API：`POST /admin/tags` / `PATCH /admin/tags/:id` / `DELETE /admin/tags/:id`
- 数据迁移：`POST /admin/tags/migrate-from-json` 把 `Post.tags` JSON 灌进 `PostTag`
- Post 端点：`POST /posts` body 加 `tagIds: number[]`（最多 5 个）
- Post 列表过滤：`GET /posts?tagIds=1,2,3` 或 `?tagSlugs=shanlin,xueshan`（AND 语义）
- `useCount` 冗余字段：事务内 +1/-1，避免 `count(PostTag)`

详见 [CHANGELOG.md](CHANGELOG.md) 与 [docs/t-013-tags.md](docs/t-013-tags.md)。
>>>>>>> feature/T-013-tags

## License

MIT
