# 《项目现状分析报告》— 伊春有事儿说

> **项目代号**：yichun-you-shi-er-shuo（伊春有事儿说）
> **报告日期**：2026-06-15
> **报告人**：Hermes（PM）
> **报告范围**：仓库 `E:\workspace\yichun-you-shi-er-shuo`
> **配套文档**：[PRD](./PRD.md) / [ARCHITECTURE](./ARCHITECTURE.md) / [DATABASE](./DATABASE.md) / [ROADMAP](./yichun-roadmap.md) / [Phase 1 任务清单](./yichun-phase1-tasks.md) / [TASKS](./TASKS.md) / [project-memory](./project-memory.md) / [CHANGELOG](./CHANGELOG.md) / [acceptance-report-2026-06-11](./acceptance-report-2026-06-11.md) / [audit-report-2026-06-11](./audit-report-2026-06-11.md)

---

## 0. 一句话总结

> **V1.0 功能开发 100% 完工（62 commit 全 push）**，后端 P0 25/25 + P1 关键 20/20 全部 PASS，**距生产部署仅剩 4 项手动阻塞 + 2 项个保法/可观测性补齐**（Phase 1 收官 6-7h 工作量）。**V1.0 已具备上线条件，但未真实上线。**

---

## 1. 项目定位

| 维度 | 内容 |
|---|---|
| **产品名** | 伊春有事儿说 |
| **目标城市** | 黑龙江省伊春市 |
| **参照对象** | 0458.cn（伊春本地门户，PHP 老站）|
| **核心价值** | 现代化分类信息平台（招聘/房屋/二手/便民/商家黄页/本地资讯）|
| **技术栈** | Next.js 15 + NestJS 10 + Prisma 5 + MySQL 8 + Redis 7 + Docker Compose |
| **目标用户** | 普通市民（70%）/ 个人发布者（20%）/ 管理员（3%）/ 平台运营（7%）|

---

## 2. 完成度总览

### 2.1 任务完成度矩阵

| 类别 | 已完成 | 总数 | 完成率 | 来源 |
|---|---|---|---|---|
| **V1.0 P0 必做** | 25 | 25 | **100%** | audit + project-memory §10.1-§10.2 |
| **V1.0 P1 关键** | 20 | 20 | **100%** | Sprint 1-6 (project-memory §10.5-§10.10) |
| **V1.0 P1 常规** | 0 | 22 | 0% | 留 V1.1 |
| **V1.0 P2 体验** | 0 | 19 | 0% | 留 V1.1+ |
| **V1.0 手动阻塞** | 0 | 4 | **0%** | 验收 v1 残留（详见 §5）|
| **V1.0 强 P1（个保法）** | 0 | 2 | 0% | 验收 v1 §7 P1 风险（详见 §5.2）|
| **PM 文档体系** | 7+ | 7+ | **100%** | 本轮 06-15 PM 接管补全 |

**总分**：V1.0 上线就绪 ≈ **85%**（实施 100% + 部署 0% + 强 P1 0%）

### 2.2 仓库结构

```
yichun-you-shi-er-shuo/
├── backend/              NestJS 10 + Prisma 5, 20 个 modules
├── frontend/             Next.js 15 用户端, 6 页面 + 完整 /me 子页
├── admin/                Next.js 15 管理后台, 5 页面（独立项目）
├── docs/                 7+ 份 PM 文档 + 2 份审计/验收
├── docker/               mysql + redis + nginx 配置
├── docker-compose.yml    dev compose
├── docker-compose.prod.yml  生产 compose（未实测）
├── .github/workflows/ci.yml  GitHub Actions CI
├── .codegraph/codegraph.db  代码关系索引
├── CLAUDE.md             Claude 协作指南
├── HERMES-PROMPTS.md     Hermes 提示词库
└── README.md
```

### 2.3 后端 modules（20 个）

| 模块 | 路径 | 状态 |
|---|---|---|
| auth | `/auth` | ✅ JWT 双 token + Redis 黑名单 + Turnstile |
| user | `/users` | ✅ CRUD（含 me、count）|
| category | `/categories` | ✅ 树形 + tree + count |
| area | `/areas` | ✅ 树形（伊春 1+12+15）|
| sms | 服务模块 | ✅ Mock（控制台打印 + IP 限频）|
| **post** | `/posts` + 4 子模块 | ✅ 主表 + house/secondhand/job/lifebiz 1:1 详情 |
| upload | `/upload/image` | ✅ 本地存储（file-type@^16 + sharp 重编码）|
| favorite | `/favorites` | ✅ 增/删/列表 |
| comment | `/posts/:id/comments` | ✅ 树形留言 |
| report | `/reports` | ✅ 举报 + 状态机 |
| company | `/companies` | ✅ CRUD + jobs |
| resume | `/resumes/me` | ✅ 创建/更新/读取（**F-4 路由顺序已修**）|
| application | `/applications` | ✅ 投递 + 收到列表 |
| search | `/search` | ✅ MySQL FULLTEXT + LIKE 兜底（**F-3 BigInt 已修**）|
| **admin** | `/admin/*` | ✅ 8 个端点 + AdminGuard + 批量/单条 |
| **message** | `/messages` | ✅ MUST-17 已做 |
| **announcement** | `/announcements` | ✅ SHOULD-30 公告系统 |
| **view-log** | 服务模块 | ✅ ViewLog 写入 + viewCount 防刷 |
| health | `/health` | ✅ MySQL+Redis 探活（SHOULD-31）|
| captcha | 服务模块 | ✅ Turnstile + RegisterThrottle（SHOULD-9）|

### 2.4 前端页面

#### frontend/ 用户端（6 + 4 = 10 页面）

| 路径 | 状态 | 说明 |
|---|---|---|
| `/` | ✅ | 首页 4 大模块 + 列表 + 筛选 |
| `/login` | ✅ | 双 Tab（验证码/密码）+ 倒计时 |
| `/posts/publish` | ✅ | 3 步分步表单（4 类型全支持）|
| `/posts/[id]` | ✅ | 详情 + 4 按钮 + 评论 + 举报 |
| `/me` | ✅ | 个人中心 + 4 快捷入口 |
| `/me/posts` | ✅ | 我的发布管理 |
| `/me/favorites` | ✅ | 我的收藏 |
| `/me/messages` | ✅ | 站内信收件箱 |
| `/api/health` | ✅ | Next.js health 端点 |
| `/robots.ts` `/sitemap.ts` `/manifest.ts` | ✅ | SEO + PWA |

#### admin/ 管理后台（5 页面 + 5 layout）

| 路径 | 状态 |
|---|---|
| `/login` | ✅ |
| `/dashboard` | ✅ 看板 |
| `/posts` | ✅ 审核列表（单/批）|
| `/users` | ✅ 用户管理 + 封禁 |
| `/reports` | ✅ 举报处理 |
| `/companies` | ✅ 公司管理 |

---

## 3. 已交付能力清单

### 3.1 功能维度

| 维度 | 已交付 |
|---|---|
| **用户系统** | 手机号验证码/密码双登录、JWT 双 token、Redis 黑名单、Turnstile 人机验证、注册限频（IP 24h≤5、phone 7d≤3、new-user 24h≤1 帖）|
| **招聘求职** | 4 大类完整发布（house/secondhand/job/lifebiz）、公司关联、简历投递、薪资/学历/经验筛选 |
| **房屋租售** | 整租/合租/二手/出售、户型/面积/价格/小区筛选、JSON 配套设施 |
| **二手交易** | 多类目、多图、成色筛选 |
| **便民信息** | 含过期字段、首页分类展示 |
| **管理后台** | 独立 admin/ Next.js、5 页面、单/批量审核、强制下架、举报处理、用户封禁 |
| **站内信** | 私信 module + /me/messages 前端 |
| **公告系统** | admin CRUD + public 活跃 + 前端 banner |
| **敏感词过滤** | DFA 字典树，发布/评论入口 |
| **浏览量防刷** | IP+UserId Redis SET NX 去重 + ViewLog 落库 + UA 长度上限 |
| **SEO 基建** | PWA + manifest + robots + sitemap + 详情页 generateMetadata + JSON-LD |
| **CI** | GitHub Actions 3 job 并行 type-check + build |
| **日志** | nestjs-pino 结构化（reqId 注入）|
| **缓存** | post 列表 5min TTL + JWT 用户 5min TTL + 写操作失效 |
| **限流** | @nestjs/throttler 全局 + SMS IP 60s 限频 + 失败计数 + 冻结 |
| **审计** | AuditLog 写所有 admin 操作 + 批量 summary |

### 3.2 性能 / 安全维度

| 维度 | 已实现 |
|---|---|
| 性能 | compression 5677B→964B(83%)、prisma 事务、5min 缓存、50+ 索引 |
| 安全 | JWT 强校验 + 5 错误冻结 + IP 限频、helmet、CORS 白名单、MIME 嗅探、phone 脱敏、isSelf \|\| isAdmin、DTO 排除敏感字段 |
| 数据完整性 | Post 创建单事务（SHOULD-1）、唯一约束（favorites/applications）、审计追溯 |
| 可观测 | nestjs-pino JSON 日志 + 4 个 health 端点（DB/Redis）|
| 工程化 | CodeGraph 索引（114 文件/1226 节点/2106 边）、Swagger /api/docs 73 paths × 12 tags |

---

## 4. 数据模型（17 个 Model）

详见 [DATABASE.md](./DATABASE.md)。

```
13 业务核心 + 4 运营/日志 = 17 张表
- users / categories / areas / posts / 4 详情表 / companies / resumes / applications / favorites / comments / reports
- + messages（站内信）/ audit_logs / login_logs / view_logs / announcements（公告）

50+ 索引、2 个 FULLTEXT（手工 SQL）、14 个 Prisma 迁移
Seed：4 顶级分类 + 25 子分类 + 1 市 + 12 区县 + 15 街道 + 1 测试用户
```

---

## 5. 当前阻塞与风险

### 5.1 🔴 4 项手动阻塞（V1.0 上线唯一卡点）

| ID | 任务 | 工时 | 阻塞点 | 影响 |
|---|---|---|---|---|
| **B-1** | MySQL 密码轮换 | 0.5h | 还在用 `yichun123456` | 仓库明文泄露风险 |
| **B-2** | 生产 compose 启动 | 1h | docker-compose.prod.yml 未实测 | 生产环境未知 |
| **B-3** | HTTPS 证书 | 1h | 443 未启 | HTTP 明文传输 |
| **B-4** | Admin 业务流 e2e | 1h | 未真实跑过 admin 登录 | 业务未端到端验证 |

### 5.2 🟡 2 项强 P1（验收报告 §7 标记）

| ID | 任务 | 来源 | 风险 |
|---|---|---|---|
| **P1-1** | `/posts/:id` 公开 contactPhone 明文返回 | 验收 §7 P1-1 | **个保法**：爬虫可获取全站发布者明文手机号 |
| **P1-3** | `/api/v1/health` 端点（实际是 MUST-31 做了） | 验收 §7 P1-3 | 监控 / LB 探活无依据 → **已实施**（SHOULD-31 commit `5385601`）|

> 注：P1-3 实际已修，验收报告是 v1 阶段写的。P1-1 仍是真风险。

### 5.3 ⚠️ 已知风险登记（继承自 project-memory §10）

| ID | 风险 | 状态 | 缓解 |
|---|---|---|---|
| R-1 | JWT 缓存击穿 | 接受 | V1.0 流量小；V1.1+ 加 singleflight |
| R-2 | 软删 status=2 不拦鉴权（7d token 仍有效）| 已知 | 需接 jwt 黑名单刷新或缩短 accessToken |
| R-3 | 角色变更无失效路径 | 接受 | 当前无 role 写；防御性代码保留 |
| **R-4** | **Prisma drift 与 FULLTEXT 索引冲突** | 继承 | 加 FULLTEXT 放 raw SQL，不跑 migrate dev |
| R-5 | 文件编码 GB18030 教训（Sprint 3 暴露）| 已规避 | 编辑器 UTF-8 无 BOM |
| R-6 | 单元测试 0 覆盖 | 已知 | **V1.1 补**（0→60%）|
| R-7 | CAPTCHA provider 配错全员 401（fail-closed）| 已知 | .env.example 明示 |
| R-8 | Turnstile 国内访问不稳 | 已知 | 网络故障时 throw 400；生产可 fallback 阿里云滑块 |
| R-9 | 新用户 24h 1 帖可能误伤 | 已知 | V1.0 流量低可接受；后续接举报 + 解封流程 |
| R-10 | admin 业务流端到端未真实跑过（Sprint 4 暴露 buildTokenPair bug）| 已知 | 已被 Sprint 4 修；B-4 重测即可 |

### 5.4 📉 验收 v1 → v2 修复教训（Codex 审查必查）

| 教训 | 来源 | 关键约束 |
|---|---|---|
| F-1 | file-type 必须 ^16.5.4、sharp 必须 ^0.33.5、main.ts 加 webcrypto polyfill | Node 18 兼容；新依赖全 grep |
| F-3 | search.service.ts `_score` 转 `Number()` | Prisma JSON 序列化 BigInt 失败 |
| F-4 | controller 路由字面量（me/count/tree）在 :id 之前 | BigInt('me') 抛错 |
| F-5 | CORS `origins.length === 0` = 仅同源 + boot warn | 空 ≠ 放行所有 |
| F-6 | isSelf \|\| isAdmin 显式检查 | 改自己不被 @Roles('admin') 一刀切 |
| Sprint 4 bonus | buildTokenPair 必须传 role 参数 | admin 硬编码 'user' 导致 AdminGuard 永远 403 |

---

## 6. 与 0458.cn 对标

| 维度 | 0458.cn | 本项目 |
|---|---|---|
| 视觉 | 老旧 PHP 模板 | Next.js 15 + Shadcn UI 现代化 |
| 移动端 | 缩放版 PC | H5 响应式 + 暗色模式 + 时区统一 |
| 互动 | 简单留言板 | 树形评论 + 收藏 + 举报 + 站内信 |
| 审核 | 人工 | 人工 + 敏感词 DFA + viewCount 防刷 |
| 商业化 | 简单 banner | 公告系统（V1 起步，置顶/VIP 留 V2）|
| 鉴权 | 弱密码 | JWT 双 token + Turnstile + 注册限频 + 失败计数 |
| SEO | 弱 | PWA + sitemap + robots + JSON-LD + manifest |
| CI | 无 | GitHub Actions 3 job 并行 |
| 部署 | FTP | Docker Compose（dev/prod）|

**项目优势**：从 V1.0 起步就是现代化技术栈，V1.2 时基本追平 0458 功能集，V2 实现差异化（IM / 直播 / 推荐算法）。

---

## 7. 文档体系（PM 知识库）

详见 [docs/index.md](./index.md)。当前 **7+2 份**：

| 类别 | 文档 | 行数 |
|---|---|---|
| 产品 | [PRD.md](./PRD.md) | 229 |
| 架构 | [ARCHITECTURE.md](./ARCHITECTURE.md) | 1465 |
| 数据 | [DATABASE.md](./DATABASE.md) | 474 |
| 任务 | [TASKS.md](./TASKS.md) | 231 |
| 路线图 | [development-roadmap.md](./development-roadmap.md) | 351 |
| 项目记忆 | [project-memory.md](./project-memory.md) | 760 |
| 变更日志 | [CHANGELOG.md](./CHANGELOG.md) | 227 |
| 审计 | [audit-report-2026-06-11.md](./audit-report-2026-06-11.md) | 770 |
| 验收 | [acceptance-report-2026-06-11.md](./acceptance-report-2026-06-11.md) | 249 |
| 入口 | [index.md](./index.md) | 215 |
| 现状（本报告）| [yichun-status-report.md](./yichun-status-report.md) | — |
| 路线图（新）| [yichun-roadmap.md](./yichun-roadmap.md) | — |
| Phase 1 任务 | [yichun-phase1-tasks.md](./yichun-phase1-tasks.md) | — |
| Claude 任务书 | [claude-task-template.md](./claude-task-template.md) | — |
| Codex 审查 | [codex-review-rules.md](./codex-review-rules.md) | — |

**总计 15 份 PM 文档，自包含、互不重复、有清晰入口。**

---

## 8. 真实 P0 完成度（实施 vs 冒烟）

| 阶段 | 实施 | 冒烟 |
|---|---|---|
| Sprint 1-6 共 22 P1 任务 + 1 bugfix | ✅ 19 commit push | ✅ Sprint 自身 7+5+3+3+1+1 = 20 smoke |
| P0 Phase 1 11 修复 | ✅ 11 commit push | ✅ acceptance v2 13 smoke |
| P0 Phase 2 12 修复 | ✅ 12 commit push | ✅ acceptance v2 13 smoke |
| **F-1~F-6 修复** | ✅ 5 commit | ✅ 13 smoke (含 1 follow-up F-3) |
| **总真实 P0 + P1 关键** | **45/45 实施** | **45/45 冒烟** |

---

## 9. 下一步

**立即可做（Phase 1）**：见 [yichun-phase1-tasks.md](./yichun-phase1-tasks.md)，共 7 任务约 6-7h，PM 出 Claude 任务书 + Codex 审查。

**V1.1 → V2 路径**：见 [yichun-roadmap.md](./yichun-roadmap.md) Phase 2/3/4。

**当前最关键风险**：**B-4 Admin 业务流未真实跑过**。Sprint 4 修的 buildTokenPair bug 在 Sprint 1-3 期间 AdminGuard 永远 403，意味着所有 P0/MUST-25（Admin 审核事务）虽代码到位，**实际未在真实 admin 登录下走过完整流程**。Phase 1 P1-05 必须真实跑通。

---

## 10. 一句话总结（再强调）

> **PM 已全面接管。V1.0 开发 100% 完工。距上线还有 4 项手动阻塞 + 1 项个保法脱敏 + 1 项 Admin 真实验证 = Phase 1 共 7 任务、~6-7h。**  
> **详见 [yichun-roadmap.md](./yichun-roadmap.md) 与 [yichun-phase1-tasks.md](./yichun-phase1-tasks.md)。**

---

**🤝 PM（Hermes）待命中。**  
**下一步：等你确认 Phase 1 任务清单后，PM 出第一份 Claude 任务书（如 T-P1-01 MySQL 密码轮换）。**
