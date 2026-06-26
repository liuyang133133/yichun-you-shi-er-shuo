# T-013 标签系统 — 数据库 + 迁移设计文档

> 状态：✅ 已完成（2026-06-26）
> 工作分支：`feature/T-013-tags`
> 涉及模块：`backend/src/modules/tag/` + `backend/src/modules/post/` (tagIds 过滤)

## 1. 目标

建立规范化标签系统，支持：

- 后台管理标签字典（CRUD + 热门/排序）
- 帖子发布时打标签
- 列表/详情按标签过滤（AND 语义：post 必须关联**所有**指定 tagId）
- 标签详情页（聚合帖子列表）
- 兼容期 1 个月：Post.tags JSON 字段保留，迁移脚本把历史数据灌进 PostTag

**核心痛点（解决前）**：

- Post.tags 是 `Json?` 字段（季节频道标签：山野菜/雪地胎等自由字符串）
- 没有规范化关联，无法高效按标签过滤、统计使用量
- 标签字典无管理入口（只能改 JSON）

## 2. 设计

### 2.1 数据模型

```prisma
model Tag {
  id          BigInt    @id @default(autoincrement())
  slug        String    @unique @db.VarChar(50)   // URL 友好
  name        String    @db.VarChar(50)           // 中文名
  description String?   @db.VarChar(500)          // SEO + 详情
  useCount    Int       @default(0)               // 冗余（写时事务内维护）
  isHot       Boolean   @default(false)           // 首页"热门标签云"
  sortOrder   Int       @default(0)               // 排序权重
  createdBy   BigInt?
  updatedBy   BigInt?
  deletedBy   BigInt?
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  postTags PostTag[]

  @@index([useCount])
  @@index([isHot])
  @@index([deletedAt])
  @@map("tags")
}

model PostTag {
  id        BigInt   @id @default(autoincrement())
  postId    BigInt
  tagId     BigInt
  createdAt DateTime @default(now())

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([postId, tagId], map: "uniq_post_tag")
  @@index([postId])
  @@index([tagId])
  @@map("post_tags")
}
```

**关键决策**：
- `useCount` 冗余字段：避免每次都 `count(PostTag)`，写时事务内 +1/-1
- `isHot`：后台手动标记 + 自动判定（useCount > 阈值）
- 软删除 tags 保留（detached 仍能通过 PostTag 查）；PostTag 用 FK CASCADE 物理删除
- `uniq_post_tag` 唯一约束防重复打标

### 2.2 API 设计

**公开端点**：

| Method | Path | 说明 |
|---|---|---|
| GET | `/tags` | 列表（q/limit/offset 搜索） |
| GET | `/tags/hot` | 热门标签（isHot 或 useCount > 0） |
| GET | `/tags/:slug` | 单个标签详情 |
| GET | `/tags/:slug/posts` | 标签下的帖子（分页） |

**后台端点**（admin only）：

| Method | Path | 说明 |
|---|---|---|
| POST | `/admin/tags` | 新建（slug 冲突自动 -2/-3） |
| PATCH | `/admin/tags/:id` | 更新（不允许改 slug） |
| DELETE | `/admin/tags/:id` | 软删除 |
| POST | `/admin/tags/migrate-from-json` | 一次性从 Post.tags JSON 迁移到 PostTag |

**Post 端点集成**：

| 端点 | 字段 | 说明 |
|---|---|---|
| POST /posts | `dto.tagIds: number[]` | 创建时关联标签（最多 5 个） |
| GET /posts?tagIds=1,2,3 | query | 过滤（AND 语义，post 必须同时关联所有 tagId） |
| GET /posts?tagSlugs=shanlin,xueshan | query | 按 slug 过滤（与 tagIds 二选一） |

### 2.3 关键设计点

**1. AND 过滤实现**

Prisma 不支持 `every` over relation。Pragmatic 做法：每个 tagId 一次 `postTags: { some: { tagId: tid } }`：

```ts
where.AND = [
  ...existing,
  ...resolvedTagIds.map((tid) => ({ postTags: { some: { tagId: tid } } })),
];
```

**2. useCount 维护**

- `attachToPost(postId, tagIds)`：事务内 insert PostTag + `tag.update({ useCount: { increment: 1 } })`
- `detachFromPost(postId, tagIds)`：事务内 deleteMany + `tag.update({ useCount: { decrement: 1 } })`
- 简化处理：detach 时即使 deleteMany.count=0（已删过）也 -1，结果可能偏小 1，可接受
- 重复关联：P2002 视为幂等成功，不增加 useCount

**3. 数据迁移策略**

`migrateFromJson()`：
- 遍历所有 `Post.tags IS NOT NULL` 的帖子
- 对每个 name 调 `toSlug(name)` 简化转 slug
- 命中缓存/DB 复用 Tag，否则创建
- insert PostTag（P2002 跳过）
- useCount +1

**4. 兼容期**

`Post.tags` JSON 字段保留 1 个月（2026-07-26 前删除），期间：
- 新发帖子：可同时写 Post.tags JSON（自由季节频道） + PostTag（规范化业务标签）
- 列表接口：tagIds 过滤仅查 PostTag，不看 JSON

### 2.4 Seed 数据（30 个伊春本地标签）

| 分类 | 标签数 | 示例 |
|---|---|---|
| 季节频道 | 4 | 山野菜、雪地胎、避暑房、冬江鱼 |
| 本地特产 | 6 | 黑尊菜、红松节、马毛酒、林泉水、北药草、山林特产 |
| 房屋出租 | 4 | 整租、合租、短租、店商 |
| 二手交易 | 4 | 家电、数码、家具、儿童用品 |
| 招聘 | 4 | 林业、旅游、家教、兼职 |
| 便民 | 4 | 收江、汽车、宠物、失物 |
| 综合 | 4 | 娱乐、体育、教育、医疗 |
| **总计** | **30** | isHot=true: 4 个（季节频道）+ 山林特产 |

## 3. 测试策略（TDD）

### 3.1 后端单测

`backend/src/modules/tag/tag.service.spec.ts`：**20/20 ✅**

| 类别 | 用例数 | 覆盖 |
|---|---|---|
| findAll | 3 | 排序 / 搜索 / 分页 |
| findBySlug | 2 | 找到 / NotFound |
| findHot | 2 | 过滤条件 / 默认 limit |
| create | 3 | slug 冲突 / 默认值 / 自动去重 |
| update | 2 | NotFound / 不允许改 slug |
| delete | 2 | 软删 / 幂等 |
| PostTag 关联 | 3 | 事务 / 重复跳过 / detach |
| findPostsByTag | 1 | PostTag 关联查 post |
| 数据迁移 | 2 | 遍历 JSON / null 跳过 |

## 4. 验收对照 TODO.md

- [x] Tag + PostTag 新表（migration `20260626000000_add_tag_system`）
- [x] Post.tags JSON → PostTag 迁移函数（migrateFromJson）
- [x] `useCount` 事务内自动累加
- [x] 同一帖子同一标签不重复（`@@unique([postId, tagId])`）
- [x] 30 个伊春本地标签 seed
- [x] 后台 CRUD + 软删 + 热门/排序
- [x] 公开 4 个 API（list / hot / detail / posts）
- [x] PostService.findAll 支持 tagIds + tagSlugs 过滤（AND 语义）
- [x] PostService.create 同步 attachToPost
- [x] 单测 20/20 通过
- [x] 后端 tsc 0 错误（T-013 模块本身）

## 5. 后续（V1.1）

- [ ] 前端 /tags 列表 + 标签详情页（T-014 任务）
- [ ] 发布页标签选择器（AI 建议 + 热门联想 + 手动输入）
- [ ] 后台 /admin/tags 页面（CRUD UI + 使用量统计）
- [ ] 2026-07-26 删除 Post.tags JSON 字段
- [ ] 标签合并（同义词 / 误写合并）
- [ ] 用户标签偏好 / 关注（V1.2）