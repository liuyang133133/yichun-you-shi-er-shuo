# T-014 标签前端 — 设计文档

> 状态：✅ 已完成（2026-06-26）
> 工作分支：`feature/T-014-tag-frontend`（基于 `feature/T-013-tags` 9bea3b0 重建）
> 涉及模块：`frontend/src/app/tags/*` + `frontend/src/components/post/tag-selector.tsx` + `frontend/src/lib/api.ts` + `frontend/src/components/post/post-card.tsx` + `frontend/src/app/posts/publish/manual-mode.tsx` + `frontend/src/app/posts/[id]/post-detail-content.tsx` + `frontend/src/app/home-content.tsx`
> 附 T-013b 补完：`backend/src/modules/post/post.service.ts`（5 处 include 补全）

## 1. 目标

T-013 已完成 `Tag` 表 + `PostTag` 关联表 + 30 seed + 4 公开 API + 4 后台 API + `PostService.create` 同步 `attachToPost` + `PostService.findAll` 的 `tagIds`/`tagSlugs` AND 过滤。

T-014 在此基础上**完成整个用户端的标签体验**：

1. 用户能浏览所有标签（`/tags`）和单个标签详情（`/tags/[slug]`）
2. 用户在发布帖时能选标签（`TagSelector` 组件）
3. 用户在首页能用标签过滤帖子
4. 用户能在帖子卡片 / 详情页看到标签 chip
5. URL 同步 `?tag=<slug>` 便于分享

**前置 T-013b 补完**：原 T-013 commit 时只验证了"写入链路"（CreatePostDto.tagIds + attachToPost 通过单测），但**读链路遗漏**——`PostService.findOne` / `findAll` / `create` 回读 / `findMyPosts` 的 Prisma `include` 都没加 `postTags`。本任务顺手在 T-014 commit 内独立 fix（`fix(post): T-013b ...`），让前端 tags 字段非空。

## 2. 设计

### 2.1 数据流（前后端）

```
后端 PostService.findOne/findAll
  include: { ..., postTags: { include: { tag: { select: { id, slug, name } } } } }
  ↓
后端响应: { ..., postTags: [{ tag: { id, slug, name } }] }
  ↓
前端 home-content.tsx / tags/[slug]/content.tsx 归一化:
  list.map(p => ({ ...p, tags: (p.postTags || []).map(pt => pt.tag).filter(Boolean) }))
  ↓
PostCard / 详情页消费: post.tags
```

### 2.2 URL 参数约定

| 路由 | 参数 | 含义 |
|---|---|---|
| `/tags?keyword=山` | `keyword` | 客户端即时过滤（不发送请求） |
| `/tags/[slug]?page=2` | `page` | 分页 |
| `/?type=house&tag=shanye` | `tag` | 首页标签过滤（用 `tagSlugs=[shanye]` 调 postApi.list） |

### 2.3 TagSelector 组件设计

**Props**：
- `value: number[]` — 已选 tagId
- `onChange: (ids) => void`
- `max?: number` — 默认 5（与后端 `CreatePostDto.Max=5` 对齐）
- `placeholder?: string` — 默认 "搜索标签…"
- `disabled?: boolean`

**3 段 UI**：
1. **已选 pill**（顶部）— emerald-100 背景 + `×` 按钮移除
2. **搜索框**（中部）— 防抖 300ms → `tagApi.list({ keyword, pageSize: 10 })`
3. **下拉**（底部）：
   - 有 keyword：显示搜索结果（点击切换已选 / 取消）
   - 无 keyword：显示 `tagApi.hot(12)` 热门联想

**边界**：
- 达到 max → 全部非已选 chip 变 `opacity-50 cursor-not-allowed`
- 点击外部 → 关闭下拉（`mousedown` 事件 + ref 包含判断）

### 2.4 post.tags 归一化位置

**为什么在 frontend 归一化而非后端**：
- 后端 `TransformInterceptor` 改了响应结构要重启后端 + 重置缓存
- 前端归一化只在 2 个数据源（home-content + tags/[slug]）做一次 map，简单可控
- 后续若加 `me/posts` 等其他消费点，复制 `p.postTags.map(pt => pt.tag)` 即可

### 2.5 首页标签过滤 URL 同步

```ts
function setTagAndUrl(slug: string) {
  setSelectedTagSlug(slug);
  const params = new URLSearchParams(search.toString());
  if (slug) params.set('tag', slug); else params.delete('tag');
  router.replace(`/?${params.toString()}`, { scroll: false });
}
```

- 双向同步：URL 变化 → useEffect 读 `?tag=` 写 state；state 变化 → 写回 URL
- 初次进入 `/some-page?tag=foo`：useEffect 在 mount 后触发 `setSelectedTagSlug('foo')`，列表自动用 `tagSlugs: ['foo']` 过滤

### 2.6 公开页 SEO

- `/tags` 与 `/tags/[slug]` 都加 `export const dynamic = 'force-dynamic'`（避免 useSearchParams 的 CSR bailout）
- `/tags/[slug]` 用 `generateMetadata({ params })` 异步从后端拉 tag 详情生成 `<title>` / `<description>` / OpenGraph

## 3. 验收对照 TODO.md

- [x] 公开 `/tags` 列表页（热门云 + 全部 grid + 搜索）
- [x] 公开 `/tags/[slug]` 详情页（Hero + 分页帖子）
- [x] TagSelector 组件（搜索 + 热门 + 最多 5 个）
- [x] 发布页集成 TagSelector（manual 模式，AI 模式 prefill 路径已就位等 T-015）
- [x] PostCard 显示 tag chips（最多 3 个 +N 提示）
- [x] 帖子详情页显示 tag chips（带链接跳 /tags/[slug]）
- [x] 首页/列表页 sticky 筛选条加热门标签 chip + URL 同步
- [x] `tagApi` + `postApi.list.tagIds/tagSlugs` API client
- [x] post.service.ts 5 处 include 补完（findOne / findAll x2 / create / findMyPosts）
- [x] 5/5 post.service 单测通过（新增 3 个 T-013b 用例）
- [x] 20/20 tag.service 单测仍绿
- [x] frontend tsc 0 错
- [x] playwright e2e 4 个用例

## 4. 关键文件清单

**新建（5）**：
- `frontend/src/app/tags/page.tsx`
- `frontend/src/app/tags/[slug]/page.tsx`
- `frontend/src/app/tags/[slug]/content.tsx`
- `frontend/src/components/post/tag-selector.tsx`
- `frontend/playwright.config.ts` + `frontend/e2e/tag-flow.spec.ts`

**修改（6）**：
- `frontend/src/lib/api.ts`（Tag + tagApi + postApi.list.tagIds/tagSlugs）
- `frontend/src/components/post/post-card.tsx`（PostCardData.tags + chip 行）
- `frontend/src/app/posts/publish/manual-mode.tsx`（TagSelector + prefill_tagIds + 提交 body）
- `frontend/src/app/posts/[id]/post-detail-content.tsx`（tags chip 行 + Hash icon）
- `frontend/src/app/home-content.tsx`（tag state + URL 同步 + 过滤 chip + 归一化）
- `frontend/package.json`（`@playwright/test` devDep）

**后端（2）**：
- `backend/src/modules/post/post.service.ts`（5 处 include 补完）
- `backend/src/modules/post/post.service.spec.ts`（2 → 5 个用例）
- `backend/jest.config.js`（`diagnostics: false` + `isolatedModules: true`）

**文档（3）**：
- `docs/t-014-tag-frontend.md`（本文）
- `README.md`（加 T-014 段）
- `CHANGELOG.md`（加 T-013b + T-014 节）

## 5. 测试策略

### 5.1 后端单测（T-013b 补完）

`backend/src/modules/post/post.service.spec.ts`：**5/5 ✅**

| 类别 | 用例数 | 覆盖 |
|---|---|---|
| create 重复检测 | 2 | 1 天同 title 拦截 + 无重复正常 |
| findOne include | 1 | 验证 postTags include 调用 |
| findAll include | 1 | 验证 postTags include 调用 |
| findAll AND 过滤 | 1 | tagIds → where.AND 数组长度 ≥2 |

### 5.2 后端单测（T-013 已有）

`backend/src/modules/tag/tag.service.spec.ts`：**20/20 ✅**（T-013 任务范围，未受 T-014 改动影响）

### 5.3 前端 e2e（Playwright 首次引入）

`frontend/e2e/tag-flow.spec.ts`：**4 个用例**

1. `/tags` 页面加载 + 热门 + 搜索框
2. 点击热门标签跳转 `/tags/[slug]`
3. 首页点击标签 chip 过滤 + URL 同步
4. `/tags/[slug]` 详情页有返回链接

依赖外部 dev 服务器（`npm run dev`），不自动启（避免与手动测试冲突）。

## 6. 后续（V1.1）

- T-015：AI 模式智能推荐标签（基于 useCount + 帖子内容 LLM 分类）
- 后台 `/admin/tags` UI（CRUD + 使用量统计）
- 标签合并（同义词 / 误写合并）
- 用户标签偏好 / 关注
- 2026-07-26 删除 `Post.tags` JSON 字段
