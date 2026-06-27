# T-017 公告 — 前端集成（公开页 + 详情页）

> **任务**：新增前端公告公开列表页 `/announcements` + 详情页 `/announcements/[id]` + SEO
> **分支**：`feature/T-017-announcement-frontend`（基于 `feature/T-016-announcement-admin` 重建）
> **状态**：✅ 完成 2026-06-27
> **关联**：T-016 公告后台 / SHOULD-30 公告后端 + banner

---

## Context

### 现状（T-017 启动前）

**后端（已有 + 缺）**：
- ✅ `AnnouncementService.findActive()` — 公开 banner（取前 5）
- ✅ `AnnouncementService.findAll()` — admin 分页
- ✅ `AnnouncementService.create/update/remove`
- ✅ `GET /api/v1/announcements/active` — banner 用
- ❌ 缺公开分页 list（用户无法浏览历史公告）
- ❌ 缺公开详情（用户无法分享单条公告）

**前端（已有 + 缺）**：
- ✅ `announcementApi.active()` — banner 用
- ✅ `AnnouncementBanner` 顶部细条（dismissable + localStorage）
- ✅ layout 集成 banner
- ❌ 缺 `/announcements` 公开列表页
- ❌ 缺 `/announcements/[id]` 详情页
- ❌ banner 无"查看全部"入口

### 解决的问题

1. 用户无法浏览**历史公告**（已 dismiss 或超出 5 条限制）
2. 用户无法**搜索**公告（按 title/content 关键词）
3. 用户无法**分享单条公告**（无独立 URL）
4. SEO 不收录（无独立页面）

### 方案

**后端**：新增 2 个公开 endpoint + 8 个单测。
**前端**：2 个新页面（client 列表 + server 详情）+ api 扩展 + banner 入口 + JSON-LD。

---

## 数据流

```
admin 创建公告 (T-016)
  ↓ POST /api/v1/admin/announcements
  ↓ DB announcements 表
  ↓ status=1 + 时间窗校验
  ↑ OK

用户访问 /announcements
  ↓ GET /api/v1/announcements?page=1&pageSize=20
  ↓ AnnouncementController.findList (@Public)
  ↓ AnnouncementService.findList
  ↓ where: status=1 + deletedAt=null + 时间窗 OR/AND
  ↓ select: 不返回 content（节省 payload）
  ↑ JSON: { list: Announcement[], total, page, pageSize }

用户点公告卡 → /announcements/:id
  ↓ generateMetadata server-side fetch
  ↓ GET /api/v1/announcements/:id
  ↓ AnnouncementController.findOne (@Public)
  ↓ AnnouncementService.findOne
  ↓ findFirst where status=1 + deletedAt=null + 时间窗 + id
  ↑ JSON: Announcement (含 content)
  ↓ 生成 Article JSON-LD
  ↓ 渲染详情页

顶部 AnnouncementBanner (所有页面)
  ↓ 显示前 5 条
  ↓ 右侧新增"查看全部"链接 → /announcements
```

---

## 关键设计决策

### 1. 后端公开接口而非前端拉 admin（用户确认）

admin 5 endpoint 需 AdminGuard + PermissionGuard + JWT，公开页不能复用。必须新增 2 个 @Public endpoint。

### 2. findList select 裁剪

```ts
select: {
  id: true, title: true, status: true, priority: true,
  startsAt: true, endsAt: true, createdAt: true,
  // content 不返回（详情页单独取）
}
```

- 列表 payload 减半（content 通常几百字）
- 前端用 `a.content || ''` 兼容

### 3. findOne 三重过滤

```ts
where: {
  id,
  status: 1,         // 启用
  deletedAt: null,   // 未软删（T-001）
  OR: [{ startsAt: null }, { startsAt: { lte: now } }],
  AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
}
```

- 任一不满足 → `NotFoundException`（不区分"已下架"和"不存在"，防信息泄露）

### 4. 路由顺序 `/active` → `/` → `/:id`（F-4 教训）

NestJS 按声明顺序匹配。`/active` 必须在 `/:id` 之前，否则 `id=active` 会被解析。

### 5. JSON-LD 用 schema.org/Article（用户确认）

- ❌ WebPage（太弱）
- ❌ schema.org/Announcement（非标准，搜索引擎支持差）
- ✅ Article（兼容性最广）

### 6. generateMetadata 404 不 throw（参考 posts/[id]）

返回 `title: '公告不存在 - 伊春有事儿说'` + `robots: { index: false, follow: true }`，body 渲染 `<AnnouncementNotFound />`。

### 7. client-side 搜索

公告数量小（预估 < 50 条），单页内 filter 即可，不发请求。

### 8. 公告卡整卡可点击

`<Link>` 包裹整个卡片（hover 阴影 + 边框过渡），不是只有标题点击。

### 9. banner 加"查看全部"链接

保留 banner 主 UX（dismissable），仅在关闭按钮旁加 1 个链接。

---

## API 一览

### 后端（T-017 新增 2 个 @Public endpoint）

| Method | Path | 说明 |
|---|---|---|
| GET /api/v1/announcements?page=&pageSize= | 公开分页列表（status=1 + 时间窗 + 软删过滤 + select 裁剪）| **新增** |
| GET /api/v1/announcements/:id | 公开详情（含 content + 三重过滤 + 404 不命中）| **新增** |

### 前端（T-017 新增 2 个方法）

```ts
announcementApi.listPublic(params?: { page?: number; pageSize?: number })
announcementApi.detail(id: string)
```

---

## admin UI 字段对照

不适用（前端无表单，纯展示）。

---

## 单测覆盖矩阵（8 用例）

参考 `tag.service.spec.ts` mock 模式（worktree 无 DB）。

### findList（4）
1. where 含 status=1 + deletedAt=null + 时间窗 OR/AND
2. orderBy priority desc + createdAt desc
3. select 裁剪：不返回 content 字段
4. 分页 page=2, pageSize=10 → skip=10, take=10

### findOne（4）
5. 命中生效中：返回完整字段（含 content）
6. 已过期 → NotFoundException
7. 已下架 (status=0) → NotFoundException
8. 不存在 id → NotFoundException

---

## 验收对照

| 项目 | 命令 | 期望 |
|---|---|---|
| 后端 T-017 单测 | `npx jest findList.spec` | **8 passed** |
| 后端 T-016 单测无回归 | `npx jest announcement.service.spec` | **12 passed** |
| 后端 T-013 单测无回归 | `npx jest tag.service.spec` | **30 passed** |
| frontend tsc | `npx tsc --noEmit` | T-017b 0 错；4 个预存在 e2e 错误（无关）|
| frontend build | `npm run build` | **21 路由**（19 + 2）|
| Git 历史 | `git log --oneline -5` | **2 commits**（T-017a + T-017b + docs = 3）|
| Push | `git push origin` | **3 commits on origin** |

---

## 文件清单

### 新建（6 业务 + 1 文档）

| 路径 | 用途 |
|---|---|
| `backend/src/modules/announcement/findList.spec.ts` | T-017 公开方法 8 单测 |
| `frontend/src/app/announcements/page.tsx` | 列表页 server entry（仅 metadata）|
| `frontend/src/app/announcements/announcements-content.tsx` | 列表 client + Suspense |
| `frontend/src/app/announcements/[id]/page.tsx` | 详情 server + generateMetadata + JSON-LD |
| `frontend/src/app/announcements/[id]/announcement-detail-content.tsx` | 详情 client 渲染 |
| `docs/t-017-announcement-frontend.md` | 本设计文档 |

### 修改（5 个）

| 路径 | 变更详情 |
|---|---|
| `backend/src/modules/announcement/announcement.service.ts` | 新增 `findList` + `findOne` 方法 |
| `backend/src/modules/announcement/announcement.controller.ts` | 新增 GET / + GET /:id（@Public）|
| `frontend/src/lib/api.ts` | `announcementApi` 加 `listPublic` + `detail` |
| `frontend/src/components/layout/announcement-banner.tsx` | 加 "查看全部" 链接 |
| `CHANGELOG.md` + `README.md` | 顶部 / 段末加 T-017 节 |

---

## 复用与一致性

| 已有 | 复用方式 |
|---|---|
| `home-content.tsx` 三态分支 | 复制骨架到 `announcements-content.tsx` |
| `posts/[id]/page.tsx` generateMetadata | 复制模板，改 fetch URL + JSON-LD 用 Article |
| `@/lib/date` formatDateTime | 时间显示 |
| `@/components/patterns/empty-state` | loading/error/empty 三态 |
| `@/components/ui/{Button,Card,Input}` | 基础组件 |
| `lucide-react` 图标 | Megaphone / Calendar / Pin / Clock / ChevronLeft / Search |
| `announcementApi.active()` | 不动，AnnouncementBanner 继续用 |

---

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| 路由顺序错（`/active` 被解析为 `id=active`）| controller 严格按 `/active` → `/` → `/:id` 顺序写；单测覆盖 |
| 时间窗边界 | 沿用 findActive 已验证逻辑（lte/gte）；单测覆盖 |
| 后端 list 不返回 content | 前端 `a.content || ''` 兼容 |
| 详情页 SEO 404 | generateMetadata 走 catch → 返回默认 title + robots.noindex |
| 服务端 fetch 缓存 | 用 `cache: 'no-store'`（参考 posts/[id]） |
| BigInt id 序列化 | 项目已有 transform interceptor；前端 Announcement.id 用 string |
| frontend npm install 需 `--legacy-peer-deps` | lucide-react 要求 react ^18 但项目用 react 19（项目预存 npm config）|

---

## 后续（V1.1 候选）

- 公告分类（紧急 / 通知 / 活动）
- 富文本内容（当前纯文本）
- 公告评论 / 点赞
- 公告订阅（用户订阅分类接收推送）
- 公告发送记录（哪些用户已读）
- 公告预览管理（admin 后台实时预览前台效果）
- 修复 admin globals.css 4 级相对路径（独立任务）
- 修 announcement/banner `remove` 硬删（独立任务）
- 修 frontend `e2e/tag-flow.spec.ts` 4 处 implicit any（独立任务）

---

**最后更新**：2026-06-27
**Commit 计划**：
1. `feat(announcement): T-017a public list + detail endpoints (8 tests)` — `b6f44ce`
2. `feat(frontend): T-017b public announcement list + detail pages + SEO` — `ba27202`
3. `docs(announcement): T-017 frontend integration notes` — 待
