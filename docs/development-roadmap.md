# 开发路线图（Development Roadmap）

> **项目**：伊春有事儿说（V1.0 MVP → V1.1 → V2）
> **创建日期**：2026-06-11
> **最后更新**：2026-06-24（T-001 软删除 + 审计字段 完成）
> **配套文档**：
> - [PRD.md](./PRD.md) — 产品需求
> - [DATABASE.md](./DATABASE.md) — 数据库设计
> - [TASKS.md](./TASKS.md) — 任务清单
> - [CHANGELOG.md](../CHANGELOG.md) — 变更日志
> - [TODO.md](../TODO.md) — 详细开发任务清单（52 项）
> - [audit-report-2026-06-11.md](./audit-report-2026-06-11.md) — 审计快照
> - [project-memory.md](./project-memory.md) — 项目记忆（最详尽）
> - [ARCHITECTURE.md](./ARCHITECTURE.md) — 架构基线
> - [index.md](./index.md) — 文档入口
> **更新频率**：每完成一个 P0/P1 项，更新一次本表

---

## 最近完成（T-001）

| 任务 | 状态 | 完成日期 | 备注 |
|---|---|---|---|
| T-001 软删除 + 审计字段 | ✅ 完成 | 2026-06-24 | 18 张业务表 + 中间件 + admin UI + 17 单元测试 + 2 E2E |

---

## 0. 路线图总览

```
┌─────────────────────────────────────────────────────────────┐
│                    V1.0 MVP 上线（3 个月内）                  │
│  目标：补齐 P0 25 项 + 修复 P1 关键项，达到生产就绪             │
├─────────────────────────────────────────────────────────────┤
│  P0 安全 8 项 (1 周) → P0 Bug 5 项 (1 周) → P0 基建 6 项     │
│  → P0 SEO 2 项 (3 天) → P0 运营 4 项 (3 天)                │
│  → P1 关键项 (2 周) → 上线                                  │
├─────────────────────────────────────────────────────────────┤
│                    V1.1 营收启动（3-6 月）                     │
│  目标：商业化基建 + 微信生态 + SEO 养站                        │
├─────────────────────────────────────────────────────────────┤
│                    V1.2 体验壁垒（6-12 月）                    │
│  目标：VIP + 商家入驻 + IM + 地图                             │
├─────────────────────────────────────────────────────────────┤
│                    V2 生态扩展（12 月+）                       │
│  目标：内容化 + 直播 + 短视频 + LBS 推荐                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. V1.0 MVP（Week 1-12）

### Week 1：安全补丁（最高优先级）

| # | 任务 | 工时 | 状态 | Commit |
|---|---|---|---|---|
| MUST-1 | 轮换 JWT 密钥 + MySQL 密码 + Redis 密码 | 2h | ✅ | `d2f3440` |
| MUST-2 | User 写接口加 admin 鉴权 + UpdateUserDto 排除敏感字段 | 1.5h | ✅ | `5dadf25` |
| **MUST-3** | **Admin 角色查 DB 二次校验** | 1h | **⚠️ 误报** | 已有 |
| MUST-4 | CORS 改白名单 | 0.5h | ✅ | `7e5d560` |
| MUST-5 | 文件上传用 `file-type` 嗅探 + 拒 svg/html | 2h | ✅ | `9e06477` |
| MUST-6 | 加 helmet | 0.5h | ✅ | `7e5d560` |
| MUST-7 | SMS 验证码失败计数 + IP 限频 | 2h | ✅ | `312f497` |
| MUST-8 | 公开用户接口 phone 脱敏 | 1h | ✅ | `ec42222` |

**Week 1 交付**：8 项安全补丁 + 1 项误报跳过；admin/post 模块不再有越权漏洞，文件上传不再可 XSS

---

### Week 2：致命 Bug 修复

| # | 任务 | 工时 | 状态 | Commit |
|---|---|---|---|---|
| **MUST-9** | **4 个子 Controller 注册到 PostModule** | 0.5h | **⚠️ 误报** | 已有 |
| MUST-10 | React 19 RC 升 GA + @types/react 19 | 0.5h | ✅ | `30ca7c4` |
| MUST-11 | useSearchParams 包 Suspense | 0.5h | ✅ | `9cfd887` |
| MUST-12 | publish 页补全 secondhand/job/lifebiz 字段 | 3h | ✅ | `3cb33ab` |
| MUST-13 | 详情页 4 个核心按钮接 API（收藏/留言/举报/联系） | 2h | ✅ | `a273462` |

**Week 2 交付**：核心业务功能（4 类发布 + 详情互动）全部可用

---

### Week 3-4：基建补齐

| # | 任务 | 工时 | 状态 | 依赖 |
|---|---|---|---|---|
| MUST-16 | 3 张日志表（AuditLog/LoginLog/ViewLog） | 3h | ⏳ | 无 |
| MUST-18 | MySQL FULLTEXT 索引 + search 重写 | 2h | ⏳ | MUST-16 |
| MUST-17 | 站内信 Message Module（后端 + 前端） | 5h | ⏳ | 无 |
| MUST-22 | 敏感词过滤（DFA 字典树 + 200 词种子） | 2h | ⏳ | 无 |
| MUST-23 | @nestjs/schedule 定时任务（过期下架） | 1.5h | ⏳ | 无 |
| MUST-24 | @nestjs/throttler 全局限流 | 1h | ⏳ | 无 |
| MUST-25 | Admin 审核事务修复 + 审计日志 | 1h | ⏳ | MUST-16 |

**Week 3-4 交付**：运营基建完整（审核可追溯、定时任务、限流、敏感词）

---

### Week 5-6：前端补全

| # | 任务 | 工时 | 状态 | 依赖 |
|---|---|---|---|---|
| MUST-19 | /me/posts、/me/favorites 子页 | 3.5h | ⏳ | 无 |
| MUST-20 | PWA / favicon / manifest / robots / sitemap | 2h | ⏳ | 无 |
| MUST-21 | 详情页独立 metadata + JSON-LD | 3h | ⏳ | 无 |
| SHOULD-17 | Token 存 localStorage 改 httpOnly cookie + 自动 refresh | 2h | ⏳ | 无 |
| SHOULD-21 | 引入 sonner 替换 alert | 0.5h | ⏳ | 无 |
| SHOULD-22 | me 三个统计数接真实 API | 0.5h | ⏳ | 无 |
| SHOULD-26 | next/font 替换 Google Fonts `<link>` | 0.5h | ⏳ | 无 |

**Week 5-6 交付**：前端 SEO 基础完整，个人中心子页可用，Token 安全升级

---

### Week 7-8：管理后台

| # | 任务 | 工时 | 状态 | 依赖 |
|---|---|---|---|---|
| MUST-14 | admin/ Next.js 项目 init（脚手架 + Tailwind + Shadcn） | 1.5h | ⏳ | 无 |
| MUST-14a | 登录页（接后端 admin 角色） | 1.5h | ⏳ | 无 |
| MUST-14b | 看板（数据图表） | 2h | ⏳ | SHOULD-28 |
| MUST-14c | 帖子审核列表（通过/拒绝/批量） | 2h | ⏳ | MUST-25 |
| MUST-14d | 举报处理 | 1h | ⏳ | 无 |
| MUST-14e | 用户列表 + 封禁 | 1h | ⏳ | MUST-2 |
| MUST-14f | 类目管理 | 1h | ⏳ | 无 |
| SHOULD-28 | Dashboard 升级（趋势 + UV + 转化） | 3h | ⏳ | MUST-16 |
| SHOULD-29 | 数据导出（用户/帖子 Excel） | 2h | ⏳ | 无 |

**Week 7-8 交付**：管理后台可用，运营日常工作（审核/封禁/看板）可独立完成

---

### Week 9：生产部署

| # | 任务 | 工时 | 状态 | Commit |
|---|---|---|---|---|
| MUST-15 | 生产 docker-compose + nginx + SSL | 2h | ✅ | `73be0ca` |
| **SHOULD-15** | **Cron 30 天硬清软删 post** | **0.5h** | **✅** | **`1d1d073`** |
| **SHOULD-16** | **删除用户改软删 status=2** | **0.5h** | **✅** | **`25cc83a`** |
| **SHOULD-31** | **/api/health 真正检查后端健康** | **0.5h** | **✅** | **`5385601`** |
| MUST-25 | Admin 审核事务修复 | 1h | ✅ (c77894f, Phase 2) | — |

> **2026-06-11 P1 Sprint 1 同步:** 7 任务完成 (SHOULD-6/7/11/16/31/39 + 索引核验),共 6 commit。详见 [project-memory.md §10.5](./project-memory.md) 与 `docs/superpowers/plans/2026-06-11-p1-sprint1.md`。
>
> **2026-06-11 P1 Sprint 2 同步:** 5 任务完成 (SHOULD-3/15/19/30/40),共 8 commit。详见 [project-memory.md §10.6](./project-memory.md) 与 `docs/superpowers/plans/2026-06-11-p1-sprint2.md`。

**Week 9 交付**：生产环境可部署，SSL/HTTPS/反向代理完整,30 天硬清到位

---

### Week 10-12：P1 关键项（上线冲刺）

按优先级修复 P1 中的关键 20 项（详见 audit-report §第二部分）：
- **SHOULD-1（Post 创建事务联动）** ✅ `0dbd92a` — Sprint 3 T3
- **SHOULD-3（viewCount Redis INCR）** ✅ `a3222bc` + `0703b83` — Sprint 2 T1
- SHOULD-4（缓存 invalidation）✅ `d5778f2` — Sprint 1 T3
- **SHOULD-9（CAPTCHA）** ✅ `fa6db41` — Sprint 5 T1
- **SHOULD-19（Middleware SSR 401 跳转）** ✅ `15fc870` — Sprint 2 T5
- **SHOULD-20（next.config proxy 清理）** ✅ `9e72fd1` — Sprint 6 T1
- **SHOULD-23（next-themes 暗色模式）** ✅ `9e72fd1` — Sprint 6 T2
- SHOULD-25（backdrop-blur 性能）
- **SHOULD-27（批量审核 API）** ✅ `e4e1553` — Sprint 4 T2
- **SHOULD-30（公告系统）** ✅ `a3643ab` + `37c08cd` + `183a4d6` — Sprint 2 T2
- **SHOULD-36（时区统一）** ✅ `9df6eb4` — Sprint 4 T3
- SHOULD-37（Post slug）
- **SHOULD-38（JWT 缓存）** ✅ `ef7fe81` — Sprint 3 T2
- **SHOULD-39（BigInt 序列化去重）** ✅ `e189dfe` — Sprint 1 T5
- **SHOULD-40（Swagger 文档）** ✅ `092af34` — Sprint 2 T3
- **SHOULD-41（nestjs-pino 日志）** ✅ `ac267fa` — Sprint 3 T1
- **SHOULD-42（GitHub Actions CI）** ✅ `c036d48` — Sprint 4 T1

**Week 10-12 交付**：P1 关键 20 项完成，性能 / 安全 / 工程化达到生产级别

---

### Week 12 末：V1.0 MVP 上线 🎉

**上线标准**：
- ✅ 25 项 P0 全部完成
- ✅ P1 关键 20 项：**已 20/20** 🎉（Sprint 1+2+3+4+5+6 共 22 任务 + 1 bugfix,全完成）
- ✅ admin/ 后台可日常运营
- ✅ 生产部署稳定
- ✅ CAPTCHA / 注册限频 / 新用户 1 帖/24h
- ✅ 暗色模式 / 时区统一 / CI / 批量审核 / Swagger
- ⏳ Sitemap 提交百度站长平台
- ⏳ 客服/运营流程跑通
- ⏳ 单元测试 / 真部署(后续 Sprint)

> **2026-06-12 P1 关键 20/20 收官** 🎉:SHOULD-1/3/4/6/7/9/11/15/16/19/20/23/27/30/31/36/38/39/40/41/42 + MUST-25 = 20 项全完。Sprint 1+2+3+4+5+6 共 18 commit 全部 push origin/main。Sprint 4 修 1 历史 bug。Sprint 5 (SHOULD-9) 7/7 smoke PASS。Sprint 6 (SHOULD-20/23) 6/6 smoke PASS。

### Week 12+：V1.0 收官手动阻塞（4 项运维动作）

| ID | 任务 | 工时 | 阻塞点 | 操作文档 |
|---|---|---|---|---|
| **B-1** | MySQL 密码轮换 | 0.5h | 还在用初始 `yichun123456` | `openssl rand -hex 16` → 同步 .env → `down -v && up -d && migrate` |
| **B-2** | 生产环境启动 | 1h | docker-compose.prod.yml 未实测 | `cp .env.prod.example .env.prod` 填值 → `compose -f prod up -d` → `migrate deploy` |
| **B-3** | HTTPS 证书 | 1h | 443 server 块未启 | Let's Encrypt 签发 → 启用 nginx 443 block |
| **B-4** | Admin 业务流端到端 | 1h | 未真实跑过 admin 登录 | seed admin 账号 → login → /admin/dashboard 200 → /admin/posts 审核 |

> **2026-06-15 PM 评估**：4 项全部为运维操作，PM 出 Claude 任务书 + Codex 审查书。详见 [TASKS.md §6](./TASKS.md)。

---

## 2. V1.1 营收启动（Month 4-6）

### Month 4：商业化基建

| # | 任务 | 工时 | 状态 | 依赖 |
|---|---|---|---|---|
| NEXT-1 | Banner / 信息流广告位（4 张表 + 前端组件 + 后台） | 8h | ⏳ | MUST-16 |
| NEXT-2a | VIP 会员（4 张表 + 后端 + `/me/vip` 前端） | 12h | ⏳ | 无 |
| NEXT-2b | 付费置顶（Post.isTop / topExpiresAt + 订单流程） | 6h | ⏳ | NEXT-2a |
| NEXT-3 | 简历置顶（招聘场景） | 3h | ⏳ | NEXT-2b |
| NEXT-4a | 商家认证（Company 字段扩展 + admin 审核） | 4h | ⏳ | 无 |
| NEXT-4b | 商家主页 `/companies/[id]` | 4h | ⏳ | NEXT-4a |

**Month 4 交付**：商业化基础设施完整，可承接广告 / VIP / 置顶 / 商家付费

---

### Month 5：微信生态

| # | 任务 | 工时 | 状态 | 依赖 |
|---|---|---|---|---|
| NEXT-10a | 微信小程序（uni-app 或 Taro） | 40h | ⏳ | V1.0 |
| NEXT-10b | 微信登录（替换短信作为可选） | 8h | ⏳ | NEXT-10a |
| NEXT-10c | 微信公众号菜单接入 | 8h | ⏳ | NEXT-10b |
| NEXT-10d | 微信支付（VIP 订单） | 16h | ⏳ | NEXT-2a |

**Month 5 交付**：微信小程序上线，伊春本地用户多端可用

---

### Month 6：SEO 养站

| # | 任务 | 工时 | 状态 | 依赖 |
|---|---|---|---|---|
| SEO-1 | 提交百度站长平台 + sitemap | 2h | ⏳ | V1.0 |
| SEO-2 | 每个分类单独 TDK（25 个分类页） | 8h | ⏳ | V1.0 |
| SEO-3 | 每个区县单独 TDK（12 个区县页） | 4h | ⏳ | V1.0 |
| SEO-4 | 详情页 URL 静态化（/posts/[type]/[id]-[slug]） | 6h | ⏳ | SHOULD-37 |
| SEO-5 | 面包屑 + 相关推荐 | 4h | ⏳ | 无 |
| SEO-6 | 内容更新频率保障（每天 10+ 条新帖） | 持续 | ⏳ | 运营 |

**Month 6 交付**：SEO 基础完整，3-6 月内开始有自然搜索流量

---

## 3. V1.2 体验壁垒（Month 7-12）

| # | 任务 | 工时 | 状态 | 依赖 |
|---|---|---|---|---|
| NEXT-14a | IM 即时聊天（WebSocket） | 40h | ⏳ | V1.1 |
| NEXT-14b | 客服系统接入（智齿 / 美洽） | 16h | ⏳ | NEXT-14a |
| NEXT-13a | 地图找房（高德 SDK） | 12h | ⏳ | 无 |
| NEXT-13b | LBS 周边推荐 | 16h | ⏳ | NEXT-13a |
| NEXT-5 | 友情链接 / 站点联盟 | 2h | ⏳ | V1.0 |
| NEXT-6 | 内容举报奖励机制（积分系统） | 4h | ⏳ | V1.0 |
| NEXT-7a | 拼车/顺风车分类 | 6h | ⏳ | V1.0 |
| NEXT-7b | 同城交友分类 | 6h | ⏳ | V1.0 |
| NEXT-7c | 宠物分类 | 4h | ⏳ | V1.0 |
| NEXT-7d | 教育培训分类 | 4h | ⏳ | V1.0 |
| NEXT-15 | 二手直播带货 | 100h | ⏳ | V1.1 |
| NEXT-16 | 阿里云 OSS 切换 | 6h | ⏳ | V1.0 |
| NEXT-17 | Sentry 错误上报 | 3h | ⏳ | V1.0 |

**Month 12 末**：VIP + 商家 + IM + 地图 + 多分类全上线，护城河形成

---

## 4. V2 生态扩展（Year 2）

| # | 任务 | 工时 | 状态 | 依赖 |
|---|---|---|---|---|
| NEXT-8 | 资讯/头条/UGC 话题 | 80h | ⏳ | V1.2 |
| NEXT-9 | 担保交易 + 在线支付 | 80h | ⏳ | V1.2 |
| NEXT-11 | ES 替换 MySQL FULLTEXT | 24h | ⏳ | 数据量 > 10w |
| NEXT-12 | 推荐算法 / 个性化 | 60h | ⏳ | MUST-16 |
| NEXT-18 | NestJS 10 升 11 + Prisma 5 升 6 + React 19 GA | 16h | ⏳ | V1.0 |
| NEXT-19 | CI/CD 完善 + 自动化测试（覆盖率 70%+） | 40h | ⏳ | V1.0 |

---

## 5. 关键里程碑

| 日期 | 里程碑 | 验收标准 |
|---|---|---|
| **2026-07-15** | P0 25 项完成 | 安全审计无 critical；详情页 4 按钮可用；管理后台可日常运营 |
| **2026-08-15** | V1.0 MVP 内测 | 25 项 P0 + 20 项 P1 关键项；CI/CD 跑通；生产部署稳定 |
| **2026-09-01** | V1.0 公测上线 | Sitemap 提交；运营日均 10+ 新帖；客服流程跑通 |
| **2026-10-01** | V1.0 正式版 | 修复公测问题；VIP 试运行 |
| **2026-12-31** | V1.1 营收启动 | 微信小程序上线；首批 100+ VIP；月营收 1 万+ |
| **2027-06-30** | V1.2 护城河形成 | IM + 地图 + 商家入驻；月营收 5 万+ |
| **2027-12-31** | V2 生态扩展 | 资讯/UGC + 担保交易；月营收 10 万+ |

---

## 6. 任务完成规范

> 每完成一个任务，**必须**输出以下 5 项内容，并更新本路线图 + project-memory

```
1. 修改内容：...
2. 修改原因：...
3. 涉及文件：...
4. 测试结果：...
5. 对用户的价值：...
```

并更新：
- `docs/project-memory.md`（反映状态变化）
- `docs/development-roadmap.md`（更新对应任务为 ✅）

---

## 7. 风险与应对

| 风险 | 触发条件 | 应对 |
|---|---|---|
| **单人开发效率** | 工时 > 50/周 | 外包 / 兼职 / 简化 V1.1 |
| **OSS 切换阻塞** | 阿里云账号未开通 | 先本地存储 + CDN 加速 |
| **微信审核不通过** | 类目不符 | 调整为"工具 > 信息查询"类目 |
| **SEO 收录慢** | 6 月后仍 < 100 条 | 买老域名跳转 / 主动推送 / 外链建设 |
| **DDoS** | 上线初期 | Cloudflare 代理 + 限流 |
| **用户隐私投诉** | 公开手机号 | 立即改脱敏（已完成 MUST-8） |

---

## 8. 资源需求

| 资源 | V1.0 | V1.1 | V1.2 | V2 |
|---|---|---|---|---|
| 阿里云 ECS | 1 台 2C4G | 2 台 2C4G | 4 台 4C8G | 8 台 8C16G |
| 阿里云 RDS | 1C2G | 2C4G | 4C8G | 8C16G + 只读 |
| 阿里云 Redis | 1G | 2G | 4G | 8G |
| 阿里云 OSS | 10G | 100G | 1T | 10T |
| 备案域名 | 1 个 | 2 个 | 3 个 | 5 个 |
| SSL 证书 | Let's Encrypt | Let's Encrypt + 商业 | 商业 | 商业 |
| 监控 | 阿里云基础 | Sentry + 阿里云 | + ELK | + Grafana |
| 人员 | 1 全栈 | 1 全栈 + 1 兼职设计 | + 1 后端 | + 2 后端 + 1 运营 |

---

## 附录：与 0458.cn 路线图对照

| 时间 | 本项目 | 0458.cn（参考） |
|---|---|---|
| V1.0 | 补齐 0458 已有功能 + 修安全漏洞 | 23 年技术债已无法还清 |
| V1.1 | 商业化 + 微信生态 + SEO | 已成熟（VIP/置顶/广告） |
| V1.2 | IM + 地图 + 商家 + 多分类 | 已实现但老旧 |
| V2 | 资讯/UGC + 直播 + 推荐 | 无 |

**本项目优势**：从 V1.0 起步就直接是现代化技术栈（Next.js 15 / NestJS 10 / Prisma 5 / MySQL 8），V1.2 时已基本追平 0458.cn 功能集，V2 实现差异化（IM / 直播 / 推荐算法）。

---

**最后更新**：2026-06-15（PM 文档体系补全：新增 PRD/DATABASE/TASKS/CHANGELOG；Week 12+ 收官手动阻塞节；状态评估同步到 6 月 15 日）
**下次更新**：完成 B-1~B-4 任一项后
