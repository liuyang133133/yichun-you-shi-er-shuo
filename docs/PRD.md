# PRD 产品需求文档

> **项目**：伊春有事儿说（Yichun You Shi Er Shuo）
> **版本**：v1.0（PM 重梳版，整合自 ARCHITECTURE.md + project-memory.md + 验收报告）
> **维护人**：Hermes（PM）
> **最后更新**：2026-06-15
> **配套文档**：[ARCHITECTURE.md](./ARCHITECTURE.md) / [DATABASE.md](./DATABASE.md) / [TASKS.md](./TASKS.md) / [ROADMAP.md](./development-roadmap.md) / [PROJECT_MEMORY.md](./project-memory.md) / [CHANGELOG.md](./CHANGELOG.md)

---

## 1. 产品定位

面向 **黑龙江省伊春市** 本地居民的**分类信息发布平台**，覆盖日常"找工作 / 找房子 / 买卖二手 / 发便民信息"四大核心需求，是参照 `0458.cn`（伊春本地门户）形态构建的**现代化、可商业化**版本。

**对比 0458.cn 的差异化**：

| 维度 | 0458.cn 现状 | 本项目目标 |
|---|---|---|
| 视觉 | 老旧 PHP 模板 | Next.js 15 + Shadcn UI 现代化 |
| 移动端 | 缩放版 PC | H5 响应式 + 后续小程序 |
| 互动 | 简单留言 | 完整评论 / 收藏 / 举报 / 私信 |
| 审核 | 人工 | 人工 + 敏感词 DFA + 浏览去重 |
| 商业化 | 简单 banner | 公告系统（V1 起步，置顶 / VIP 留 V2） |

---

## 2. 目标用户与场景

| 角色 | 占比预期 | 核心诉求 |
|---|---|---|
| 普通市民 | 70% | 浏览、搜索、联系发布者 |
| 个人发布者 | 20% | 发布招聘/二手/房源/便民，管理自己的帖子 |
| 管理员 | 3% | 内容审核、用户管理、查看数据 |
| 平台运营 | 7% | 公告发布、类目维护 |

**核心用户故事**：

- **US-001 求职者**：希望按"行业+薪资"筛选岗位，并保存感兴趣的职位到收藏夹，以便后续联系招聘方
- **US-002 房东**：希望上传多张房源图片、填写租金和户型，并提交审核，让租客能找到我
- **US-003 二手卖家**：希望发布商品多图、定合理价格、回复买家留言，让商品快速出手
- **US-004 招聘方**：希望录入公司信息后批量发布职位，并查看收到的简历投递
- **US-005 审核员**：希望看到待审核队列，按违规类型筛选，并对违规内容一键驳回（带理由）
- **US-006 运营**：希望看到昨日各模块发布量、审核通过率、举报处理时效，调整运营策略
- **US-007 管理员**：希望禁用违规用户、清空其全部发布，并记录操作日志

---

## 3. V1.0 功能矩阵（已交付）

| 模块 | 编号 | 状态 | 关键能力 |
|---|---|---|---|
| **用户系统** | M01 | ✅ 已交付 | 手机号验证码 / 密码登录、JWT 双 token（access 7d + refresh）、Redis 黑名单、Cloudflare Turnstile 人机验证、自动注册 |
| **招聘求职** | M02 | ✅ 已交付 | 职位发布（公司关联）、简历投递、收到投递列表、薪资/学历/经验筛选 |
| **房屋租售** | M03 | ✅ 已交付 | 整租/合租/二手/出售、户型/面积/价格/小区筛选、JSON 配套设施 |
| **二手交易** | M04 | ✅ 已交付 | 多类目、多图、成色筛选 |
| **便民信息** | M05 | ✅ 已交付 | 含过期字段、首页分类展示 |
| **管理后台** | M06 | ✅ 已交付 | 独立 `admin/` Next.js 项目，5 页面（登录/看板/帖子/用户/举报/公司），单/批量审核 + 单/批量下架 |
| **站内信** | M07 | ✅ 已交付 | 私信 module + `/me/messages` 前端页面 |
| **公告系统** | M08 | ✅ 已交付 | admin CRUD + public 活跃展示 + 前端 banner |
| **敏感词过滤** | M09 | ✅ 已交付 | DFA 字典树，发布/评论入口 |
| **浏览量防刷** | M10 | ✅ 已交付 | IP+UserId Redis SET NX 去重，ViewLog 落库 |

---

## 4. 关键流程

### 4.1 发布信息流程

```
注册/登录 → 进入 /posts/publish → 选择类型（house/secondhand/job/lifebiz）
  → 填写基础信息（标题、描述、分类、区域）
  → 填写类型专属字段（house: 户型/租金/小区；job: 薪资/经验/学历…）
  → 上传图片（≤5MB, jpg/png/webp/gif，本地存储待切 OSS）
  → 提交 → 状态=pending（待审核）
  → 审核员通过 → 状态=active（公开可见）
```

### 4.2 审核流程

```
admin 登录 → /admin/posts → 列表（默认 auditStatus=pending）
  → 单条 / 批量操作
    → action=pass → Post.auditStatus=passed, status=active
    → action=reject + reason → Post.auditStatus=rejected, status=rejected
    → action=offline + reason → Post.status=deleted（强制下架）
  → 全部写 AuditLog（adminId、action、reason、ip、ua、timestamp）
```

### 4.3 鉴权流

```
客户端 → 登录接口 → 后端验证 → 下发 accessToken (7d) + refreshToken
  → 客户端存 token → 后续请求 Authorization: Bearer
  → 后端 JwtAuthGuard 拦截 → 解析 token → 查 DB（带 Redis 5min 缓存）拿 user
  → admin 路由额外 AdminGuard 检查 role=admin
  → 登出 → accessToken 进 Redis 黑名单（剩余有效期内拒绝）
```

### 4.4 注册限频流

```
新人首次发帖 → preCheckRegister(ip, phone) → IP 24h ≤ 5、phone 7d ≤ 3
  → 通过 → 创建用户
  → 失败 → 429

新人首次发帖 → assertCanPost(userId) → 查 user.createdAt，< 24h → 限制 1 帖
```

---

## 5. 非功能需求

| 类别 | 指标 | 当前实现 |
|---|---|---|
| 性能 | 列表页 < 500ms | Redis 5min 列表缓存 + Prisma |
| 性能 | 首屏 < 2s | Vite + Next.js SSR（部分页） |
| 安全 | 防 SQL 注入 | Prisma 参数化 + BigInt 转换 |
| 安全 | 防 XSS | 前后端转义 + DFA 敏感词 |
| 安全 | 防撞库 | Cloudflare Turnstile（生产 fail-closed） |
| 安全 | 手机号脱敏 | Resume PATCH / User 管理接口 |
| 安全 | CORS | 白名单（空=仅同源 + boot warn） |
| 安全 | 限流 | @nestjs/throttler 全局 + IP 维度 60s/10 次 |
| 可用 | CI | GitHub Actions（type-check + build × 3 job） |
| 可用 | 日志 | nestjs-pino 结构化（reqId 注入） |
| 可用 | 监控 | ❌ 未接 Sentry（P2） |
| 数据 | 30 天硬清 | @nestjs/schedule 定时 + admin `/admin/posts/purge` 手动 |

---

## 6. 数据模型（高层视图）

详细 ER 见 [DATABASE.md](./DATABASE.md)。

```
User ──┬── Post ──┬── PostHouse / PostSecondhand / PostJob / PostLifebiz
       │          ├── PostImage（V1 预留）
       │          ├── Comment（树形）
       │          ├── Favorite
       │          ├── Report
       │          └── ViewLog
       ├── Company ── PostJob
       ├── Resume
       ├── JobApplication ── Resume + PostJob
       ├── Message（站内信）
       ├── AuditLog / LoginLog
       └── Category / Area（字典）
```

13 个核心 model + 4 张日志表（Message/ViewLog/AuditLog/LoginLog）= 17 张表。

---

## 7. 范围边界

### V1.0 在做

- 上述 M01–M10 全部已交付
- PC + H5 响应式用户端
- 独立 admin 管理后台

### V1.0 不做

- 原生 iOS / Android App
- 支付闭环（二手仅信息撮合）
- 即时通讯（用站内信 + 电话）
- 视频内容
- 真实 OSS 接入（V1 本地存储）

### V1.1 / V2 候选

- 单元测试补全（0 → 60%）
- 阿里云 OSS 替换本地存储
- Sentry 错误上报
- sitemap 完善 + Google Search Console
- 微信小程序 + 微信登录/支付
- IM 即时聊天替换站内信
- VIP 会员 / 付费置顶
- 地图找房

---

## 8. 待用户确认事项

- [ ] 上线目标城市：当前是 **伊春市**（seed 已固定），如换城市需重 seed
- [ ] 短信服务商：当前 **mock**（控制台打印），生产需选型（阿里云/腾讯云）
- [ ] CAPTCHA 厂商：已选 **Cloudflare Turnstile**（国内访问需评估或 fallback 阿里云滑块）
- [ ] 信息免费发布上限：当前**无业务上限**（Sprint 5 加了新用户 24h 1 帖软限）
- [ ] 商业化路径：V1 公告系统起步，置顶/VIP 留 V2

---

## 9. 验收标准（V1.0 上线版）

### 功能验收（13 冒烟用例，2026-06-11 v2 复验全 PASS）

- F-1 后端在 Node 18.18 可启动 ✅
- F-2 4 张日志表 + 2 FULLTEXT 索引已落库 ✅
- F-3 搜索接口 4 种参数组合均 200 ✅
- F-4 `/resumes/me` 不再 500 ✅
- F-5 CORS 恶意 origin 被拒 ✅
- F-6 普通用户 PATCH 自己不被拒 ✅
- + Admin 端到端：登录 → JWT role=admin → `/admin/dashboard` 200 ✅（Sprint 4 修）

### 性能 / 体验验收

- 列表分页 pageSize ≤ 100（SHOULD-7）
- 5677B → 964B compression（83% 节省，SHOULD-6）
- 暗色模式 / 时区统一（Asia/Shanghai，SHOULD-23/36）

### 阻塞 V1.0 上线的 4 项手动操作

1. 🔔 MySQL 密码轮换（`openssl rand -hex 16` → 同步 .env）
2. 🔔 生产环境启动（`docker compose -f docker-compose.prod.yml`）
3. 🔔 HTTPS 证书（nginx 配置就位，需 Let's Encrypt 签发）
4. 🔔 Admin 业务流端到端验证（1h SMS 限频冷却后跑）

---

## 10. 相关文档

- 架构设计 → [ARCHITECTURE.md](./ARCHITECTURE.md)
- 数据库 ER / 表结构 → [DATABASE.md](./DATABASE.md)
- 任务清单 → [TASKS.md](./TASKS.md)
- 路线图 → [development-roadmap.md](./development-roadmap.md)
- 项目记忆 → [project-memory.md](./project-memory.md)
- 变更日志 → [CHANGELOG.md](./CHANGELOG.md)
- 文档入口 → [index.md](./index.md)
- 验收记录 → [acceptance-report-2026-06-11.md](./acceptance-report-2026-06-11.md)
- 审计快照 → [audit-report-2026-06-11.md](./audit-report-2026-06-11.md)
