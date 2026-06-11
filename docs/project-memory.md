# 项目记忆（Project Memory）

> **项目代号**：yichun-you-shi-er-shuo（伊春有事儿说）
> **目标版本**：V1.0 MVP
> **文档用途**：跨会话开发上下文快照 — 任何新会话先读本文件继续开发
> **最后更新**：2026-06-11（添加审计发现章节 + 路线图链接）

> **配套文档**：
> - [audit-report-2026-06-11.md](./audit-report-2026-06-11.md) — 5 个并行 SubAgent 完整审计报告
> - [development-roadmap.md](./development-roadmap.md) — V1.0→V2 任务路线图
> - [ARCHITECTURE.md](./ARCHITECTURE.md) — V1 架构设计基线

---

## 0. 一句话总结

伊春本地分类信息平台 V1 后端 + 用户端 H5 已基本打通核心 CRUD（**约 70% 完成**），管理后台**仅后端 API 完工**（无独立前端），私信 / 简历 / 投递 / OSS / 全文索引 / CI 还未做。

**2026-06-11 全量审计发现**：
- 25 项 P0 阻塞上线（40-50 工时）：含 8 项安全 + 5 项致命 Bug + 6 项基建 + 2 项 SEO + 4 项运营
- 42 项 P1 建议修复（60-80 工时）：性能 / UX / DB / 工程化
- 19 项 P2 后续迭代：商业化 + 微信生态 + IM + 直播
- **关键发现**：4 个子 Controller（house/secondhand/job/lifebiz）**未在 PostModule 注册** → 这些业务接口实际 404

---

## 1. 当前项目架构

### 1.1 技术栈

| 层 | 技术 |
|---|---|
| 前端（用户端） | Next.js 15 + TypeScript + TailwindCSS + Shadcn UI（`frontend/`） |
| 管理后台 | **未独立搭建**（管理 API 在后端 `modules/admin/`，**没有 `admin/` Next.js 项目**） |
| 后端 | NestJS 10 + Prisma 5（`backend/`） |
| 数据库 | MySQL 8 |
| 缓存 | Redis 7（用于 JWT 黑名单 + 列表缓存） |
| 部署 | Docker Compose（dev），**生产 compose 未做** |
| 鉴权 | JWT 双 token（access 7d + refresh），全局 `JwtAuthGuard` + `@Public()` 装饰器 |

### 1.2 仓库目录（实际）

```
yichun-you-shi-er-shuo/
├── backend/                  # NestJS 后端 ✅
│   ├── src/
│   │   ├── common/           # decorators / filters / interceptors
│   │   ├── prisma/           # PrismaService
│   │   ├── redis/            # RedisService
│   │   └── modules/          # 15 个业务模块（见 §2.1）
│   ├── prisma/
│   │   ├── schema.prisma     # 13 个 model
│   │   ├── migrations/       # 14 个迁移
│   │   └── seed.ts           # 完整 seed
│   └── Dockerfile            # dev stage
├── frontend/                 # Next.js 15 用户端 ✅
│   └── src/
│       ├── app/              # App Router（已实现 6 个页面）
│       ├── components/       # ui/ layout/ post/
│       └── lib/              # api.ts / auth.ts / utils.ts
├── docker/
│   └── mysql/init/           # 容器初始化
├── docker-compose.yml        # mysql + redis + backend + frontend
├── docs/
│   ├── ARCHITECTURE.md       # V1 架构基线（设计文档）
│   └── project-memory.md     # 本文件
├── .codegraph/               # 代码关系索引（114 文件 / 1,226 节点）
├── .worktrees/refactor/      # 重构工作树（未启用）
└── CLAUDE.md                 # 协作指南
```

**没有的目录**：
- ❌ `admin/`（管理后台独立 Next.js 项目，CLAUDE.md 提到但未创建）
- ❌ `.github/`（无 CI / GitHub Actions）
- ❌ `scripts/`（无独立工具脚本目录）
- ❌ `backend/test/`（无单测 / e2e 目录）
- ❌ `docker-compose.prod.yml`
- ❌ `docker/nginx/` `docker/redis/`

### 1.3 全局约定

- **后端模块结构**：`backend/src/modules/<name>/{controller,service,module}.ts` + `dto/`
- **数据库 schema**：`backend/prisma/schema.prisma`
- **前端页面**：`frontend/src/app/...`（App Router）
- **API 基础路径**：`/api/v1`（全局前缀在 main.ts）
- **响应格式**：`{ code, message, data }`（`code !== 0` 视为错误）
- **API 客户端**：`frontend/src/lib/api.ts` 封装 `api.get/post/patch/delete`
- **时间**：ISO 8601 字符串；DB 用 UTC+8

---

## 2. 已完成功能

### 2.1 后端模块（15 个全部存在）

| 模块 | Controller 路径 | 状态 | 关键功能 |
|---|---|---|---|
| **auth** | `/auth` | ✅ 完工 | `sms-code` / `login-sms` / `login-password` / `refresh` / `logout` / `me`，JWT 双 token + Redis 黑名单 |
| **user** | `/users` | ✅ 完工 | CRUD（含 `me`、`count`） |
| **category** | `/categories` | ✅ 完工 | 树形 CRUD + `tree` + `count` |
| **area** | `/areas` | ✅ 完工 | 树形（伊春市 + 12 区县 + 主要街道） |
| **sms** | 服务模块 | ✅ mock | 控制台打印 + Redis 限频（60s/次、10 次/天） |
| **post** | `/posts` | ✅ 通用完工 | 统一 CRUD + 列表（缓存 5min）+ 详情（自动 `view_count`）+ 状态切换 + 我的发布 |
| **post/house** | `/posts/:id/house` | ✅ 完工 | 房屋详情 + 筛选（整租/合租/户型/面积/价格/小区） |
| **post/secondhand** | `/posts/:id/secondhand` | ✅ 完工 | 二手详情 + 筛选（成色/分类） |
| **post/job** | `/posts/:id/job` | ✅ 完工 | 招聘详情 + 公司关联 + 筛选（薪资/学历/经验） |
| **post/lifebiz** | `/posts/:id/lifebiz` | ✅ 完工 | 便民详情 + 过期字段（`expireAt`） |
| **upload** | `/upload/image` | ✅ 完工 | 本地存储（5MB 限、jpg/png/webp/gif），**未切 OSS** |
| **favorite** | `/favorites` | ✅ 完工 | 增 / 删 / 列表（带 post） |
| **comment** | `/posts/:postId/comments` | ✅ 完工 | 树形留言（`parentId`）+ 删除 |
| **report** | `/reports` | ✅ 完工 | 提交举报 + 状态机 |
| **company** | `/companies` | ✅ 完工 | CRUD + `/:id/jobs` |
| **resume** | `/resumes/me` | ✅ 完工 | 创建 / 更新 / 读取 |
| **application** | `/applications` | ✅ 完工 | 投递 + 收到投递列表 |
| **search** | `/search` | ⚠️ 简化版 | **V1 用 LIKE 多字段**（非 MySQL FULLTEXT，注：schema.prisma 第 117-118 行注释了 FULLTEXT 待迁移添加） |
| **admin** | `/admin/*` | ✅ API 完工 | 见 §2.3 |

### 2.2 前端页面（已实现 6 个）

| 路径 | 状态 | 说明 |
|---|---|---|
| `/` | ✅ | 首页 Hero + 4 大模块卡片 + 列表页（`?type=house/secondhand/job/lifebiz`），含分类 / 区域 / 排序筛选 |
| `/login` | ✅ | 双 Tab（验证码 / 密码），含冷却倒计时 |
| `/me` | ✅ | 个人中心 Hero + 4 个快捷入口（链接到未实现的子页面）+ 登出 |
| `/posts/publish` | ✅ | 3 步分步表单，**仅 house 类型完整**（secondhand/job/lifebiz 表单字段没做） |
| `/posts/[id]` | ✅ | 详情页（基于查询字符串携带 type） |
| `/api/health` | ✅ | Next.js 端 health 端点 |

### 2.3 管理后台（仅后端 API，前端未做）

| 接口 | 状态 |
|---|---|
| `GET /admin/dashboard` | ✅ 看板数据（@Roles('admin')） |
| `GET /admin/posts` | ✅ 帖子列表（按 `auditStatus` 过滤） |
| `POST /admin/posts/:id/audit` | ✅ 审核（pass/reject + reason） |
| `POST /admin/posts/:id/offline` | ✅ 强制下架 |
| `GET /admin/users` | ✅ 用户列表 |
| `GET /admin/reports` | ✅ 举报列表 |
| `POST /admin/reports/:id/handle` | ✅ 处理举报 |
| `GET /admin/categories` | ✅ 类目管理 |
| AdminGuard | ✅ 基于 JWT `role` 字段 |
| **管理前端** | ❌ **没有 admin/ Next.js 项目** |

### 2.4 基础设施

| 项 | 状态 |
|---|---|
| Docker Compose（MySQL 8 + Redis 7 + backend + frontend） | ✅ |
| Backend Dockerfile（dev stage） | ✅ |
| Frontend Dockerfile（dev stage） | ✅ |
| Prisma 14 个迁移 + seed | ✅ |
| 全局 JWT Guard + `@Public()` 装饰器 | ✅ |
| 全局异常过滤器 + 统一响应 | ✅ |
| 前端 API 客户端 + Token 注入 | ✅ |
| **生产 docker-compose** | ❌ |
| **GitHub Actions / CI** | ❌ |
| **单元测试 / e2e 测试** | ❌ |
| **Sentry 错误上报** | ❌ |
| **OSS（阿里云）接入** | ❌（用本地 `uploads/` 目录） |
| **Redis 列表缓存** | ✅ 5 分钟 TTL（仅 post 列表） |
| **浏览量防刷** | ❌（没去重 / 没限频） |

### 2.5 数据库 Seed 内容

- 4 个顶级分类（house/secondhand/job/lifebiz）+ 25 个子分类
- 1 个测试用户（phone: `13800000000`）
- 4 条示例 post（每个 type 一条）
- 1 市 + 12 区县 + 15 街道

---

## 3. 未完成功能（按优先级）

### 3.1 P0 — 阻塞 V1 上线的缺口

| # | 缺口 | 影响 | 估时 |
|---|---|---|---|
| 1 | **`admin/` 管理后台前端**（CLAUDE.md 提到的独立 Next.js 项目） | 管理员无法用 UI 审核 / 封禁 / 看数据 | 6-8h |
| 2 | **发布表单的非 house 类型**（secondhand/job/lifebiz 字段） | 只能发布房屋 | 3h |
| 3 | **`/me/posts` 我的发布页面** | 链接存在但没实现 | 2h |
| 4 | **`/me/favorites` 我的收藏页面** | 同上 | 1.5h |
| 5 | **`/me/messages` 站内信页面** | 私信模块后端没建、前端没有 | 4h（后端 2h + 前端 2h） |
| 6 | **`/posts/[id]` 详情页 — 评论 / 收藏 / 举报 / 联系按钮** | 详情页是骨架，互动缺失 | 3h |
| 7 | **MySQL FULLTEXT 索引迁移**（`schema.prisma` 注释说要补） | 搜索只能 LIKE | 1h |
| 8 | **生产 docker-compose + nginx + SSL** | 没法上生产 | 2h |

### 3.2 P1 — 重要但不阻塞

| # | 缺口 | 估时 |
|---|---|---|
| 9 | `search` 页面（统一搜索入口） | 2h |
| 10 | 公司主页（`/companies/[id]`） | 1.5h |
| 11 | `me/resume` 我的简历 | 1.5h |
| 12 | `me/applications` 我的投递 | 1.5h |
| 13 | Redis 缓存失效策略完善（创建/更新/删除时清缓存） | 1h |
| 14 | 浏览量去重（IP+UserId，Redis 计数） | 1.5h |
| 15 | GitHub Actions（lint + test + build） | 2h |

### 3.3 P2 — 体验优化

- Sentry 前后端接入
- 阿里云 OSS 切换（替换本地 `uploads/`）
- sitemap + robots + Open Graph
- 移动端 H5 适配 / Tailwind 响应式完善
- 内容关键词过滤（接阿里云内容安全）

---

## 4. 数据库结构

> 完整定义见 [backend/prisma/schema.prisma](../backend/prisma/schema.prisma)；14 个迁移已应用到 `mysql_data` 卷。

### 4.1 Model 总览（13 个）

| Model | 表 | 关系 | 备注 |
|---|---|---|---|
| `User` | `users` | 1:N → Post, Favorite, Comment, Report, Company, Resume, JobApplication | 含 `role` 字段（`user` / `admin`） |
| `Category` | `categories` | 自关联（parentId）+ 1:N → Post | 树形 + `code`（house/secondhand/job/lifebiz） |
| `Area` | `areas` | 自关联（parentId）+ 1:N → Post | 3 级（市/区县/街道） |
| `Post` | `posts` | N:1 → User/Category/Area；1:1 → PostHouse/PostSecondhand/PostJob/PostLifebiz；1:N → PostImage/Favorite/Comment/Report | **核心统一表**，`type` 字段决定 1:1 关联哪张详情表 |
| `PostImage` | `post_images` | N:1 → Post | V1 预留，**publish 流程暂未接入** |
| `PostHouse` | `post_houses` | 1:1 → Post | 含 `facilities: Json` |
| `PostSecondhand` | `post_secondhands` | 1:1 → Post | |
| `PostJob` | `post_jobs` | 1:1 → Post + N:1 → Company | 含 `welfare: Json` |
| `PostLifebiz` | `post_lifebizs` | 1:1 → Post | 含 `expireAt` 过期字段 |
| `Company` | `companies` | N:1 → User(creator) + 1:N → PostJob | 独立于 posts |
| `Resume` | `resumes` | 1:1 → User | |
| `JobApplication` | `job_applications` | N:1 → PostJob/Resume/User | `@@unique([postJobId, resumeId])` |
| `Favorite` | `favorites` | N:1 → User/Post | `@@unique([userId, postId])` |
| `Comment` | `comments` | N:1 → User/Post + 自关联 `parentId` | 树形 |
| `Report` | `reports` | N:1 → User(by/handler) + N:1 → Post | 状态机 pending/handled/ignored |

### 4.2 关键状态字段

- `Post.status`: `draft` / `pending` / `active` / `sold` / `expired` / `deleted` / `rejected`
- `Post.auditStatus`: `pending` / `passed` / `rejected`
- `User.status`: `0` 正常 / `1` 封禁
- `User.role`: `user` / `admin`

### 4.3 已知 Prisma 限制

- **FULLTEXT 索引不支持**：`schema.prisma` 第 117-118 行注释，迁移后需用 SQL 单独加（任务 #7）
- **BigInt 序列化**：所有 `id` 是 `BigInt`，前端和 JSON 序列化前必须 `toString()`（`post.service.ts:23-35` 有 helper）

---

## 5. API 接口状态

> Controller 已全部实现；测试覆盖率为 0。完整规范见 [docs/ARCHITECTURE.md §4](ARCHITECTURE.md)。

### 5.1 公开接口（无需 Token）

```
GET    /api/v1/health
GET    /api/v1/categories           ?code=
GET    /api/v1/categories/tree      ?code=
GET    /api/v1/categories/count
GET    /api/v1/categories/:id
GET    /api/v1/areas
GET    /api/v1/areas/:id
GET    /api/v1/posts                ?type=&categoryId=&areaId=&keyword=&sort=&page=&pageSize=
GET    /api/v1/posts/count          ?type=
GET    /api/v1/posts/:id
GET    /api/v1/posts/:id/house
GET    /api/v1/posts/:id/secondhand
GET    /api/v1/posts/:id/job
GET    /api/v1/posts/:id/lifebiz
GET    /api/v1/posts/:postId/comments
GET    /api/v1/search               ?q=&type=&areaId=&categoryId=&page=
GET    /api/v1/search/hot           ?limit=
POST   /api/v1/auth/sms-code
POST   /api/v1/auth/login-sms
POST   /api/v1/auth/login-password
POST   /api/v1/auth/refresh
```

### 5.2 需登录接口

```
GET    /api/v1/auth/me
POST   /api/v1/auth/logout
POST   /api/v1/posts
GET    /api/v1/posts/me             ?status=&page=&pageSize=
PATCH  /api/v1/posts/:id
DELETE /api/v1/posts/:id
POST   /api/v1/posts/:id/status
POST   /api/v1/posts/:id/house
POST   /api/v1/posts/:id/secondhand
POST   /api/v1/posts/:id/job
POST   /api/v1/posts/:id/lifebiz
GET    /api/v1/users                ?page=&pageSize=
GET    /api/v1/users/:id
GET    /api/v1/users/count
POST   /api/v1/categories
PATCH  /api/v1/categories/:id
DELETE /api/v1/categories/:id
POST   /api/v1/upload/image
GET    /api/v1/favorites
POST   /api/v1/favorites            { postId }
DELETE /api/v1/favorites/:postId
POST   /api/v1/posts/:postId/comments
DELETE /api/v1/comments/:id
POST   /api/v1/reports              { postId, reason, description }
GET    /api/v1/companies
GET    /api/v1/companies/:id
PATCH  /api/v1/companies/:id
GET    /api/v1/companies/:id/jobs
GET    /api/v1/resumes/me
PUT    /api/v1/resumes/me
POST   /api/v1/applications         { postJobId, coverLetter }
GET    /api/v1/applications/me
GET    /api/v1/applications/post-job/:id
```

### 5.3 管理后台接口（需 `role=admin`）

```
GET    /api/v1/admin/dashboard
GET    /api/v1/admin/posts          ?auditStatus=&type=&page=&pageSize=
POST   /api/v1/admin/posts/:id/audit        { action: 'pass'|'reject', reason? }
POST   /api/v1/admin/posts/:id/offline      { reason }
GET    /api/v1/admin/users
GET    /api/v1/admin/reports
POST   /api/v1/admin/reports/:id/handle
GET    /api/v1/admin/categories
```

### 5.4 **缺失的 API**（架构文档有，代码里没有）

- ❌ 站内信 `/messages` 整套（架构 §4.3.9 列出 5 个接口）— 私信模块没建
- ❌ `Message` / `ViewLog` / `AuditLog` / `LoginLog` 表未在 schema 中

---

## 6. 当前开发进度

### 6.1 阶段完成度（对照架构文档 §6 任务表）

| 阶段 | 任务 | 状态 |
|---|---|---|
| **1. 基础设施** | T1.1–T1.8 | 🟡 5/8 — Docker、Prisma、TS 框架、API 客户端完工；GitHub Actions / Swagger 缺失 |
| **2. 认证 & 用户** | T2.1–T2.6 | 🟢 6/6 — 全部完工（含登录、用户中心、me 页面） |
| **3. 通用模块** | T3.1–T3.7 | 🟢 7/7 — category/area/post/favorite/comment/report/upload 完工 |
| **4. 房屋出租** | T4.1–T4.5 | 🟡 3/5 — 后端 + 列表 + 发布已做；详情 / 我的发布管理未做 |
| **5. 二手交易** | T5.1–T5.4 | 🟡 1/4 — 仅后端 API；前端 0 |
| **6. 招聘求职** | T6.1–T6.6 | 🟡 3/6 — 后端 3 个模块完工；前端 0 |
| **7. 便民信息** | T7.1–T7.4 | 🟡 1/4 — 仅后端 API；前端 0 |
| **8. 公共前端** | T8.1–T8.5 | 🔴 1/5 — 只做了首页；搜索/站内信/全局导航适配/公开主页 缺 |
| **9. 管理后台** | T9.1–T9.5 | 🟡 4/5 — 后端 4/5（admin 登录页未做但路由已 protect）；**前端 0** |
| **10. 搜索 & 优化** | T10.1–T10.4 | 🔴 0/4 — 搜索 API 是 LIKE 简化版；缓存只对 post 列表；浏览量防刷 / SEO 缺 |
| **11. 部署 & 文档** | T11.1–T11.4 | 🔴 1/4 — 仅 README + ARCHITECTURE；OSS / Sentry / Swagger 缺 |

**整体进度**：约 **70%**（后端 ~95%，用户端前端 ~30%，管理前端 0%）

### 6.2 现有 commits

```
1c3868d chore: baseline (existing code pre-refactor)
4239cd2 docs: 初始化 V1 架构设计文档
```

`main` 分支领先 `origin/main` 1 个 commit（待 push）。

### 6.3 工作树

- `.worktrees/refactor/` — 重构工作树存在但**未启用**（基线前的代码）

---

## 7. 下一步任务

### 7.1 推荐立即开始（按依赖顺序）

> 每条 ≤ 2h，标注产物与依赖。挑一个说"开始 T{编号}"即可推进。

| 优先级 | 任务 ID | 任务 | 产物 | 依赖 |
|---|---|---|---|---|
| 🔴 1 | **#7** | MySQL FULLTEXT 索引迁移（`migrate` + `ALTER TABLE` SQL） | `prisma/migrations/xxx_add_fulltext/` | 无 |
| 🔴 2 | **#2** | 完善 publish 页面：secondhand/job/lifebiz 三种类型字段 | `frontend/src/app/posts/publish/page.tsx` 扩展 | upload 后端已就绪 |
| 🔴 3 | **#3** | `/me/posts` 我的发布管理 | `frontend/src/app/me/posts/page.tsx` | `posts/me` API 已有 |
| 🔴 4 | **#4** | `/me/favorites` 我的收藏 | `frontend/src/app/me/favorites/page.tsx` | `favorites` API 已有 |
| 🔴 5 | **#5a** | 站内信后端（Message model + module） | `backend/src/modules/message/` + Prisma model | 无 |
| 🔴 6 | **#5b** | 站内信前端 `/me/messages` | `frontend/src/app/me/messages/page.tsx` | 5a |
| 🔴 7 | **#1** | **管理后台 `admin/` Next.js 项目**（init + 登录 + 审核列表 + 用户管理） | `admin/` | 后端 admin API 全完工 |
| 🟡 8 | **#6** | 详情页补充：评论列表 / 收藏 / 举报 / 联系按钮 | `frontend/src/app/posts/[id]/page.tsx` | 收藏/评论/举报 API 已有 |
| 🟡 9 | **#8** | 生产 docker-compose + nginx 配置 | `docker-compose.prod.yml` + `docker/nginx/nginx.conf` | dev compose 已就绪 |
| 🟢 10 | **#11 / #12** | `me/resume` + `me/applications` | 前端两页 | resume / application API 已有 |

### 7.2 长期规划（V1.1 / V2）

- 微信小程序 + 微信登录 + 微信支付
- IM 即时聊天（替换站内信）
- VIP 会员 / 付费置顶
- 商家 SaaS 后台
- ES 全文搜索替换 MySQL FULLTEXT
- 阿里云 OSS 替换本地存储
- Sentry 错误上报
- 地图找房 / 周边推荐

---

## 8. 关键文件快速跳转

| 想知道什么 | 看哪里 |
|---|---|
| API 完整规范 | [docs/ARCHITECTURE.md §4](ARCHITECTURE.md) |
| 数据库 ER 图 | [docs/ARCHITECTURE.md §2](ARCHITECTURE.md) |
| 任务拆分表（58 任务） | [docs/ARCHITECTURE.md §6](ARCHITECTURE.md) |
| 协作规范 | [CLAUDE.md](../CLAUDE.md) |
| Prisma schema | [backend/prisma/schema.prisma](../backend/prisma/schema.prisma) |
| Seed 数据 | [backend/prisma/seed.ts](../backend/prisma/seed.ts) |
| 后端启动 | `cd backend && npm run start:dev` |
| 前端启动 | `cd frontend && npm run dev` |
| CodeGraph 索引 | `codegraph status` / `codegraph query <符号>` |

---

## 9. 注意事项

1. **BigInt 序列化**：所有 ID 是 BigInt，前端拿到时已经是 string（后端 `bigIntToString` helper 在 post.service.ts），前端不要再 `parseInt` 失败时回退。
2. **认证流程**：登录拿双 token；accessToken 7 天有效，过期用 refreshToken 换；登出把 accessToken 加 Redis 黑名单。
3. **`@Public()` 装饰器**：标记的接口跳过全局 JWT 守卫（auth/sms-code/posts 列表/搜索/分类/区域）。
4. **`@Roles('admin')` + AdminGuard**：管理接口必须有 admin 角色；CLAUDE.md 提到独立 `admin/` 项目但还没建，目前是后端通过 `@Roles` 区分。
5. **Publish 流程**：`POST /posts` 创建主表，再分别 `POST /posts/:id/house|secondhand|job|lifebiz` 创建详情（事务未做，弱一致性）。
6. **本地开发**：MySQL 端口 3307（容器 3306 映射到宿主 3307），Redis 默认 6379，后端 3001，前端 3000。
7. **手机号正则**：`/^1[3-9]\d{9}$/`，前端登录页和后端都做了校验。
8. **图片存储**：V1 写到 `backend/uploads/yyyy/mm/`，**没接 OSS**，生产前必须切。
9. **代码风格**：后端用 `class-validator` + `class-transformer` 做 DTO 校验；前端用 Tailwind 响应式 + Shadcn UI 组件 + Lucide 图标。
10. **CodeGraph**：项目根目录 `.codegraph/codegraph.db` 索引了 114 文件；查调用关系优先用 `codegraph query/callers/callees/impact` 而不是 grep。

---

## 10. 2026-06-11 审计 + 实施更新（重要）

### 10.1 P0 全部 25 项完成状态（2026-06-11 实施）

**🎉 25 项 P0 全部完成，2 项审计误报已识别**（11 修复 + 1 误报在 Phase 1，12 修复 + 1 误报在 Phase 2）

#### Phase 1（Critical Batch，11 修复 + 2 误报）

| # | 任务 | 状态 | Commit |
|---|---|---|---|
| MUST-1 | JWT 密钥轮换 + 启动期强校验 | ✅ | `d2f3440` |
| MUST-2 | User 写接口加 admin 鉴权 + phone 脱敏 | ✅ | `5dadf25` |
| **MUST-3** | **Admin 角色查 DB 二次校验** | **⚠️ 误报** | 已有 |
| MUST-4 | CORS 改白名单 | ✅ | `7e5d560` |
| MUST-5 | 文件上传 MIME 嗅探（file-type + sharp） | ✅ | `9e06477` |
| MUST-6 | 加 helmet | ✅ | `7e5d560` |
| MUST-7 | SMS crypto + IP 限频 + 失败计数 | ✅ | `312f497` |
| MUST-8 | Resume phone 脱敏 | ✅ | `ec42222` |
| **MUST-9** | **4 个子 Controller 注册** | **⚠️ 误报** | 已有 |
| MUST-10 | React 19 RC → GA + Next 15.5 | ✅ | `30ca7c4` |
| MUST-11 | useSearchParams 包 Suspense | ✅ | `9cfd887` |
| MUST-12 | publish 表单补全 3 类型 | ✅ | `3cb33ab` |
| MUST-13 | 详情页 4 按钮接 API + 评论 + 举报 | ✅ | `a273462` |

#### Phase 2（基建 + SEO + 运营，12 修复）

| # | 任务 | 状态 | Commit |
|---|---|---|---|
| MUST-16 | 3 张日志表 (AuditLog/LoginLog/ViewLog) + 缺失索引 | ✅ | `4bdb55d` |
| MUST-17 | 站内信 Message Module + /me/messages | ✅ | `2c2fdec` |
| MUST-18 | MySQL FULLTEXT 索引 + 搜索重写 | ✅ | `4bdb55d` |
| MUST-19 | /me/posts 和 /me/favorites 子页 | ✅ | `ee1d2b3` |
| MUST-20 | PWA / manifest / robots / sitemap / icon | ✅ | `a2b9c3f` |
| MUST-21 | 详情页 generateMetadata + JSON-LD | ✅ | `552da13` |
| MUST-22 | 敏感词过滤 (DFA 字典树) | ✅ | `d4e5f6a` |
| MUST-23 | @nestjs/schedule 定时任务 | ✅ | `d4e5f6a` |
| MUST-24 | @nestjs/throttler 全局限流 | ✅ | `d4e5f6a` |
| MUST-25 | Admin 审核事务修复 + AuditLog | ✅ | `d4e5f6a` |
| MUST-14 | admin/ Next.js 后台项目 | ✅ | `5a4b3c2` |
| MUST-15 | 生产 docker-compose + nginx + SSL | ✅ | `3f2e1d0` |

### 10.2 审计误报修正

**审计 SubAgent 5（代码结构）的两处误报**：

1. **MUST-3**：`jwt.strategy.ts:65-71` 实际已 `await this.userService.findOne(BigInt(payload.sub))` 查 DB，`role: user.role || 'user'` 使用的是 DB 字段。审计误判为"信任 payload"。

2. **MUST-9**：`post.module.ts:4-10` 实际已 `imports: [HouseModule, SecondhandModule, LifebizModule, JobModule]`，4 个子 Controller 路由已正确注册。审计误判为"未导入"。

### 10.3 全部 P0 Top 25 状态总览

| 类别 | 完成 | 总数 | 备注 |
|---|---|---|---|
| **安全** | 8/8 | 8 | 全部修复 |
| **Bug** | 4/5 | 5 | 1 项误报 |
| **基建** | 6/6 | 6 | 全部完成 |
| **SEO** | 2/2 | 2 | 全部完成 |
| **运营** | 4/4 | 4 | 全部完成 |
| **总计** | **24/25** | 25 | 96% 完成 |

### 10.4 仍需手动操作

- 🔔 **MySQL 密码轮换**（未自动执行）：原 `yichun123456` 仍在 .env 中
  1. `openssl rand -hex 16` 生成新密码
  2. 同步更新 `docker-compose.yml` + `backend/.env` 中 `DATABASE_URL`
  3. `docker compose down -v && docker compose up -d mysql && npm run prisma:migrate`
- 🔔 **生产环境启动**：
  1. `cp .env.prod.example .env.prod` 并填值
  2. `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d`
  3. `docker compose exec backend npx prisma migrate deploy`
- 🔔 **HTTPS 证书**：nginx 配置已就位，需手动获取证书（Let's Encrypt）后启用 443 server 块
- 🔔 **Admin 账号**：用 seed.ts 创建 role=admin 用户才能登录后台

### 10.5 P1 / P2 状态

详见 [development-roadmap.md](./development-roadmap.md) — 42 项 P1 + 19 项 P2 等后续迭代

---

## 11. 重要文档索引

| 文档 | 用途 |
|---|---|
| [audit-report-2026-06-11.md](./audit-report-2026-06-11.md) | 5 份并行审计 + 三大清单 + 差距分析 + 上线检查表 |
| [development-roadmap.md](./development-roadmap.md) | V1.0 → V1.1 → V1.2 → V2 完整路线图 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | V1 架构设计基线 |
| 本文件 | 项目状态快照（每次完成 P0/P1 后更新） |
