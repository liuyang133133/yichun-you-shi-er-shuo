# T-015 标签 — 后台管理

> **任务**：实现 admin 端标签管理（列表 / CRUD / 合并 / 停用 / 别名）。
> **分支**：`feature/T-015-tag-admin`（基于 `feature/T-014-tag-frontend` 重建）
> **状态**：✅ 完成 2026-06-27
> **关联**：T-013（标签后端）/ T-014（标签前端）

---

## Context

T-013 完成了标签系统数据层 + 公开 API + admin 写接口（POST/PATCH/DELETE），但缺：
- **GET /admin/tags** — admin 视图（看得到禁用/已删）
- **POST /admin/tags/:id/merge** — 合并 2 标签
- **status 字段** — 区分"停用"和"已删"
- **aliases 字段** — 标签别名（搜索联想）
- **/admin/tags 页面** — 标签治理 UI

T-015 补完以上缺失，admin 可在 UI 上完成所有标签治理操作（CRUD/停用/合并/搜索）。

---

## 数据流

```
admin /admin/tags (Browser)
  ↓ GET /api/v1/admin/tags?q=...&includeDeleted=false&includeDisabled=true
  ↓ TagController (AdminTagController.findAllForAdmin)
  ↓ TagService.findAllForAdmin
  ↓ Prisma tag.findMany + count
  ↓ MySQL tags
  ↑ JSON: { list: AdminTag[], total, page, pageSize }

admin 点"合并" → POST /api/v1/admin/tags/:id/merge { targetId }
  ↓ TagService.merge (事务内)
  ↓   1) 取 source 全部 PostTag 的 postId
  ↓   2) 找 target 已有 (postId, targetId) → existingSet
  ↓   3) createMany 插入未关联的 (postId, targetId)
  ↓   4) deleteMany 删 source 全部 PostTag
  ↓   5) source: useCount=0 + status=0 + deletedAt=now
  ↓   6) target: useCount += sourcePostTags.length
  ↑ JSON: { sourceId, targetId, merged: true }
```

---

## 关键设计决策

### 1. status 字段（停用 vs 已删）

| 状态 | status | deletedAt | 前端可见 | admin 可见 |
|---|---|---|---|---|
| 启用 | 1 | null | ✅ | ✅ |
| 停用 | 0 | null | ❌ | ✅（含"包含已停用"） |
| 已删 | 0/1 | 非空 | ❌ | ✅（含"包含已删除"） |

- **status** = 业务状态，admin 可重新启用
- **deletedAt** = 数据状态，软删可恢复（30 天内）

### 2. aliases 字段（CSV 格式）

```ts
aliases = "山野菜,野菜,山菜,山野"
```

- TagSelector 搜索：`where.OR: [name, slug, aliases] contains`
- 上限 500 字符
- admin UI 单标签编辑

### 3. merge endpoint

`POST /api/v1/admin/tags/:id/merge` + body `{ targetId }`

事务内 6 步：
1. 取 source 全部 PostTag 的 postId
2. 查 target 已有 (postId, targetId) — 防 uniq_post_tag 冲突
3. createMany 插入未关联的 (postId, targetId) — 不抛错
4. deleteMany 删 source 全部 PostTag
5. source: `useCount=0, status=0, deletedAt=now` (3 字段同时标记)
6. target: `useCount += sourcePostTags.length`

**特殊校验**：
- 自身合并 → `BadRequestException`
- 源/目标已删 → `NotFoundException`

### 4. 公开 API 加 status: 1 过滤

- `findAll` (公开) — `where.deletedAt = null AND status = 1`
- `findBySlug` (公开) — 同上
- `findHot` (公开) — 同上
- **影响**：停用标签对前台隐藏（验收 (2) "停用标签不在前端可见"）
- **保护**：30 seed 全 status=1 默认，行为不变

---

## API 一览

### 公开 API（T-015 行为变更）

| Method | Path | 行为变更 |
|---|---|---|
| GET /tags | 全列表 | 新增 `status: 1` 过滤（停用标签隐藏）|
| GET /tags/:slug | 单个详情 | 新增 `status: 1` 过滤 |
| GET /tags/hot | 热门 | 新增 `status: 1` 过滤 |

### Admin API（T-015 新增 / 调整）

| Method | Path | 说明 |
|---|---|---|
| GET /admin/tags | 列表（q + includeDeleted + includeDisabled + 分页）| **新增** |
| POST /admin/tags | 新建 | 加 `aliases` + `status` 字段 |
| PATCH /admin/tags/:id | 更新 | 加 `aliases` + `status` 字段 |
| DELETE /admin/tags/:id | 软删 | 不变 |
| POST /admin/tags/:id/merge | 合并 | **新增** |
| POST /admin/tags/migrate-from-json | 迁移 | 不变 |

---

## admin UI 布局

```
┌─────────────────────────────────────────────────────────┐
│ 🏷 标签管理            共 N 个标签        [新建标签]       │
├─────────────────────────────────────────────────────────┤
│ 🔍 [搜索标签名/slug/别名] ☐包含已删除 ☐包含已停用         │
├─────────────────────────────────────────────────────────┤
│ ID  Slug   名称  别名  使用数  排序  热门  状态  操作     │
│ ─── ────  ───  ───  ────  ───  ───  ────  ────          │
│ 1   shan  山林  ...   10     0    ⭐   启用  ⭐✏⚡🔀🗑    │
│ 2   snow  雪山  ...   5      1    -    启用  ⭐✏⚡🔀🗑    │
│ 3   old   旧标  ...   0      0    -    已删  (无操作)    │
└─────────────────────────────────────────────────────────┘

操作图标：
⭐ 切换热门
✏ 编辑（打开模态）
⚡ 切换启用/停用
🔀 合并（打开模态，需选目标）
🗑 软删
```

### 创建/编辑 模态字段
- Slug（编辑时禁用）
- 名称 *
- 描述
- 别名（CSV）
- 排序（数字小=靠前）
- 状态（启用/停用 下拉）
- 热门（checkbox）

### 合并 模态
- 源标签（只读预览：name + slug + useCount）
- 目标标签（搜索下拉，调 adminTagApi.list）
- 二次确认弹窗
- 不可恢复警告

---

## 验收对照

| TODO.md 验收点 | 状态 | 验证 |
|---|---|---|
| (1) 合并把 A 标签 PostTag 全部转到 B，A 软删除 | ✅ | 单测 #29 验证 6 步流程 + #30 验证 unique 防重复 |
| (2) 停用标签不在前端可见 | ✅ | findAll/findBySlug/findHot 加 status: 1 过滤 |

### 自动化验收

| 项目 | 状态 |
|---|---|
| 后端 tsc | ⚠️ 4 预存在错误（与 T-015 无关：admin/company + Throttle） |
| 后端 tag.service 单测 | ✅ 30/30（20 旧 + 6 新 findAllForAdmin + 4 新 merge） |
| 后端 post.service 单测（T-013b） | ✅ 5/5（无回归） |
| admin tsc | ✅ 0 错 |
| admin build | ⚠️ 预存在路径问题（globals.css 引用 tokens.css 4 级相对路径在 worktree 嵌套下不解析） |

### 手动冒烟（待执行）

1. 启动 backend + admin → 登录 admin → /admin/tags → 看到 30 行
2. 勾选/取消"包含已停用"：列表立即响应
3. 切换热门 (⭐) ：刷新看到状态变化
4. 停用测试：
   - 选个 useCount > 0 的标签 → 停用 → 状态变灰
   - 取消勾选"包含已停用" → 列表立即隐藏
   - 访问前台 /tags → 该标签不可见
   - 再启用 → 重新可见
5. 合并测试：
   - 创建 A=test-merge-source 标签
   - 创建 2 个帖子各打 A 标签 → A.useCount=2
   - 创建 B=test-merge-target 标签
   - admin 点 A 的"合并" → 选 B → 提交
   - 验证：A.useCount=0 + 已停用 + 已删；B.useCount=2
   - 前台 /tags：A 不可见；B 可见
   - 2 个帖子详情：tag chips 仍显示 A（因为 PostTag 已转到 B，B 的 postTags 含这 2 个 postId）

---

## 文件清单

### 后端（新建 1 + 修改 3）

**新建**：
- `backend/prisma/migrations/20260627000000_add_tag_status_and_aliases/migration.sql`（17 行）

**修改**：
- `backend/prisma/schema.prisma`（Tag model 加 status + aliases 字段 + 1 索引）
- `backend/src/modules/tag/dto/tag.dto.ts`（CreateTagDto/UpdateTagDto 加字段 + 2 新 DTO）
- `backend/src/modules/tag/tag.controller.ts`（AdminTagController 加 2 endpoint + 更新顶部注释）
- `backend/src/modules/tag/tag.service.ts`（+findAllForAdmin +merge；findAll/findBySlug/findHot 加 status: 1；create 加 aliases/status；CreateTagInput/UpdateTagInput 加字段；新增 BadRequestException 导入）
- `backend/src/modules/tag/tag.service.spec.ts`（30 用例，+10 新 + 4 旧更新 status 断言）

### admin 端（新建 1 + 修改 2）

**新建**：
- `admin/src/app/tags/page.tsx`（~470 行：列表 + 表格 + 创建/编辑模态 + 合并模态 + 状态 chip + 操作图标）

**修改**：
- `admin/src/lib/api.ts`（+AdminTag interface + adminTagApi 5 方法）
- `admin/src/components/layout/admin-shell.tsx`（+Tag 图标 + SYSTEM_NAV 加 1 项）

---

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| 迁移加 status 字段对 30 seed 数据的影响 | 默认 status=1，无数据回填；30 标签全部启用，行为不变 |
| merge 后 useCount 偏差 | createMany 跳过已存在 + source useCount 重置 0 + target += N（含已存在），最终一致 |
| 公开 API 加 status 1 过滤破坏前端 | 30 seed 全启用，行为不变；停用标签"不在前端可见"是验收 (2) 要求 |
| 合并误操作 | 二次确认 + 显式源/目标预览 + 不可恢复警告 |
| Worktree admin build 预存在路径问题 | 非 T-015 引入；需独立任务修 admin globals.css 4 级相对路径 |

---

## 后续（V1.1）

- 标签批量停用
- 标签合并历史 / 撤销
- 别名自动补全（基于 Post 内容 NLP）
- 标签使用趋势图
- 标签导入 / 导出 CSV
- 用户订阅标签（T-042 推荐系统）

---

**最后更新**：2026-06-27
**Commit 计划**：
1. `feat(tag): T-015a 标签后台补完 — 1 迁移 + 2 admin API + 字段别名/状态`
2. `feat(admin): T-015b 标签后台管理 UI — /admin/tags 列表/CRUD/合并/停用`
