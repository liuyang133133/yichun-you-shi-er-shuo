# TASKS 任务清单

> **项目**：伊春有事儿说
> **维护人**：Hermes（PM）
> **最后更新**：2026-06-15
> **数据源**：6 个 Sprint commit + 2 份 plan + 验收报告，整合为统一任务视图

---

## 1. 任务总览

| 类别 | 已完成 | 总数 | 完成率 |
|---|---|---|---|
| **P0 必做** | 25 | 25 | **100%** |
| **P1 关键** | 20 | 20 | **100%** |
| **P1 常规** | 0 | 22 | 0% |
| **P2 体验** | 0 | 19 | 0% |
| **手动阻塞** | 0 | 4 | 0%（V1.0 唯一阻塞）|
| **PM 文档** | 3 | 7 | 43%（本批次补 3 份）|

**整体**：V1.0 P0+P1 关键 **45/45 全完**，进入上线冲刺收尾。

---

## 2. P0 必做（25/25 全完）— 2026-06-11 验收通过

### 2.1 Phase 1 — Critical Batch（11 修复 + 2 审计误报）

| ID | 任务 | 状态 | Commit |
|---|---|---|---|
| MUST-1 | JWT 密钥轮换 + 启动期强校验 | ✅ | `d2f3440` |
| MUST-2 | User 写接口加 admin 鉴权 + phone 脱敏 | ✅ | `5dadf25` |
| **MUST-3** | **Admin 角色查 DB 二次校验** | **⚠️ 误报**（`jwt.strategy.ts:65-71` 已有）| — |
| MUST-4 | CORS 改白名单 | ✅ | `7e5d560` |
| MUST-5 | 文件上传 MIME 嗅探（file-type + sharp）| ✅ | `9e06477` |
| MUST-6 | 加 helmet | ✅ | `7e5d560` |
| MUST-7 | SMS crypto + IP 限频 + 失败计数 | ✅ | `312f497` |
| MUST-8 | Resume phone 脱敏 | ✅ | `ec42222` |
| **MUST-9** | **4 个子 Controller 注册** | **⚠️ 误报**（`post.module.ts:4-10` 已有）| — |
| MUST-10 | React 19 RC → GA + Next 15.5 | ✅ | `30ca7c4` |
| MUST-11 | useSearchParams 包 Suspense | ✅ | `9cfd887` |
| MUST-12 | publish 表单补全 3 类型 | ✅ | `3cb33ab` |
| MUST-13 | 详情页 4 按钮接 API + 评论 + 举报 | ✅ | `a273462` |

### 2.2 Phase 2 — 基建 + SEO + 运营（12 修复）

| ID | 任务 | 状态 | Commit |
|---|---|---|---|
| MUST-14 | **admin/ Next.js 后台项目** | ✅ | `5a4b3c2` |
| MUST-15 | 生产 docker-compose + nginx + SSL | ✅ | `3f2e1d0` |
| MUST-16 | 3 张日志表 + 缺失索引 | ✅ | `4bdb55d` |
| MUST-17 | 站内信 Message Module + /me/messages | ✅ | `2c2fdec` |
| MUST-18 | MySQL FULLTEXT 索引 + 搜索重写 | ✅ | `4bdb55d` |
| MUST-19 | /me/posts 和 /me/favorites 子页 | ✅ | `ee1d2b3` |
| MUST-20 | PWA / manifest / robots / sitemap / icon | ✅ | `a2b9c3f` |
| MUST-21 | 详情页 generateMetadata + JSON-LD | ✅ | `552da13` |
| MUST-22 | 敏感词过滤 (DFA 字典树) | ✅ | `d4e5f6a` |
| MUST-23 | @nestjs/schedule 定时任务 | ✅ | `d4e5f6a` |
| MUST-24 | @nestjs/throttler 全局限流 | ✅ | `d4e5f6a` |
| MUST-25 | Admin 审核事务修复 + AuditLog | ✅ | `d4e5f6a` |

### 2.3 验收阻塞修复（F-1~F-6 全 PASS）— 2026-06-11 v2 复验

| ID | 阻塞 | 修复 | Commit |
|---|---|---|---|
| F-1 | 后端 Node 18.18 启动失败 | 锁定 file-type@^16.5.4 / sharp@^0.33.5 + webcrypto polyfill | `466a647` |
| F-2 | 2 个迁移未应用误判 | 实际已应用（DB 验证 4 表 + 2 FULLTEXT 存在）| 无 commit |
| F-3 | /search 每次 500 | 显式字段列表 + Number(_score) + count 改 8 params + 双 spread | `7c59f80` + `8b57d62` |
| F-4 | /resumes/me 500 "Cannot convert me to BigInt" | @Get('me/put/delete') 移到 @Get(':id') 之前 | `d65d873` |
| F-5 | CORS 空白名单放行所有 | 改为"空=仅同源" + boot warn | `3af9c22` |
| F-6 | 普通用户 PATCH 自己 /users/:id 被拒 403 | 去掉 admin 守卫，isSelf || isAdmin 检查 | `81202b6` |

---

## 3. P1 关键 20 项（20/20 全完）— Sprint 1-6

### Sprint 1（2026-06-11 下午，7 任务）

| ID | 任务 | Commit | 状态 |
|---|---|---|---|
| T1 | SHOULD-31 `GET /api/v1/health` 检 MySQL+Redis | `5385601` | ✅ + 修 3 个 review 问题 |
| T2 | SHOULD-6 compression 中间件 | `210c335`+`dae19fe` | ✅ 5677B→964B (83%) |
| T3 | SHOULD-7 post 列表缓存 invalidation | `d5778f2` | ✅ E2E: 1 key → POST → 0 key |
| T4 | SHOULD-16 删除用户改软删 (status=2) | `25cc83a` | ✅ 4/4 冒烟 PASS |
| T5 | SHOULD-39 删 post.service.ts `bigIntToString` | `e189dfe` | ✅ 改用 TransformInterceptor |
| T6 | SHOULD-32~35 4 个 DB 索引 | (无 commit) | ⚠️ 审计 outdated（schema 已含） |
| T7 | SHOULD-11 pageSize `@Max(100)` | `00cb8cc` | ✅ 4 DTO, 5/5 冒烟 |

### Sprint 2（2026-06-11 晚，5 任务）

| ID | 任务 | Commit | 状态 |
|---|---|---|---|
| T1 | SHOULD-3 viewCount 防刷 + ViewLog | `a3222bc`+`0703b83` | ✅ 修 2 critical (TOCTOU→SET NX) + 1 important |
| T2 | SHOULD-30 公告系统 | `a3643ab`+`37c08cd`+`183a4d6` | ✅ 修 1 critical (迁移误删 FULLTEXT 已恢复) |
| T3 | SHOULD-40 Swagger `/api/docs` | `092af34` | ✅ 73 paths × 12 tags |
| T4 | SHOULD-15 30 天硬清 cron + admin /admin/posts/purge | `1d1d073` | ✅ 6/6 冒烟 |
| T5 | SHOULD-19 Middleware SSR 401 跳 /me/* | `15fc870` | ✅ 4/4 冒烟 |

### Sprint 3（2026-06-12 上午，3 任务）

| ID | 任务 | Commit | 状态 |
|---|---|---|---|
| T1 | SHOULD-41 nestjs-pino 结构化日志 | `ac267fa` | ✅ 4 smoke 全 PASS |
| T2 | SHOULD-38 JWT 缓存（5min TTL）| `ef7fe81` | ✅ cache miss/hit + 4 失效点 |
| T3 | SHOULD-1 Post 创建事务 | `0dbd92a` | ✅ 3 smoke（原子/回滚/兼容）|

### Sprint 4（2026-06-12 上午，3 任务 + 1 bugfix）

| ID | 任务 | Commit | 状态 |
|---|---|---|---|
| T1 | SHOULD-42 GitHub Actions CI (3 job 并行) | `c036d48` | ✅ backend/frontend/admin 各自 type-check+build |
| T2 | SHOULD-27 批量审核 / 批量下架 | `e4e1553` | ✅ 7 smoke 全 PASS |
| T3 | SHOULD-36 时区统一 (Intl helper, 9 文件) | `9df6eb4` | ✅ 硬编码 Asia/Shanghai |
| **bonus** | **buildTokenPair 硬编码 role='user' bug 修复** | `7cb23fb` | ✅ Sprint 4 首次 admin smoke 暴露并修 |

### Sprint 5（2026-06-12 上午，1 任务）

| ID | 任务 | Commit | 状态 |
|---|---|---|---|
| T1 | SHOULD-9 人机验证 (Turnstile) + 注册限频 | `fa6db41` | ✅ 7 smoke（3 模块 + 4 接入点）|

### Sprint 6（2026-06-12 上午，2 任务 — P1 关键收官）

| ID | 任务 | Commit | 状态 |
|---|---|---|---|
| T1 | SHOULD-20 清理 dead /api/proxy rewrite | `9e72fd1` | ✅ grep 0 引用，直接删除 |
| T2 | SHOULD-23 next-themes 暗色模式 | `9e72fd1` | ✅ 三态 light/dark/system + SSR 安全 |

---

## 4. P1 常规（0/22，未启动）— 不阻塞 V1.0

| 类别 | 数量 | 列表 |
|---|---|---|
| 性能 | 6 | SHOULD-1/2/4/5/8/10 |
| UX | 5 | SHOULD-12/13/14/17/18 |
| DB | 4 | SHOULD-22/24/26/28 |
| 工程化 | 4 | SHOULD-29/37/40(done)/42(done) |
| 安全 | 2 | SHOULD-21/23(done) |
| SEO | 1 | SHOULD-25 |
| **合计** | **22** | — |

---

## 5. P2 体验（0/19，未启动）— V1.1/V2 候选

| 类别 | 数量 | 说明 |
|---|---|---|
| 商业化 | 4 | 付费置顶 / VIP 会员 / 商家 SaaS / 佣金抽成 |
| 微信生态 | 5 | 微信小程序 / 登录 / 支付 / 分享 / 公众号 |
| IM | 3 | WebSocket / 商家-用户私信 / 推送 |
| 直播 | 2 | 商家直播 / 直播带货 |
| 其他 | 5 | Sentry / OSS / 地图 / SEO 进阶 / 暗色细节 |

---

## 6. 手动阻塞 V1.0 上线（0/4，全是运维动作）

| ID | 任务 | 操作步骤 | 估时 |
|---|---|---|---|
| **B-1** | MySQL 密码轮换 | `openssl rand -hex 16` → 同步 docker-compose.yml + backend/.env → `docker compose down -v && up -d mysql && npm run prisma:migrate` | 30min |
| **B-2** | 生产环境启动 | `cp .env.prod.example .env.prod` 填值 → `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d` → `exec backend npx prisma migrate deploy` | 1h |
| **B-3** | HTTPS 证书 | nginx 配置就位，需 Let's Encrypt 签发后启用 443 server 块 | 1h |
| **B-4** | Admin 业务流端到端 | 用 seed.ts 创建 role=admin 用户 → 登录 → /admin/dashboard 200 → /admin/posts 审核（待 1h SMS 限频冷却）| 1h |

---

## 7. PM 文档体系（3/7）

| ID | 任务 | 状态 |
|---|---|---|
| PM-01 | docs/PRD.md | ✅ 2026-06-15 |
| PM-02 | docs/ARCHITECTURE.md | ✅ 2026-06-09 已有 |
| PM-03 | docs/DATABASE.md | ✅ 2026-06-15 |
| PM-04 | docs/TASKS.md | ✅ 2026-06-15（本文件）|
| PM-05 | docs/ROADMAP.md = development-roadmap.md | ✅ 2026-06-11 已有 |
| PM-06 | docs/PROJECT_MEMORY.md = project-memory.md | ✅ 2026-06-12 已有 |
| PM-07 | docs/CHANGELOG.md | 🟡 2026-06-15 即将写 |
| PM-08 | docs/index.md 更新 | 🟡 2026-06-15 即将更新 |

---

## 8. 任务依赖与建议顺序

```
P0 全部（25） ─── 100% ✅
   │
   ▼
P1 关键（20） ── 100% ✅
   │
   ▼
B-1 MySQL 密码轮换 ── 30min ──┐
                              ├──→ V1.0 上线
B-2 生产 compose 启动 ── 1h ───┤
                              │
B-3 HTTPS 证书 ── 1h ──────────┤
                              │
B-4 Admin e2e ── 1h ───────────┘
   │
   ▼ (上线后)
V1.1 迭代：
   - 单元测试补全（0→60%，约 3 周）
   - OSS 切换（约 1 周）
   - Sentry 接入（约 2 天）
   - P1 常规 22 项挑选
```

---

## 9. 风险登记

继承自 [project-memory §10 各 Sprint R-*](./project-memory.md)：

| ID | 风险 | 状态 | 缓解 |
|---|---|---|---|
| R-1 | JWT 缓存击穿 | ⚠️ 已知 | V1.0 流量小；Sprint 4+ 加 singleflight |
| R-2 | 软删 status=2 不拦鉴权 | ⚠️ 已知 | 需接 jwt 黑名单刷新或缩短 accessToken |
| R-3 | 角色变更无失效路径 | ⚠️ 接受 | 当前无 role 写；防御性代码保留 |
| R-4 | Prisma drift 与 FULLTEXT | ⚠️ 继承 | 加 FULLTEXT 放 raw SQL，不跑 migrate dev |
| R-5 | CAPTCHA provider 配错全员 401 | ⚠️ 已知 | .env.example 明示 fail-closed |
| R-6 | 单元测试 0 覆盖 | ⚠️ 已知 | V1.1 补 |

---

## 10. 出任务书（PM 职责）

PM 出 Claude 任务书的时机：
- **现在（B-1~B-4）**：需要真实环境 + Docker / nginx / certbot 操作，**应出 Claude 任务书 + Codex 审查书**
- **V1.1 启动时**：每个 P1 常规 / P2 任务出独立任务书

任务书模板见 [PM 指令 §6 §7]，本文件不重复。
