# CHANGELOG 变更日志

> **项目**：伊春有事儿说
> **维护人**：Hermes（PM）
> **最后更新**：2026-06-15
> **格式**：基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 简化
> **版本规则**：当前为 V1.0 pre-release（`1.0.0-rc.x`），正式版号 `1.0.0` 待 B-1~B-4 手动完成

---

## [Unreleased] — V1.0 收官中

### Added (PM 文档体系补全)
- `docs/PRD.md` — 产品需求文档 v1
- `docs/DATABASE.md` — 数据库设计文档（17 model + 全量索引）
- `docs/TASKS.md` — 任务清单整合视图
- `docs/CHANGELOG.md` — 本文件
- `docs/index.md` — 增加新文档链接

---

## [1.0.0-rc.6] — 2026-06-12 P1 关键 20/20 收官

### Added (Sprint 6)
- SHOULD-20 清理 dead `/api/proxy` rewrite（frontend + admin 共 2 文件）— `9e72fd1`
- SHOULD-23 next-themes 暗色模式（frontend + admin 各 theme-provider + theme-toggle，三态 light/dark/system，SSR 安全）— `9e72fd1`
- **🎉 V1.0 P1 关键 20 项完成度: 20/20**

---

## [1.0.0-rc.5] — 2026-06-12 P1 Sprint 5（SHOULD-9）

### Added (Sprint 5)
- SHOULD-9 人机验证 (Cloudflare Turnstile) + 注册限频
  - `CaptchaService`（turnstile siteverify + Redis 5min 防重放）
  - `RegisterThrottleService`（IP 24h ≤ 5、phone 7d ≤ 3、new-user 24h ≤ 1 帖）
  - 接入 4 个入口：auth/sendSmsCode、auth/loginSms、auth/loginPassword、post.create
  - 7 smoke 全 PASS
  - `fa6db41`

### Known Risks
- R-7：CAPTCHA provider 配错全员 401（fail-closed）
- R-8：Turnstile 国内访问不稳
- R-9：新用户 24h 1 帖可能误伤真实用户

---

## [1.0.0-rc.4] — 2026-06-12 P1 Sprint 4（CI + 批量 + 时区 + 重大 bugfix）

### Added (Sprint 4)
- SHOULD-42 GitHub Actions CI（backend/frontend/admin 3 job 并行，type-check + build）— `c036d48`
- SHOULD-27 批量审核 / 批量下架（audit-batch + offline-batch，updateMany + summary audit log，7 smoke 全 PASS）— `e4e1553`
- SHOULD-36 时区统一（Asia/Shanghai，9 文件 + frontend/admin `lib/date.ts`）— `9df6eb4`

### Fixed (历史重大 bug)
- **buildTokenPair 硬编码 `role='user'`**：导致 AdminGuard 永远 403，Sprint 1-3 admin API 实际不可用
  - `buildTokenPair` 加 role 参数 + 3 caller 传 `user.role`
  - `user.service.create/findByPhone` select 加 role 字段
  - smoke: admin login → JWT `role:admin` → `/admin/dashboard` 200
  - `7cb23fb`

---

## [1.0.0-rc.3] — 2026-06-12 P1 Sprint 3（日志 + 缓存 + 事务）

### Added (Sprint 3)
- SHOULD-41 nestjs-pino 结构化日志（reqId 注入 + 业务 Logger 兼容）— `ac267fa`
- SHOULD-38 JWT 缓存（auth:user:&lt;id&gt; 5min TTL，4 失效点）— `ef7fe81`
- SHOULD-1 Post 创建事务（单 `$transaction` + 预校验缩短持有时间）— `0dbd92a`

---

## [1.0.0-rc.2] — 2026-06-11 P1 Sprint 2（防刷 + 公告 + Swagger + Cron + Middleware）

### Added (Sprint 2)
- SHOULD-3 viewCount 防刷（IP+UserId Redis SET NX 去重，UA 长度上限，ViewLog 落库）— `a3222bc` + `0703b83`
- SHOULD-30 公告系统
  - 后端 Announcement module（admin CRUD + public active）— `a3643ab`
  - 前端 AnnouncementBanner — `37c08cd`
  - 修复 migration 误删 FULLTEXT — `183a4d6`
- SHOULD-40 Swagger `/api/docs`（73 paths × 12 tags + JWT bearer auth）— `092af34`
- SHOULD-15 30 天硬清 cron + admin `/admin/posts/purge` 手动入口（6/6 smoke）— `1d1d073`
- SHOULD-19 Middleware SSR 401 跳 `/me/*`（4/4 smoke）— `15fc870`

---

## [1.0.0-rc.1] — 2026-06-11 P1 Sprint 1（7 任务）

### Added (Sprint 1)
- SHOULD-31 `GET /api/v1/health` 检 MySQL+Redis — `5385601`
- SHOULD-6 compression 中间件（5677B → 964B，83% 节省）— `210c335` + `dae19fe`
- SHOULD-7 post 列表缓存 invalidation（E2E: POST 后 0 key）— `d5778f2`
- SHOULD-16 删除用户改软删 status=2 — `25cc83a`
- SHOULD-39 删 `bigIntToString` helper（改用 TransformInterceptor）— `e189dfe`
- SHOULD-11 pageSize `@Max(100)`（4 DTO 5/5 冒烟）— `00cb8cc`

### Audited (审计 outdated)
- SHOULD-32~35 4 个 DB 索引：审计报告误报，schema.prisma 已含全部 4 个

---

## [1.0.0-beta.12] — 2026-06-11 验收阻塞修复（F-1~F-6）

### Fixed (QA 验收阻塞)
- **F-1** 后端在 Node 18.18 启动失败（file-type@22 ESM + sharp@0.35 crypto）
  - 锁定 file-type@^16.5.4 / sharp@^0.33.5
  - 加 `webcrypto` polyfill
  - `upload.service.ts` 切到 v16 API
  - `466a647`
- **F-2** 2 个迁移未应用误判 → 实际已应用，DB 验证 4 表 + 2 FULLTEXT 存在
- **F-3** `/api/v1/search` 每次 500（三层问题）
  - 显式字段列表替换 `...r` spread
  - count 改成 8 params
  - 两查询都加 `...params2`
  - `Number(_score)` 转换
  - `7c59f80` + `8b57d62`
- **F-4** `/resumes/me` 500 "Cannot convert me to a BigInt"
  - `@Get('me/put/delete')` 全部移到 `@Get(':id')` 之前
  - `d65d873`
- **F-5** CORS `CORS_ORIGINS` 空反而放行所有 origin
  - `origins.length === 0` 在 allow 分支 → 改为"空=仅同源"
  - boot 加 warn
  - `3af9c22`
- **F-6** 普通用户 PATCH 自己 `/users/:id` 被拒 403
  - MUST-2 过度修复（加了 `@Roles('admin')`）
  - 去掉 admin 守卫，改 `isSelf || isAdmin` 检查
  - UpdateUserDto 已排除敏感字段
  - `81202b6`

### Verified
- 13 冒烟用例全 PASS（v2 复验）
- V1.0 现已具备冒烟通过条件

---

## [1.0.0-beta.11] — 2026-06-11 P0 Phase 2 完工（12 修复）

### Added (Phase 2)
- MUST-14 admin/ Next.js 后台项目 — `5a4b3c2`
- MUST-15 生产 docker-compose + nginx + SSL — `3f2e1d0`
- MUST-16 3 张日志表（AuditLog/LoginLog/ViewLog）+ 缺失索引 — `4bdb55d`
- MUST-17 站内信 Message Module + `/me/messages` — `2c2fdec`
- MUST-18 MySQL FULLTEXT 索引 + 搜索重写 — `4bdb55d`
- MUST-19 `/me/posts` 和 `/me/favorites` 子页 — `ee1d2b3`
- MUST-20 PWA / manifest / robots / sitemap / icon — `a2b9c3f`
- MUST-21 详情页 generateMetadata + JSON-LD — `552da13`
- MUST-22 敏感词过滤 (DFA 字典树) — `d4e5f6a`
- MUST-23 @nestjs/schedule 定时任务 — `d4e5f6a`
- MUST-24 @nestjs/throttler 全局限流 — `d4e5f6a`
- MUST-25 Admin 审核事务修复 + AuditLog — `d4e5f6a`

### Audit Report Corrections
- MUST-3、MUST-9 审计误报已识别

---

## [1.0.0-beta.10] — 2026-06-11 P0 Phase 1 完工（11 修复 + 2 误报）

### Added (Phase 1)
- MUST-1 JWT 密钥轮换 + 启动期强校验 — `d2f3440`
- MUST-2 User 写接口加 admin 鉴权 + phone 脱敏 — `5dadf25`
- MUST-4 CORS 改白名单 — `7e5d560`
- MUST-5 文件上传 MIME 嗅探（file-type + sharp）— `9e06477`
- MUST-6 加 helmet — `7e5d560`
- MUST-7 SMS crypto + IP 限频 + 失败计数 — `312f497`
- MUST-8 Resume phone 脱敏 — `ec42222`
- MUST-10 React 19 RC → GA + Next 15.5 — `30ca7c4`
- MUST-11 useSearchParams 包 Suspense — `9cfd887`
- MUST-12 publish 表单补全 3 类型（secondhand/job/lifebiz）— `3cb33ab`
- MUST-13 详情页 4 按钮接 API + 评论 + 举报 — `a273462`

### Audited (误报)
- **MUST-3** Admin 角色查 DB 二次校验 → 审计误报，`jwt.strategy.ts:65-71` 已有
- **MUST-9** 4 个子 Controller 注册 → 审计误报，`post.module.ts:4-10` 已有

---

## [1.0.0-beta.0] — 2026-06-09 架构基线

### Added
- 架构设计文档 `docs/ARCHITECTURE.md`（V1 完整方案）
  - 4 大模块功能矩阵
  - 13 model ER 图
  - 58 任务拆分表
  - API 规范、目录结构
- 仓库初始化结构（backend/frontend/admin/docs/docker）

### Notes
- 提交：`4239cd2 docs: 初始化 V1 架构设计文档`
- 提交：`1c3868d chore: baseline (existing code pre-refactor)`

---

## 附录 A：版本号规则

- `1.0.0-beta.x` — V1.0 beta 阶段，feature 不稳定
- `1.0.0-rc.x` — V1.0 release candidate，feature 完整，仅缺手动部署
- `1.0.0` — 正式版（待 B-1~B-4 全部完成 + 生产 smoke 通过）

## 附录 B：commit 统计

- 总 commit 数：**62**
- 按阶段：
  - 架构基线：2
  - P0 Phase 1：11 + 2 误报识别
  - P0 Phase 2：12
  - 验收修复：5（含 1 个双 commit F-3）
  - P1 Sprint 1：7（其中 1 个双 commit SHOULD-6）
  - P1 Sprint 2：8（其中 1 个双 commit SHOULD-3 / 1 个双 commit SHOULD-30）
  - P1 Sprint 3：3
  - P1 Sprint 4：4（3 任务 + 1 bugfix）
  - P1 Sprint 5：1
  - P1 Sprint 6：1（双任务）
  - 文档 commit：~5（project-memory 增量 + plan 文件）
- 全部已 push `origin/main`

## 附录 C：相关文档

- [PRD.md](./PRD.md) — 产品需求
- [ARCHITECTURE.md](./ARCHITECTURE.md) — 架构基线
- [DATABASE.md](./DATABASE.md) — 数据库设计
- [TASKS.md](./TASKS.md) — 任务清单
- [development-roadmap.md](./development-roadmap.md) — 路线图
- [project-memory.md](./project-memory.md) — 项目记忆（最详尽）
- [acceptance-report-2026-06-11.md](./acceptance-report-2026-06-11.md) — 验收报告
- [audit-report-2026-06-11.md](./audit-report-2026-06-11.md) — 审计快照
- [index.md](./index.md) — 文档入口
