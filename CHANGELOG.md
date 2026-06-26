# Changelog

伊春有事儿说 所有重要变更记录在此。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [Unreleased] — T-015 标签后台管理

### Added
- **T-015 数据库迁移（20260627000000_add_tag_status_and_aliases）**：
  - `tags.status` TINYINT NOT NULL DEFAULT 1（1=启用 0=禁用）— 区分"停用"和"已删"
  - `tags.aliases` VARCHAR(500) NULL — 别名（CSV，用于 TagSelector 搜索联想）
  - `idx_tag_status` 索引
- **T-015 后端 API**：
  - `GET /admin/tags?q=&includeDeleted=&includeDisabled=&page=&pageSize=` — admin 全列表（支持 q 多字段 OR 搜索 + 2 维度过滤 + 分页）
  - `POST /admin/tags/:id/merge` body `{ targetId }` — 合并 source → target（事务内，source 软删+停用）
  - `CreateTagDto` / `UpdateTagDto` 加 `aliases` / `status` 字段
- **T-015 公开 API 行为变更**：
  - `GET /tags` / `GET /tags/:slug` / `GET /tags/hot` 加 `status: 1` 过滤 — 停用标签对前台隐藏（验收 ②）
- **T-015 admin UI**：
  - `/admin/tags` 标签管理页 — 列表 + 表格 + 搜索 + 包含已删/已停用 2 复选框 + 状态 chip 三态（启用/停用/已删）+ 操作图标（⭐热门 / ✏编辑 / ⚡停用 / 🔀合并 / 🗑删除）
  - 创建/编辑模态：slug / name / description / aliases / sortOrder / status / isHot
  - 合并模态：源预览 + 目标搜索下拉 + 二次确认 + 不可恢复警告
- **T-015 admin 侧边栏**：系统管理子菜单加"标签管理"项（Tag 图标）
- **T-015 admin API 客户端**：`adminTagApi.list / create / update / remove / merge` 5 方法 + `AdminTag` 类型
- **T-015 测试**：
  - 后端 tag.service 单测 20 → 30（+10 新用例：findAllForAdmin 4 + merge 6）
  - 现有 4 个单测更新 status: 1 断言

### Notes
- 后端 tsc 4 个预存在错误（admin/company + Throttle）依然存在，与 T-015 无关
- admin tsc 0 错
- admin build 失败：pre-existing 问题（`admin/src/app/globals.css` 引用 `../../../../frontend/src/styles/tokens.css` 4 级相对路径在 worktree 嵌套目录无法解析；主 worktree 因 webpack 缓存可通过），需独立任务修复
- 30 seed 标签全部 status=1 默认启用，公开 API 行为对前台无变化

## [Unreleased] — T-014 标签前端

### Added
- **T-013b（前置）**：补全 `PostService.findOne / findAll / findMyPosts / create` 5 处 `include: { postTags: { include: { tag: { select: { id, slug, name } } } } }` — 让前端 PostCard / 详情页 / /me/posts 列表能拿到 tags
- **T-014 公开页**：
  - `/tags` 列表页 — 热门标签云（20 个）+ 全部标签 grid（100 个，按 useCount 排序）+ 实时搜索（按 name/slug）
  - `/tags/[slug]` 详情页 — 标签 Hero（name + description + useCount）+ 关联帖子分页列表（复用 PostCard）
- **T-014 组件**：
  - `TagSelector` — 标签多选选择器（搜索 + 热门联想 + 已选 pill + max=5 限制 + ARIA combobox）
- **T-014 集成点**：
  - 发布页（手动模式）step 2 加 TagSelector + 提交 body 加 `tagIds: number[]`
  - AI 模式 goToManual 预填 tagIds（CSV "1,2,3" → number[]，T-015 之后 AI 会传具体标签）
  - 首页/列表页 sticky 筛选条下方加热门标签 chip 条（最多 12 个，水平滚动）
  - 选中标签后 URL 自动同步 `?tag=<slug>`，列表自动按 tagSlugs 过滤
  - PostCard 显示前 3 个标签 chip（`#标签名` 风格，emerald 色）
  - 帖子详情页底部加标签 chip 行（带链接跳 /tags/[slug]）
- **T-014 前端 API 客户端**：
  - `tagApi.list / hot / get / posts` — 4 个公开 API
  - `postApi.list` 增 `tagIds?: number[]; tagSlugs?: string[]` 参数（逗号分隔传递）
- **T-014 测试**：
  - frontend 首次引入 Playwright（`@playwright/test` devDep）
  - `frontend/playwright.config.ts` + `frontend/e2e/tag-flow.spec.ts`（4 个用例：列表 / 详情 / 过滤 / 发布 selector 渲染）
  - 后端 post.service 补 3 个 T-013b 单测（findOne include / findAll include / findAll tagIds AND），单测从 2 → 5 通过

### Notes
- 后端 tsc 仅剩 4 个预存在错误（admin/company 缺失文件 + post.service.RegisterThrottleService 方法缺失），与 T-014 无关
- jest.config 启用 `diagnostics: false` + `isolatedModules: true` 跳过预存在类型错误
- API 响应体积略增（每个 post 多一个 ≤5 元素的 postTags 数组），缓存 key 不变
- `dynamic = 'force-dynamic'` 加到 `/tags` 和 `/tags/[slug]` page（避免 useSearchParams CSR bailout）

## [Unreleased] — T-013 标签系统 — 数据库 + 迁移

### Added
- T-013: 数据库 2 新表
  - `Tag` - 标签字典（slug unique / name / description / useCount 冗余 / isHot / sortOrder / 软删）
  - `PostTag` - 帖子-标签多对多关联（uniq_post_tag 防重复打标 / FK CASCADE）
- T-013: `TagService`
  - `findAll` / `findBySlug` / `findHot` - 公开 API
  - `create` / `update` / `delete` - 后台（slug 冲突自动 -2/-3 后缀，update 不允许改 slug）
  - `attachToPost` / `detachFromPost` - 事务内 insert/delete PostTag + 维护 tag.useCount
  - `findPostsByTag` - 标签详情页用（带分页）
  - `migrateFromJson` - 一次性从 Post.tags JSON 字段迁移到 PostTag
- T-013: `TagController` 公开 4 API + `AdminTagController` 后台 4 API（含 migrate-from-json）
- T-013: `PostModule` import `TagModule`；`PostService.create` 调用 `attachToPost` 同步 PostTag
- T-013: `PostService.findAll` 支持 `tagIds` / `tagSlugs` 过滤（AND 语义）
- T-013: `ListPostQueryDto` 加 `tagIds`（逗号分隔） + `tagSlugs` 字段
- T-013: `CreatePostDto` 加 `tagIds: number[]`（最多 5 个）
- T-013: seed 30 个伊春本地标签（4 季节频道 + 6 本地特产 + 4 房屋 + 4 二手 + 4 招聘 + 4 便民 + 4 综合）

### Notes
- 单测 20/20 通过（findAll 3 / findBySlug 2 / findHot 2 / create 3 / update 2 / delete 2 / PostTag 3 / findPostsByTag 1 / migrate 2）
- 后端 tsc 0 错误（T-013 模块本身）；4 预存在错误（T-018 已知：admin/company + Throttle）
- `Post.tags` JSON 字段保留 1 个月（2026-07-26 后单独 PR 删除）
- `useCount` 是冗余字段：attachToPost 时 +1，detachFromPost 时 -1（简化：重复 P2002 跳过 +1）
- slug 唯一冲突：service 自动加 `-2` / `-3` / ... 后缀（admin 提示）
- AND 过滤通过 `where.AND = [{postTags:{some:{tagId:t1}}}, {postTags:{some:{tagId:t2}}}]` 实现（Prisma 不支持 every over relation）

## [Unreleased] — T-008 通知前端 — Header 红点 + 通知中心

### Added
- T-008: `lib/notifications.ts` — 通知 API 客户端（list / unreadCount / markRead / markAllRead / remove / listSettings / upsertSetting / registerDevice / unregisterDevice）
- T-008: `lib/use-unread-count.ts` — 未读数 Hook（30s 自动轮询 + 路由切换刷新 + 401 静默停止）
- T-008: `components/layout/notification-bell.tsx` — Header 铃铛组件（未读红点 + >99 显示 99+）
- T-008: `app/me/notifications/page.tsx` — 通知中心列表（全部 / 未读 tabs + 分页 + 全部已读 + 单条删除 + payload.url 跳转）
- T-008: `app/me/notifications/settings/page.tsx` — 偏好设置页（8 事件开关 + 全局开关 + 静默时段 quietHours）
- T-008: Header 加 `NotificationBell`（登录用户可见）+ 移动端抽屉 / 桌面下拉菜单加「通知中心」入口
- T-008: `lib/api.ts` 加 `put<T>` 方法（用于 PUT /notifications/settings/:event）

### Notes
- 30s 轮询可在 Network 面板验证；V1.2 接 WebSocket（T-010）后改为推送
- 紧急通知（priority ≥ 4）不受 quietHours 降级影响
- `useUnreadCount` 在 401 时静默停止轮询，避免错误日志噪音
- 通知中心点击 payload.url 跳转（如评论通知跳帖子详情页）

## [T-007] 通知系统 — 数据库 + 后端服务 (2026-06-25)

### Added
- T-007: 数据库 4 新表
  - `NotificationTemplate` - 通知模板（含变量占位符 / enabled / priority）
  - `Notification` - 用户通知（site 渠道 / readAt / 软删）
  - `UserNotificationSetting` - 用户偏好（按 event 开关 / 静默时段 quietHours）
  - `DeviceToken` - 推送设备 Token（platform / token / deviceId）
- T-007: `NotificationService.emit()` — 8 类事件模板（comment / audit / order / auth / system / appeal / follow / invite）
- T-007: 偏好降级：enabled=false 跳过；quietHours 内 priority < 4 自动降级到 1
- T-007: `UserNotificationSettingService` - 8 类事件偏好增删改查
- T-007: `DeviceTokenService` - register / unregister / list（V1.1 用于推送）
- T-007: `NotificationModule` (@Global) — 其他模块可注入 `NotificationService.emit()`
- T-007: 9 用户端 API：
  - `GET /notifications/me` - 列表（unreadOnly + 分页）
  - `GET /notifications/unread-count` - 未读数
  - `POST /notifications/:id/read` - 标记已读
  - `POST /notifications/read-all` - 全部已读
  - `DELETE /notifications/:id` - 软删
  - `GET /notifications/settings` - 偏好列表（8 类）
  - `PUT /notifications/settings/:event` - 更新偏好
  - `POST /devices/register` - 注册推送 Token
  - `DELETE /devices/:token` - 注销 Token
- T-007: 单元测试 `notification.service.spec.ts`（19 case：emit / 8 事件 / 偏好 / 静默时段 / 设备 Token）
- T-007: Playwright E2E `notifications.spec.ts`（10 case：9 API + 401）

### Notes
- V1 简化：emit 同步写库（无 Bull Queue），启动性能足够
- T-010 WebSocket 接入后扩展 Redis Pub/Sub 实时推送
- `NotificationTemplate` 表预留字段（V1.1 实现模板编辑后台）
- 8 类事件中 `order` / `follow` 占位（T-029 / T-044 实现）

## [T-006] 后台登录日志查询页 (2026-06-25)

### Added
- T-006: 新模块 `AdminLoginLogModule`：
  - `AdminLoginLogService.findAll` - 6 筛选（userId/phone/ip/status/from/to）
  - `AdminLoginLogService.findOne` - 详情
  - `AdminLoginLogService.listOptions` - 下拉数据（status 分组）
  - `AdminLoginLogService.detectAbnormalIps` - 异常 IP 检测（1h 内失败 ≥ 5 次）
  - `AdminLoginLogService.exportCsv` - CSV 导出（10000 行限 + BOM + 10 字段）
- T-006: API 端点：
  - `GET /admin/login-logs` - 列表
  - `GET /admin/login-logs/options` - 下拉数据
  - `GET /admin/login-logs/abnormal-ips` - 异常 IP 列表
  - `GET /admin/login-logs/export` - CSV 导出
  - `GET /admin/login-logs/:id` - 详情
- T-006: 后台新页面 `/admin/login-logs`（系统管理菜单）+ 6 筛选 + 异常 IP 红框高亮 + 失败行红色背景 + CSV 导出
- T-006: 单元测试 `admin-login-log.service.spec.ts`（19 case：findAll / 6 筛选 / findOne / listOptions / detectAbnormalIps / exportCsv）
- T-006: Playwright E2E `admin/e2e/admin-login-logs.spec.ts`（8 case：列表 / 6 筛选 / 异常 IP / 详情 / CSV / 登录失败触发）

### Notes
- 异常 IP 检测：默认窗口 1 小时，阈值 5 次失败
- 前端每 60s 自动刷新异常 IP 列表
- 失败行用红色背景 + 红框区分；成功行正常样式

## [T-005] 后台操作日志查询页 (2026-06-25)

### Added
- T-005: 数据库 `AuditLog` 加 5 字段：
  - `beforeSnapshot` (Json) — 变更前快照
  - `afterSnapshot` (Json) — 变更后快照
  - `requestId` (VarChar 64) — 请求 ID（从 header `x-request-id` 或生成 UUID）
  - `ip` (VarChar 45) — 客户端 IP（从 `x-forwarded-for` 或 socket）
  - `userAgent` (VarChar 500) — User-Agent
  - `@@index([createdAt])` — 按时间查询性能
- T-005: 新模块 `AdminAuditLogModule`：
  - `AdminAuditLogService.findAll` — 7 筛选 + 列表 + 排序
  - `AdminAuditLogService.findOne` — 详情
  - `AdminAuditLogService.listModules` — 下拉数据（modules/actions/targetTypes）
  - `AdminAuditLogService.exportCsv` — CSV 导出（含 BOM + 16 字段 + 10000 行限）
- T-005: `AuditLogWriter` 服务 — 自动从 `@Inject(REQUEST)` 填充 ip/userAgent/requestId
- T-005: 后台新页面 `/admin/audit-logs`（系统管理菜单）+ 7 筛选 + 详情抽屉 + CSV 导出
- T-005: API 端点：
  - `GET /admin/audit-logs` — 列表
  - `GET /admin/audit-logs/options` — 下拉数据
  - `GET /admin/audit-logs/export` — CSV
  - `GET /admin/audit-logs/:id` — 详情
- T-005: 单元测试 `admin-audit-log.service.spec.ts`（17 case：findAll / 7 筛选 / findOne / listModules / exportCsv）
- T-005: Playwright E2E `admin/e2e/admin-audit-logs.spec.ts`（8 case：列表 + 7 筛选 + 详情 + CSV）

### Notes
- 现有 AuditLog 写入点（~12 处）暂未迁移到 AuditLogWriter，新字段对历史数据为 NULL
- CSV 导出限 10000 行（防 OOM），超出会被截断
- BOM (`﻿`) 让 Excel 正确识别 UTF-8 编码

## [T-004] RBAC 后台 UI（角色 / 权限 / 管理员列表） (2026-06-25)

### Added
- T-004: 后台 3 个新页面 + 系统管理菜单分组
  - `/admin/roles` - 角色管理（CRUD + 权限分配抽屉）
  - `/admin/permissions` - 权限管理（只读视图，按模块分组）
  - `/admin/admin-users` - 管理员列表（含 RBAC 角色展示 + 分配 / 撤销）
- T-004: API 扩展 `GET /admin/users?withRoles=true` 一次性返回用户 RBAC 角色（避免 N+1）
- T-004: 单元测试 `admin-user.service.spec.ts`（11 case，含 withRoles / ban / unban / AuditLog）
- T-004: Playwright E2E `admin/e2e/admin-rbac-ui.spec.ts`（7 case，4 旅程 + 边界）

### Changed
- T-004: `admin-shell.tsx` 侧边栏加"系统管理"分组（roles / permissions / admin-users）
- T-004: admin-users 页面用 `withRoles=true` 替代 N+1 fetch

### Notes
- 系统预置角色（isSystem=true）不可删除
- 分配角色支持可选过期时间（V1.1 用：客服试用期）

## [T-003] RBAC 守卫改造（@Roles → @RequirePermission） (2026-06-25)

### Added
- T-003: 8 个新权限码 seed（共 40 个）：
  - `category.view` / `category.create` / `category.update` / `category.delete`（4）
  - `company.view` / `company.verify` / `company.unverify`（3）
  - `announcement.view`（1）
- T-003: 10 个 admin controller 全部加 `@UseGuards(AdminGuard, PermissionGuard)` + 每个端点加 `@RequirePermission('xxx')`：
  - `AdminPostController`（7 端点：post.view / post.audit.pass / post.audit.reject / post.offline / post.audit.batch / post.offline.batch / post.purge / post.restore）
  - `AdminCategoryController`（5 端点：category.*）
  - `AdminCompanyController`（4 端点：company.*）
  - `AdminDashboardController`（1 端点：dashboard.view）
  - `AdminReportController`（2 端点：report.view / report.handle）
  - `AiUsageController`（1 端点：aiUsage.view）
  - `AdminAnnouncementController`（4 端点：announcement.view / .create / .update / .delete）
- T-003: 保留 `@Roles('admin')` 装饰器（兼容期 1 个月）
- T-003: 新权限码分配给 `operator` 角色：`category.{view,create,update,delete}` + `announcement.view`
- T-003: 单元测试 `permission.guard.spec.ts`（10 case，覆盖 super_admin 短路 / 各角色权限范围 / 403 抛错 / 无角色用户）
- T-003: Playwright E2E `admin/e2e/admin-rbac-guard.spec.ts`（7 case）
- T-003: 前端 `api.ts` 加 403 错误处理：`throw new Error('[403] ${msg}')` 让页面 catch 显示

### Changed
- T-003: 3 个 module 导入 `RbacModule`：`AnnouncementModule` / `AdminRoleModule` / `AdminPermissionModule`（PermissionGuard 依赖注入）
- T-003: seed `allPermissions` 数组扩到 40 个；`operator` 角色权限码列表同步扩展

### Notes
- 所有 `/admin/*` 端点已加权限校验；无权限返回 403 `需要权限: post.audit.pass`（中文消息）
- super_admin 仍走短路，无需 DB 查询
- 1 个月后（2026-07-25）将删除 `@Roles` 装饰器，仅保留 `@RequirePermission`

## [T-002] RBAC 角色 / 权限 / 关联表 (2026-06-25)

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
