# 项目全面审计报告（2026-06-11）

> **审计模式**：只读静态审计
> **审计覆盖**：后端（NestJS）+ 前端（Next.js）+ 数据库（Prisma）+ 部署（Docker）+ 0458.cn 对标 + 运营/商业化
> **审计来源**：5 个并行 SubAgent 分别完成
> **项目当前进度**：约 70%（后端 ~95%，用户端 ~30%，管理后台 0%）

---

## 总体评分

| 维度 | 评分 | 说明 |
|---|---|---|
| **后端安全性** | 4/10 | JWT 密钥入仓、Admin 角色信任 payload、CORS 全开、文件上传 XSS、用户越权 |
| **后端健壮性** | 5/10 | 部分事务、个别竞态、时区不一致、parseInt NaN 风险 |
| **后端性能** | 5/10 | 搜索 LIKE 全表扫、缓存无 invalidation、viewCount 写竞争 |
| **前端移动端** | 5.5/10 | 4 大分类手机看不见、详情无真实图、横滚风险 |
| **前端 SEO** | 3/10 | 致命：缺 favicon/manifest/robots/sitemap/OG/canonical/JSON-LD |
| **前端 UX** | 6/10 | alert 当 toast、详情 4 按钮空、主题无入口 |
| **运营/变现** | 2/10 | 广告/VIP/商家/审计日志全部为 0 |
| **代码结构** | 6.5/10 | 子 Controller 未注册、依赖锁版本老、缺安全/限频/日志套件 |
| **综合** | **5.0/10** | 工程基础不错，但 V1 距离生产就绪差 30-40 工时 |

---

# 第一部分：【必须修复】（阻塞上线）

> 立即修复，否则**不能上线**。预计总工时：40-50h

## A. 安全类（最高优先级）

### [MUST-1] **JWT 密钥 + MySQL 密码明文入仓**
- **文件**：`backend/.env:12`
- **风险**：仓库源码拿到者可签发任意 user/admin token
- **修复**：
  1. 立即轮换 `JWT_SECRET`（`openssl rand -base64 48`）、MySQL 密码、`REDIS_URL` 密码
  2. 启动期强校验：长度 < 32 直接 `process.exit(1)`
  3. `.env.example` 只留占位符，CI 加 `gitleaks`
- **估时**：2h

### [MUST-2] **任何登录用户可改/删任意用户（垂直越权）**
- **文件**：`backend/src/modules/user/user.controller.ts:48-56` + `user.service.ts:120-145`
- **风险**：任意用户改他人 nickname/avatar/role/status，可封号、提权、删号
- **修复**：
  1. `user.controller` 写接口加 `@UseGuards(AdminGuard) + @Roles('admin')`
  2. `update()` 强制 `userId === currentUser.sub || isAdmin`
  3. `UpdateUserDto` 显式排除 `role`/`status`/`password`
  4. `remove` 改只允许 admin
- **估时**：1.5h

### [MUST-3] **Admin 角色信任 JWT payload，未与 DB 二次校验**
- **文件**：`backend/src/modules/auth/strategies/jwt.strategy.ts:65-71`
- **风险**：admin 降权/封号后旧 token 仍可用 7-30 天
- **修复**：在 `JwtStrategy.validate` 查 DB 写 role，敏感操作（admin 全部）短 token + step-up
- **估时**：1h

### [MUST-4] **CORS 任意来源放行 + credentials=true**
- **文件**：`backend/src/main.ts:30-33`
- **风险**：高危默认值，未来接 cookie 会立即被 CSRF
- **修复**：`origin` 改显式白名单（从 `ConfigService` 读 `CORS_ORIGINS`）
- **估时**：0.5h

### [MUST-5] **文件上传：MIME 黑名单无魔术字校验 + 静态目录无鉴权**
- **文件**：`backend/src/modules/upload/upload.service.ts:22-58` + `main.ts:20-27`
- **风险**：存储型 XSS（上传 SVG/HTML payload 即可执行脚本）
- **修复**：
  1. 用 `file-type` 包做真实嗅探
  2. 拒绝 svg/html/htm
  3. 加 `X-Content-Type-Options: nosniff` + `Content-Disposition: attachment`
  4. `sharp` 重编码 + 剥离 EXIF
- **估时**：2h

### [MUST-6] **缺少 helmet 安全响应头**
- **文件**：`backend/src/main.ts:1-58`
- **风险**：无 CSP / X-Frame-Options / HSTS / Referrer-Policy
- **修复**：`npm i helmet` + `app.use(helmet(...))`
- **估时**：0.5h

### [MUST-7] **SMS 验证码无失败计数（可暴力破解）**
- **文件**：`backend/src/modules/sms/sms.service.ts:77-89`
- **风险**：每 60s 触发新码后单码可无限尝试 6 位
- **修复**：
  1. 验证码生成改 `crypto.randomInt`
  2. 失败 5 次后冻结验证码 + 手机号 15 分钟
  3. 加 IP 限频（30/hour/IP）
- **估时**：2h

### [MUST-8] **公开用户接口泄露手机号（PII）**
- **文件**：`backend/src/modules/user/user.controller.ts:36` + `resume.controller.ts:30`
- **风险**：爬虫可获取全站用户手机号（违反个保法）
- **修复**：
  1. `users/:id` 改需登录 + 脱敏 phone（`138****1234`）
  2. `resumes/:id` 公开模式下隐藏 phone
- **估时**：1h

## B. 致命 Bug 类

### [MUST-9] **4 个子 Controller（house/secondhand/job/lifebiz）未在 post.module.ts 注册**
- **文件**：`backend/src/modules/post/post.module.ts`
- **风险**：调用 `/api/v1/posts/:id/house` 等接口会 404，与 project-memory 写"✅ 完工"矛盾
- **修复**：在 `PostModule.imports` 加入 4 个子 module
- **估时**：0.5h
- **重要程度**：🔴 **核心业务功能实际不可用**

### [MUST-10] **React 19 RC 用于生产 + @types/react 18.3 类型不一致**
- **文件**：`frontend/package.json`
- **风险**：编译期类型错乱，生产用 RC 是严重风险
- **修复**：`react`/`react-dom` 升 `^19.0.0` GA；`@types/react` 升 `^19.0.0`
- **估时**：0.5h

### [MUST-11] **`useSearchParams()` 在多个页面缺少 `<Suspense>` 包裹（Next 15 强制）**
- **文件**：`frontend/src/app/page.tsx:65` + `posts/publish/page.tsx:28`
- **风险**：失去 prerender，LCP/TTFB 恶化；边缘部署 500
- **修复**：拆出 `<HomeContent />` 内层组件，外层用 `<Suspense fallback={null}>` 包裹
- **估时**：0.5h

### [MUST-12] **publish 页非 house 类型字段完全没实现（假切换）**
- **文件**：`frontend/src/app/posts/publish/page.tsx:14-19, 134-152`
- **风险**：用户发布招聘/二手/便民，详情页只能看标题描述
- **修复**：补全 secondhand/job/lifebiz 三种类型字段（与后端 DTO 对齐）
- **估时**：3h

### [MUST-13] **详情页 4 个核心按钮（收藏/留言/分享/举报）全部空实现**
- **文件**：`frontend/src/app/posts/[id]/page.tsx:314-333`
- **风险**：用户最大 3 个动作（收藏/联系/留言）全部失效
- **修复**：接上后端 API + 弹窗
- **估时**：2h

## C. 缺失基建类

### [MUST-14] **`admin/` 管理后台独立 Next.js 项目（CLAUDE.md 提到但未建）**
- **现状**：架构文档承诺的独立 admin 项目完全不存在
- **风险**：管理员只能 curl / Postman，无法日常运营
- **修复**：
  1. `admin/` Next.js 15 项目 init（复用 frontend 的 Shadcn + Tailwind）
  2. 登录页（接后端 admin 角色）
  3. 看板（数据图表）
  4. 帖子审核列表（通过/拒绝/批量）
  5. 举报处理
  6. 用户列表 + 封禁
  7. 类目管理
- **估时**：6-8h

### [MUST-15] **生产 docker-compose + nginx + SSL**
- **现状**：dev compose OK，**生产 compose 不存在**，无 nginx 配置
- **修复**：
  1. `docker-compose.prod.yml`（MySQL + Redis + Backend + Frontend + Admin + Nginx）
  2. `docker/nginx/nginx.conf`（反向代理 + HTTPS + gzip + 静态资源）
  3. `docker/redis/redis.conf`（生产配置：持久化 + 密码）
- **估时**：2h

### [MUST-16] **3 张日志表缺失（AuditLog / LoginLog / ViewLog）**
- **现状**：`schema.prisma` 只有 13 个 model，架构文档设计的 3 张日志表全部缺失
- **风险**：
  - admin 审核/封禁无追溯
  - 异常登录无告警
  - 任何 UV / DAU / 个性化推荐无法做
- **修复**：
  1. `AuditLog(id, postId, adminUserId, action, reason, createdAt)`
  2. `LoginLog(id, userId, ip, device, ua, status, createdAt)`
  3. `ViewLog(id, userId, postId, ip, ua, createdAt)`
  4. 写入点埋入
- **估时**：3h

### [MUST-17] **站内信 Message Model / Module 缺失**
- **现状**：架构 §4.3.9 列了 5 个 API，前后端都没做
- **风险**：`/me/messages` 链接是死的
- **修复**：
  1. `Message(id, senderId, receiverId, content, isRead, createdAt)` model
  2. `backend/src/modules/message/` 完整 module
  3. `frontend/src/app/me/messages/page.tsx` 收件箱 + 发件箱
- **估时**：5h

### [MUST-18] **MySQL FULLTEXT 索引迁移**
- **现状**：`schema.prisma:117-118` 注释说要做，14 个 migration 都没加
- **影响**：搜索走 LIKE 全表扫，1k+ 用户后 P99 退化到秒级
- **修复**：新建迁移 `add_fulltext/migration.sql`：
  ```sql
  ALTER TABLE posts ADD FULLTEXT INDEX ft_title_desc (title, description) WITH PARSER ngram;
  ```
  改 `search.service.ts` 用 `MATCH() AGAINST()`
- **估时**：2h

### [MUST-19] **`/me/posts`、`/me/favorites` 个人中心子页未实现**
- **现状**：`/me` Hero 链接存在，路由 404
- **修复**：建 2 个页面接 `posts/me` + `favorites` API
- **估时**：3.5h

## D. SEO 类（V1 上线即开始养站）

### [MUST-20] **缺 PWA / favicon / manifest / robots / sitemap**
- **文件**：`frontend/public/`（基本为空）
- **风险**：浏览器 tab、收藏夹、PWA 桌面图标全无；微信/微博分享 0 图
- **修复**：
  1. `app/icon.tsx`（动态生成）+ `app/manifest.ts`
  2. `app/robots.ts` + `app/sitemap.ts`（动态）
  3. `app/opengraph-image.tsx`（1200×630 OG 图）
- **估时**：2h

### [MUST-21] **详情页无独立 metadata（每页 title/desc 雷同）**
- **文件**：`frontend/src/app/posts/[id]/page.tsx` 整文件无 `generateMetadata`
- **风险**：百度/微信搜索 SERP 卡片无吸引力，转化率接近 0
- **修复**：每个详情页独立 title/description/OG/canonical + JSON-LD（RealEstateListing / JobPosting / ProductOffer）
- **估时**：3h

## E. 运营/合规类

### [MUST-22] **敏感词过滤缺失**
- **风险**：涉黄/涉政/虚假信息无任何拦截
- **修复**：
  1. `common/filters/sensitive-word.filter.ts`（DFA 字典树）
  2. `seed.ts` 灌入 200+ 种子词
  3. post.create/patch 调 `check()`
- **估时**：2h

### [MUST-23] **缺定时任务（@nestjs/schedule）— 过期信息不下架**
- **现状**：`grep "Cron|@Cron"` 命中 0
- **影响**：便民信息 `expireAt` 过期后状态不翻成 `expired`，仍出现在首页
- **修复**：
  1. `npm i @nestjs/schedule`
  2. `cron/expire-posts.cron.ts` — 每天 03:00 跑
- **估时**：1.5h

### [MUST-24] **缺 Throttler（@nestjs/throttler）— 登录/上传/评论无任何限流**
- **风险**：DoS + 验证码暴力（配合 MUST-7）
- **修复**：全局 60/min/IP，auth 5/min，upload 30/min/user
- **估时**：1h

### [MUST-25] **Admin 审核事务破坏 + 审计日志缺失**
- **文件**：`backend/src/modules/admin/post/admin-post.service.ts:47-102`
- **风险**：`pass` 函数 `$transaction` + 独立 update 出现 auditStatus 改了但 reason 没写的中间态；无审计追溯
- **修复**：
  1. 合并两个 update 到 1 个 `$transaction`
  2. 写 `AuditLog`
- **估时**：1h

---

# 第二部分：【建议修复】（上线后 1-2 周内）

## A. 性能优化

### [SHOULD-1] **Post 创建后无事务联动 4 大子表**
- **文件**：`post.service.ts:197-218`
- **影响**：主表有记录但无详情的不一致状态
- **修复**：DTO 用 `discriminated union` + `$transaction` 写主表 + 详情表
- **估时**：2h

### [SHOULD-2] **列表查询的 keyword `contains` 走全表扫**
- **文件**：`post.service.ts:58-63`
- **影响**：百万行 P99 秒级
- **修复**：MUST-18 完成后切 FULLTEXT
- **估时**：1h（MUST-18 完成后）

### [SHOULD-3] **viewCount 并发竞争 + 缓存键无类型**
- **修复**：viewCount 改 Redis INCR，每 5min 批量 flush；缓存键用 `Object.keys` 排序
- **估时**：2h

### [SHOULD-4] **审核后缓存无 invalidation（用户看到 stale 数据）**
- **影响**：审核结果不实时
- **修复**：pass/reject/offline 完成后 `redis.del('cache:posts:*')`
- **估时**：1h

### [SHOULD-5] **Prisma `log: ['query', ...]` 会在生产刷屏**
- **修复**：`log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : [...]`
- **估时**：0.2h

### [SHOULD-6] **缺 compression 中间件**
- **修复**：`app.use(compression())`，列表响应 200KB+ 节省 80% 带宽
- **估时**：0.3h

### [SHOULD-7] **缺 Redis 列表缓存失效策略**
- **现状**：post 列表 5min TTL，但创建/更新/删除时不清缓存
- **修复**：写操作时 `redis.del(\`cache:posts:*\`)`
- **估时**：0.5h

## B. 安全加固

### [SHOULD-8] **缺 `class-sanitizer` — 用户输入字段未做 XSS 转义**
- **修复**：`description`/`content` 字段写入前转义
- **估时**：1h

### [SHOULD-9] **`loginBySms` 自动注册 + 无 CAPTCHA → 任意人可注册并登录**
- **文件**：`auth.service.ts:57-75`
- **修复**：
  1. 加 Cloudflare Turnstile / 极验滑块
  2. 同 IP/设备 24h 注册上限
  3. 新注册 24h 内仅能 POST 1 条 post
- **估时**：3h

### [SHOULD-10] **`favorites` 计数无并发保护**
- **修复**：改 `prisma.favorite.upsert`
- **估时**：0.3h

### [SHOULD-11] **`pageSize` 无 max 上限（DoS）**
- **修复**：DTO 加 `@Max(100)`
- **估时**：0.2h

### [SHOULD-12] **`parseInt` 未做 NaN 校验**
- **修复**：用 `ParseIntPipe` 或 `safeParseInt`
- **估时**：0.5h

### [SHOULD-13] **PrismaService.cleanDatabase 生产无兜底**
- **修复**：方法加 `if (process.env.NODE_ENV === 'production') throw`
- **估时**：0.2h

### [SHOULD-14] **Report 可被同一人对同一 post 重复举报**
- **修复**：`@@unique([userId, postId])`
- **估时**：0.2h

### [SHOULD-15] **Post 软删但 images 不清，浪费存储**
- **修复**：cron 清理 30 天前软删的 post + 其 images
- **估时**：0.5h

### [SHOULD-16] **删除用户硬删破坏数据**
- **修复**：改软删 `status=2`
- **估时**：0.5h

## C. UX 改进

### [SHOULD-17] **Token 存 localStorage + 无自动 refresh**
- **文件**：`frontend/src/lib/auth.ts` + `api.ts:42-47`
- **风险**：XSS 易失窃 + 7 天后被强制踢出
- **修复**：抽 `http.ts` 中间件 → 401 触发 refresh → 失败 clearAuth + 跳登录
- **估时**：2h

### [SHOULD-18] **详情页跳详情页无客户端缓存（SWR / React Query）**
- **修复**：引入 `swr` 或 `useCache`
- **估时**：2h

### [SHOULD-19] **未登录访问受保护页闪烁（无 SSR 期间 401 跳转）**
- **修复**：Next 15 Middleware 做 `matcher: ['/me/:path*', '/posts/publish']`
- **估时**：1h

### [SHOULD-20] **next.config 配了 /api/proxy 但没人用**
- **风险**：跨域部署时绝对地址有 CORS 问题
- **修复**：要么用 proxy，要么前后端同域部署
- **估时**：0.5h

### [SHOULD-21] **表单用 `alert()` 当 Toast**
- **修复**：引入 `sonner` 顶部 Toast
- **估时**：0.5h

### [SHOULD-22] **`me` 三个统计数（发布/收藏/留言）硬编码 0**
- **修复**：调用真实 API
- **估时**：0.5h

### [SHOULD-23] **暗色模式写好但无入口**
- **修复**：加 `next-themes` 切换按钮
- **估时**：1h

### [SHOULD-24] **Hero 区域装饰图移动端完全隐藏**
- **修复**：移动端用简化版
- **估时**：0.5h

### [SHOULD-25] **`bg-background/85 backdrop-blur-md` 低端 Android 滚动卡顿**
- **修复**：检测 `prefers-reduced-transparency` 退化为纯色
- **估时**：0.5h

### [SHOULD-26] **`next/font` 未使用，改用 `<link>` 加载 Google Fonts**
- **风险**：首屏 FOIT/FOUT + 隐私
- **修复**：切 `next/font/google`
- **估时**：0.5h

## D. 运营能力补齐

### [SHOULD-27] **批量审核 / 批量下架 API**
- **修复**：`POST /admin/posts/batch-audit` + `batch-offline`
- **估时**：1.5h

### [SHOULD-28] **Dashboard 看板升级（趋势 + UV + 转化）**
- **修复**：返回 `postsTrend` / `usersTrend` / `topAreas` / `topCategories`
- **估时**：3h

### [SHOULD-29] **数据导出（用户/帖子 Excel）**
- **修复**：加 `exceljs` + 2 个 admin 导出端点
- **估时**：2h

### [SHOULD-30] **公告 / 横幅系统**
- **修复**：`Announcement` model + 前后端 CRUD + 列表页头部取
- **估时**：3h

### [SHOULD-31] **/api/health 不会真正检查后端健康**
- **修复**：前端 health 主动 fetch 后端 `/health`，或用 NestJS terminus
- **估时**：0.5h

## E. 数据库 / 索引

### [SHOULD-32] **缺 `User(role)` 索引**
- **修复**：admin 列表不再全表扫
- **估时**：0.2h

### [SHOULD-33] **缺 `Post.expiredAt` 索引**
- **修复**：便民过期 cron 走索引
- **估时**：0.2h

### [SHOULD-34] **缺 `PostHouse` 复合索引**
- **修复**：`(rentalType, propertyType, areaSqm)`
- **估时**：0.2h

### [SHOULD-35] **缺 `Company.verified` 索引**
- **估时**：0.2h

### [SHOULD-36] **时区处理不一致（Z vs +08:00）**
- **修复**：统一 `DateTime` + 应用层显式 `Asia/Shanghai`
- **估时**：2h

### [SHOULD-37] **`Post` 缺 `slug` 字段（SEO 不友好）**
- **修复**：加 `slug: String?` + 详情页 URL 用 `/posts/[id]-[slug]`
- **估时**：2h

## F. 工程化

### [SHOULD-38] **JWT 验证每次查 DB（无缓存）**
- **修复**：自定义 validate 时直接 decode payload，详情才查
- **估时**：1h

### [SHOULD-39] **BigInt 序列化两处重复实现**
- **文件**：`transform.interceptor.ts:38-67` + `post.service.ts:23-35`
- **修复**：删 `post.service.ts:23-35` 的 `bigIntToString`，统一 interceptor
- **估时**：0.5h

### [SHOULD-40] **缺 Swagger / OpenAPI 文档**
- **修复**：`npm i @nestjs/swagger` + `app.module.ts` 启用
- **估时**：2h

### [SHOULD-41] **缺 nestjs-pino 结构化日志**
- **估时**：1h

### [SHOULD-42] **缺 GitHub Actions（lint + test + build）**
- **估时**：2h

---

# 第三部分：【后续迭代】（V1.1 / V2）

> 这些功能影响**竞争力 + 营收**，但 V1 上线前不必做。优先级排序：V1.1 → V2

## A. 商业化基建（V1.1 必做）

### [NEXT-1] **Banner / 信息流广告位基建**
- 4 张表：`Ad` / `AdSlot` / `AdImpression` / `AdClick`
- 前端 `<AdSlot name="home_top" />` 组件，首页/列表/详情预留位置
- 后台自助投放管理
- **估时**：8h

### [NEXT-2] **VIP 会员 + 付费置顶**
- 4 张表：`VipPlan` / `VipOrder` / `UserVip` / `PostTop`
- 列表查询 `orderBy: [{ isTop: 'desc' }, { createdAt: 'desc' }]`
- 前端 `/me/vip` 开通页
- **估时**：12h

### [NEXT-3] **简历置顶（招聘场景）**
- **估时**：3h

### [NEXT-4] **商家认证 + 商家主页**
- `Company.licenseUrl/licenseNo/contactPhone/verifiedAt/verifiedBy`
- 商家主页 `/companies/[id]`
- **估时**：8h

### [NEXT-5] **友情链接 / 站点联盟**
- `FriendLink` model + 首页底部展示 + 后台 CRUD
- **估时**：2h

### [NEXT-6] **内容举报奖励机制（积分系统）**
- `User.credit` 字段 + 有效举报奖励
- **估时**：4h

## B. 内容生态（V1.1-V2）

### [NEXT-7] **拼车/顺风车/同城交友/宠物/教育**
- 增加分类 + 帖子模板
- **估时**：每类 4-8h

### [NEXT-8] **资讯/头条/UGC 话题**
- 内容化是分类信息站二次增长曲线
- **估时**：40h+

### [NEXT-9] **担保交易 + 在线支付**
- `Order`/`Payment`/`Refund` 表 + 微信支付
- **估时**：80h+

## C. 微信生态（V1.1 必做）

### [NEXT-10] **微信小程序 + 微信登录 + 微信支付**
- 抢伊春本地微信流量
- **估时**：80h+

## D. 进阶搜索 / 推荐

### [NEXT-11] **ES 替换 MySQL FULLTEXT**
- **触发条件**：数据量 > 10w
- **估时**：24h

### [NEXT-12] **推荐算法 / 个性化**
- 基于 `ViewLog` / `Favorite` / `Search` 做协同过滤
- **估时**：60h+

### [NEXT-13] **地图找房 / LBS 周边**
- 房屋 `longitude`/`latitude` 已有
- 接高德/腾讯地图 SDK
- **估时**：16h

## E. 实时通讯

### [NEXT-14] **IM 即时聊天（替换站内信）**
- WebSocket / Socket.IO
- 客服系统（智齿 / 美洽）
- **估时**：80h+

## F. 直播 / 短视频

### [NEXT-15] **直播 / 短视频**
- 二手直播带货
- 短视频信息流
- **估时**：200h+

## G. 基础设施升级

### [NEXT-16] **阿里云 OSS 替换本地 uploads/**
- **估时**：6h

### [NEXT-17] **Sentry 错误上报**
- **估时**：3h

### [NEXT-18] **NestJS 10 升 11 / Prisma 5 升 6 / React 19 GA**
- **估时**：16h

### [NEXT-19] **CI/CD 完善 + 自动化测试**
- 单元测试 + e2e + 覆盖率门槛
- **估时**：40h+

---

# 第四部分：0458.cn 差距分析报告

> 数据采集日期：2026-06-11
> 数据来源：搜狗/百度收录页 + 0458.cn 公开元信息

## 0458.cn 基础画像

| 维度 | 信息 |
|---|---|
| 站点名 | 伊春信息网 |
| 域名 | www.0458.cn（伊春区号） |
| 运营方 | 七台河广讯网络信息服务有限公司（注册 2003-03-17） |
| 域名年龄 | **23 年**（不可复制的 SEO 护城河） |
| 收录量 | "伊春二手房" Sogou ~10,747 条 |
| 移动端 | 无小程序 / 公众号，WAP 响应式，无 PWA |
| 风控 | 极高（普通 IP/UA 一律 403） |

## 核心功能对比矩阵

| 功能 | 0458.cn | 本项目 | 差距 |
|---|---|---|---|
| 用户体系 | 手机号 | ✅ 手机号 + JWT | 持平 |
| **微信登录** | ❌ 无 | ❌ 无 | **都缺（必补）** |
| 发布流程 | 3 步 | 3 步 | 持平 |
| 搜索 | 关键词+区域+分类 | LIKE 简化版 | 持平，待 FULLTEXT 升级 |
| 联系方式 | **公开电话** | 设计为站内信 | **本项目合规更优** |
| 评论 | ✅ | ✅ | 持平 |
| 收藏 | 弱 | ✅ | **本项目优** |
| 举报 | 弱 | ✅ | **本项目优** |
| **公司主页 + 招聘闭环** | ❌ 无 | ✅ | **本项目强差异化** |
| **审核流** | ❌ 无 | ✅ | **本项目强差异化** |
| **简历 + 投递** | ❌ 无 | ✅ | **本项目强差异化** |
| **管理后台 UI** | ❌ 站长手工 | ✅ 后端 API 完工 | **本项目优** |
| 商家入驻 | ✅ | ❌ 无 | **0458 优** |
| VIP 会员 | ✅ | ❌ 无 | **0458 优** |
| 置顶服务 | ✅ | ❌ 无 | **0458 优** |
| 付费刷新 | ✅ | ❌ 无 | **0458 优** |
| 同城交友 | ✅ | ❌ 无 | **0458 优** |
| 拼车/顺风车 | ✅ | ❌ 无 | **0458 优** |
| 宠物/教育 | ✅ | lifebiz 承载 | 持平 |

## 变现模式对比

| 模式 | 0458.cn | 本项目 | 备注 |
|---|---|---|---|
| 横幅广告位 | ✅ 多 | ❌ 未规划 | 0458 优 |
| 商家入驻收费 | ✅ | ❌ 无 | 0458 优 |
| VIP 会员 | ✅ | ❌ 无 | 0458 优 |
| 置顶/加精/刷新 | ✅ 三件套 | ❌ 无 | 0458 优 |
| 招聘信息收费 | ⚠️ 推断有 | ❌ 无 | 0458 优 |
| 房产中介收费 | ⚠️ 推断有 | ❌ 无 | 0458 优 |
| SEO 引流收益 | ✅ 强 | ❌ 未做 sitemap | 0458 优 |
| 流量分成（联盟） | ✅ | ❌ 无 | 0458 优 |
| 微信小程序/支付 | ❌ 无 | ❌ 无 | 都缺 |

## 本项目已超越 0458.cn 的点

1. ✅ **完整的数据模型与状态机** — `auditStatus` 7 态、`Report` 三态机
2. ✅ **公司主页 + 招聘完整闭环** — 投递→收简历
3. ✅ **树形分类 + 树形区域** — 伊春全市覆盖
4. ✅ **统一响应 + 全局异常 + JWT 双 token + Redis 黑名单**
5. ✅ **管理后台（API 完工）** — 审核/封禁/看板
6. ✅ **Docker Compose 完整工程化**
7. ✅ **TypeScript 全栈 + Prisma 强类型**
8. ✅ **图片上传基础设施**
9. ✅ **审计日志位**（数据库设计预留）

## SEO 差距

| 维度 | 0458.cn | 本项目 | 差距 |
|---|---|---|---|
| 域名年龄 | 23 年 | 0 | **无法弥补（可买老域名）** |
| 收录量 | 10k+ | 0 | 需 6-12 月养站 |
| 标题/描述/关键词 | 模板化 | 未做 | 必补 |
| sitemap.xml | ✅ | ❌ | 必补 |
| robots.txt | ✅ | ❌ | 必补 |
| 静态化 URL | ✅ | ❌ | V1.1 必做 |
| 面包屑 | ✅ | ❌ | 必做 |
| 内链结构 | 强 | 弱 | 必做 |

## 移动端差距

| 维度 | 0458.cn | 本项目 | 差距 |
|---|---|---|---|
| WAP/响应式 | ✅ 完整 | ⚠️ 响应式未完善 | 必补 |
| 微信小程序 | ❌ 无 | ❌ 无 | **V1.1 抢跑** |
| 公众号 | ❌ | ❌ | 必做 |
| PWA | ❌ | ❌ | 必做 |

## 0458.cn 的核心优势

1. **23 年老域名 + 23 年 SEO 沉淀**（不可复制）
2. **变现体系成熟**（VIP + 置顶 + 商家 + 广告 + 收费刷新）
3. **本地化品类齐全**（拼车、征婚、二手车、宠物）
4. **用户发布习惯已养成**（"有事找 0458"心智）

## 0458.cn 的核心劣势（本项目的机会）

1. **技术栈老旧**（2010 年代 PHP）
2. **无审核流**（虚假信息充斥）
3. **公开电话**（隐私泄露 + 合规风险）
4. **无公司主页 / 招聘闭环**
5. **无管理后台 UI**
6. **无 LBS / 无地图**
7. **无内容化**

## 推荐策略

| 阶段 | 策略 |
|---|---|
| **V1 (0-3 月)** | 补齐 0458 已有功能，**先打平** |
| **V1.1 (3-6 月)** | 付费置顶/刷新 + 微信小程序 + sitemap SEO + H5 完善，**变现启动** |
| **V1.2 (6-12 月)** | VIP 会员 + 商家入驻 + IM + 地图找房，**形成体验壁垒** |
| **V2 (12 月+)** | 资讯/UGC + 拼车/顺风车/同城交友 + ES + OSS，**生态扩展** |

**核心理念**：0458 的 23 年 SEO 抢不走，但 23 年技术债**可以抢走**。

---

# 第五部分：上线前检查表（按 P0/P1/P2 分类）

## P0 — 必须完成（阻塞上线）

> 总计 **25 项**，预计 40-50 工时

### 安全 P0（8 项）
- [ ] MUST-1 轮换 JWT 密钥 + MySQL 密码 + Redis 密码
- [ ] MUST-2 User 写接口加 admin 鉴权 + UpdateUserDto 排除敏感字段
- [ ] MUST-3 Admin 角色查 DB 二次校验
- [ ] MUST-4 CORS 改白名单
- [ ] MUST-5 文件上传用 `file-type` 嗅探 + 拒 svg/html
- [ ] MUST-6 加 helmet
- [ ] MUST-7 SMS 验证码失败计数 + IP 限频
- [ ] MUST-8 公开用户接口 phone 脱敏

### Bug P0（5 项）
- [ ] MUST-9 4 个子 Controller 注册到 PostModule
- [ ] MUST-10 React 19 RC 升 GA + @types/react 19
- [ ] MUST-11 useSearchParams 包 Suspense
- [ ] MUST-12 publish 页补全 3 种类型字段
- [ ] MUST-13 详情页 4 个核心按钮接 API

### 基建 P0（6 项）
- [ ] MUST-14 admin/ Next.js 项目 init
- [ ] MUST-15 生产 docker-compose + nginx + SSL
- [ ] MUST-16 3 张日志表（AuditLog/LoginLog/ViewLog）
- [ ] MUST-17 站内信 Message Module
- [ ] MUST-18 MySQL FULLTEXT 索引
- [ ] MUST-19 /me/posts、/me/favorites 子页

### SEO P0（2 项）
- [ ] MUST-20 PWA / favicon / manifest / robots / sitemap
- [ ] MUST-21 详情页独立 metadata + JSON-LD

### 运营合规 P0（4 项）
- [ ] MUST-22 敏感词过滤
- [ ] MUST-23 @nestjs/schedule 定时任务（过期下架）
- [ ] MUST-24 @nestjs/throttler 全局限流
- [ ] MUST-25 Admin 审核事务修复 + 审计日志

## P1 — 建议完成（上线后 1-2 周）

> 总计 **42 项**，预计 60-80 工时

### 性能 P1（7 项）
- SHOULD-1 ~ SHOULD-7

### 安全 P1（9 项）
- SHOULD-8 ~ SHOULD-16

### UX P1（10 项）
- SHOULD-17 ~ SHOULD-26

### 运营 P1（5 项）
- SHOULD-27 ~ SHOULD-31

### DB P1（6 项）
- SHOULD-32 ~ SHOULD-37

### 工程 P1（5 项）
- SHOULD-38 ~ SHOULD-42

## P2 — 上线后迭代（V1.1/V2）

> 商业化基建 + 内容生态 + 微信生态 + 进阶搜索 + IM + 直播

详见第三部分（NEXT-1 ~ NEXT-19）。

---

# 第六部分：项目优先级矩阵

```
紧急 × 重要 矩阵：

                紧急（必须修）
                    │
   立即做           │
   ┌───────────────┼───────────────┐
   │ MUST-1~8 (安全)│ MUST-14~25    │
   │ MUST-9~13(Bug)│ (基建+运营)    │
   │               │               │
重 ─┼───────────────┼───────────────┼─ 轻
要 │ SHOULD-*      │ NEXT-*        │
   │ (性能/UX/工程) │ (商业化/生态)  │
   │               │               │
   └───────────────┼───────────────┘
   计划做          │ 暂缓
                不紧急
```

---

# 附录：审计 SubAgent 报告索引

| SubAgent | 关注维度 | 报告 |
|---|---|---|
| 1 | 后端安全 + Bug | S1-S8, I1-I14, M1-M25 |
| 2 | 前端 UX + 移动端 + SEO | S1-S5, I1-I8, U1-U17 |
| 3 | 运营/商业化 | OPS1-OPS8, M1-M7, V1-V8 |
| 4 | 0458.cn 对标 | 基础画像 / 矩阵 / 变现 / 策略 |
| 5 | 代码结构 + 依赖 | 依赖审计 / DB / CodeGraph |

---

# 总结

**当前项目状态**：约 70% 完成度，后端 95%、用户端 30%、管理后台 0%

**V1 上线阻塞项**：25 项 P0（40-50 工时）

**V1.1 营收启动项**：商业化基建（Banner / VIP / 置顶 / 商家）12 张表 + 4 大前端页

**差异化策略**：用工程化优势对冲 SEO 劣势，锁定"可信 + 隐私 + 移动 + 微信"定位

**目标**：3 个月内达到可正式上线运营状态；6 个月内启动变现；12 个月内建立护城河。
