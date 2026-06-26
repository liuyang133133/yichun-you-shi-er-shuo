# T-016 公告 — 后台管理

> **任务**：补齐 admin 端公告管理 UI + 后端单测
> **分支**：`feature/T-016-announcement-admin`（基于 `feature/T-015-tag-admin` 重建）
> **状态**：✅ 完成 2026-06-27
> **关联**：T-007 通知 / T-008 通知前端 / SHOULD-30 公告后端 + 前端 banner

---

## Context

**TODO.md T-016 定义**：
- 任务：公告 — 后台管理
- 影响 API：5 个 admin endpoint（GET / POST / PATCH :id / DELETE :id）+ 1 个公开 `/announcements/active`
- 影响后台：新菜单"公告管理"（列表 + CRUD + 启停 + 删除）
- 验收：（由用户确认）只补 UI + 单测，不动后端 service 逻辑

**现状**（T-016 启动前）：
- ✅ 后端 announcement 模块 100% 完整：service + admin controller + 公开 controller + 3 DTO + 迁移 + 4 个 RBAC 权限码 + operator 角色绑定
- ✅ 前端 `AnnouncementBanner` 组件已存在（SHOULD-30）
- ❌ admin 端无 `/admin/announcements` 页面
- ❌ admin 侧边栏无"公告管理"菜单项
- ❌ 后端无单测文件

**问题**：admin 只能在 Postman / curl 调 5 个 endpoint，无可视化操作界面。

**方案**：补 admin UI + 后端单测，**不动后端 service 逻辑**（避免越界修硬删预存问题）。

---

## 数据流

```
admin /admin/announcements (Browser)
  ↓ GET /api/v1/admin/announcements?status=1&page=1&pageSize=100
  ↓ AdminAnnouncementController.findAll
  ↓ AnnouncementService.findAll
  ↓ Prisma announcement.findMany + count
  ↓ MySQL announcements
  ↑ JSON: { list: AdminAnnouncement[], total, page, pageSize }

admin 点"新建" / "编辑" → POST/PATCH /api/v1/admin/announcements
  ↓ AnnouncementService.create / update
  ↑ JSON: AdminAnnouncement

admin 点"删除" → DELETE /api/v1/admin/announcements/:id
  ↓ AnnouncementService.remove
  ↓ Prisma announcement.delete ⚠ 硬删（Known issue）
  ↑ JSON: { id, deleted: true }
```

---

## 关键设计决策

### 1. T-016 不动后端 service（用户确认）

`announcement.service.remove` 当前用 `prisma.delete()` **硬删**，与 T-001 软删规范不一致（`admin-post.service.ts:174-181` 是规范实现）。banner 也有同样问题。

T-016 不修这个，避免：
- 范围蔓延（一个 PR 跨多个不一致模块）
- 引入新字段/迁移风险
- 遗漏 banner 同款修复

**后续任务**（V1.1 / T-019+）：
- 修 `remove` 为软删（`deletedAt + deletedBy + updatedBy`）
- 加 `restore` endpoint + `findAllForAdmin` 支持 includeDeleted
- 同时修 banner 模块

### 2. 状态 / 优先级 2 级（用户确认）

schema TINYINT (0|1) 保持不变：
- status: 1=启用 0=停用（admin UI「状态」下拉）
- priority: 1=置顶 0=普通（admin UI「优先级」下拉）

未来如需多级（高/中/低/隐藏）可独立迁移扩展 TINYINT 范围。

### 3. 时间控件用原生 `<input type="datetime-local">`

admin/ui 现有组件无时间选择器 + Textarea：
- 不引入新依赖（避免破坏一致性）
- 原生 `<textarea>` 复用 Input 的 className 风格
- 原生 `datetime-local` 转 ISO 通过 `isoToLocal` / `localToIso` 辅助函数

### 4. 沿用 tags/page.tsx 风格

- 顶部工具条（标题 + 副标题 + 新建按钮）
- 搜索 + 过滤条
- 表格 + 操作图标
- 创建/编辑模态
- **无合并模态**（announcement 没有"合并"语义）

### 5. 客户端搜索（不调后端）

`/admin/announcements` 不支持 `q` 搜索参数（后端 FilterDto 无 `q`），UI 客户端按 title 模糊过滤当前页（最多 100 条）。如未来需要服务端搜索可独立扩展。

---

## API 一览

### 后端（无变更 — 沿用现有）

| Method | Path | 说明 |
|---|---|---|
| GET /admin/announcements | 列表（status 过滤 + 分页）| 现有 |
| POST /admin/announcements | 创建 | 现有 |
| PATCH /admin/announcements/:id | 更新 | 现有 |
| DELETE /admin/announcements/:id | 硬删（Known issue）| 现有 |
| GET /announcements/active | 当前生效集合（前端 banner 用）| 现有 |

### admin API 客户端（T-016 新增）

```ts
adminAnnouncementApi.list(params: { status?: number; page?: number; pageSize?: number })
adminAnnouncementApi.create(body: Partial<AdminAnnouncement>)
adminAnnouncementApi.update(id: string | number, body: Partial<AdminAnnouncement>)
adminAnnouncementApi.remove(id: string | number)
```

`AdminAnnouncement` interface（10 字段）：
```ts
{
  id: string;
  title: string;
  content: string;
  status: number;       // 1=启用 0=停用
  priority: number;     // 1=置顶 0=普通
  startsAt: string | null;
  endsAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## admin UI 布局

```
┌─────────────────────────────────────────────────────────┐
│ 📢 公告管理  共 N 条  [新建公告]                          │
├─────────────────────────────────────────────────────────┤
│ 🔍 [搜索公告标题]  状态：[全部][启用][停用]                │
├─────────────────────────────────────────────────────────┤
│ ID   标题           状态   优先级  生效时段       操作      │
│ ───  ─────          ───   ─────  ─────────      ────     │
│ #1   系统升级        启用   置顶   2026-06-26~  ⚡✏🗑    │
│ #2   旧活动          停用   普通   立即~2026-05  ⚡✏🗑    │
└─────────────────────────────────────────────────────────┘

操作图标：
⚡ 切换启用/停用
✏  编辑（打开模态）
🗑  删除（二次确认 + 不可恢复警告）
```

### 创建/编辑 模态字段
- 标题 * (1-100 字)
- 内容 * (1-2000 字，`<textarea>`)
- 状态（下拉：启用/停用）
- 优先级（下拉：普通/置顶）
- 生效开始（`datetime-local`，空=立即）
- 生效结束（`datetime-local`，空=永久）

### 删除 UX
- 二次 `confirm()` 弹窗
- 弹窗文案含 "当前为硬删（不可恢复），T-019+ 会改为软删"
- 底部固定警告条统一提示该限制

---

## 单测覆盖矩阵（12 个用例）

参考 `tag.service.spec.ts` 「先 mock prisma → 调 service → 断言 prisma 调用参数」风格，数字前缀 `it("1. ...")`。

| # | 用例 | 覆盖点 |
|---|---|---|
| 1 | findActive | where.status=1 + 时间窗 OR/AND 嵌套 + orderBy priority desc/createdAt desc + take 5 |
| 2 | findActive | where 字段只含 status/OR/AND 三键（无 admin 字段泄漏） |
| 3 | findAll 不带 status | where 不含 status 过滤 |
| 4 | findAll status=0 | where.status === 0 |
| 5 | findAll 分页 | page=2, pageSize=10 → skip=10, take=10 |
| 6 | create 默认值 | status=1, priority=0, createdBy=adminId |
| 7 | create 时间 | startsAt/endsAt ISO → Date 对象 |
| 8 | update 找不到 | NotFoundException |
| 9 | update 时间转 Date + endsAt 未传时不写 data | endsAt undefined → data 不写入 |
| 10 | update 部分字段 | 只传 title → 其他字段不被覆盖 |
| 11 | remove 找不到 | NotFoundException |
| 12 | remove 成功 | prisma.announcement.delete 被调用（Known issue） |

---

## 文件清单

### 新建（2 个业务 + 1 个文档）

| 路径 | 用途 |
|---|---|
| `backend/src/modules/announcement/announcement.service.spec.ts` | 单测 12 用例（180 行）|
| `admin/src/app/announcements/page.tsx` | `/admin/announcements` 页面（~370 行）|
| `docs/t-016-announcement-admin.md` | 本设计文档 |

### 修改（4 个）

| 路径 | 变更详情 |
|---|---|
| `admin/src/lib/api.ts` | 末尾追加 `AdminAnnouncement` interface + `adminAnnouncementApi` 4 方法（30 行）|
| `admin/src/components/layout/admin-shell.tsx` | import 加 `Megaphone`；`NAV` 数组 Banners 之后插入 1 项 |
| `CHANGELOG.md` | 顶部加 [Unreleased] T-016 节（含 Known issue 注释） |
| `README.md` | T-015 段后加"公告后台管理 T-016"段 |

### 不修改（明确范围边界）

| 路径 | 不动原因 |
|---|---|
| `backend/src/modules/announcement/announcement.service.ts` | T-016 范围外；不修硬删问题 |
| `backend/src/modules/announcement/admin-announcement.controller.ts` | 已完整 |
| `backend/prisma/schema.prisma` | 无需迁移 |
| `frontend/` | `AnnouncementBanner` 已存在（SHOULD-30）|

---

## 验收对照

### 自动化

| 项目 | 状态 |
|---|---|
| 后端 announcement.service 单测 | ✅ **12/12** |
| 后端 tag.service 单测（T-015 无回归）| ✅ 30/30 |
| admin tsc | ✅ **0 错** |
| admin build | ⚠️ pre-existing globals.css 4 级相对路径问题（worktree 嵌套不解析）|
| Git 历史 | ✅ **2 commits** (`84a81e8` + `0c5ea13`) |
| Push | ✅ 已推送到 origin |

### 手动冒烟（待 dev 环境执行）

1. 启动 backend + admin → 登录 admin → `/announcements` → 看到 N 条
2. 切换"全部/启用/停用"：列表立即过滤
3. 搜索"系统"：客户端 title 模糊过滤
4. 点"新建"：填 title/content/priority=1/startsAt=2026-06-26/endsAt=+7 天 → 提交 → 列表立即显示
5. 点"停用"：状态变灰；前台 `/` banner 不再显示
6. 点"编辑"：模态预填 → 改 priority=0 → 保存 → 优先级 chip 变普通
7. 点"删除"：confirm "不可恢复" → 列表移除

---

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| `remove` 硬删与 T-001 软删规范不一致（预存）| T-016 不动；单测仅断言当前 `prisma.delete` 调用；CHANGELOG + README + 页面底部警告条三处提示；留独立任务 |
| admin 端无 Textarea / 时间选择器 UI 组件 | 原生 `<textarea>` + `<input type="datetime-local">`；不引入新依赖 |
| priority 仅 2 级未来可能不够 | 用户确认保持 2 级；schema 无需迁移 |
| admin build 在 worktree 嵌套下预存 4 级相对路径问题 | 非 T-016 引入；独立任务修 globals.css |

---

## 后续（V1.1）

- **必修**：`remove` 硬删 → 软删迁移 + 加 `restore` endpoint + admin UI includeDeleted 过滤（同时修 banner）
- 公告批量停用 / 批量删除
- 富文本编辑器（公告内容当前纯文本）
- 公告预览（在管理后台弹窗预览前端 banner 效果）
- 公告发送记录（哪些用户已读）
- 多语言公告
- admin UI 修复 pre-existing globals.css 4 级相对路径（独立任务）

---

**最后更新**：2026-06-27
**Commit 计划**：
1. `test(announcement): add unit tests for AnnouncementService (T-016a 12 cases)` — `84a81e8`
2. `feat(admin): announcement management page + sidebar (T-016b)` — `0c5ea13`
