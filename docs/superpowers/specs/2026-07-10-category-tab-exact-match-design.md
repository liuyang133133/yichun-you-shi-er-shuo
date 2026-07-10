# Category Tab 精确匹配修复 — 设计文档

**日期**：2026-07-10
**作者**：Claude (brainstorming skill)
**状态**：✅ Approved → 等待 writing-plans
**目标版本**：V1.1.1 (hotfix)

---

## 1. 背景

### 1.1 用户反馈

> "全部展示不全，没有把细项的所有数据进行展示。全部应该是各个子项数据的集合，但现在全部不是各个子项的集合。"
> — 用户在 `localhost:3000/?type=house&area=2` 标红"全部 16"按钮

### 1.2 现状

- 首页"全部" tab 显示 `type=house` 的所有 active+passed 帖子
- 10 个子分类 tab（二手房/新房/租房/...）每个都通过 `OR: [sub.id, sub.parentId]` 查询
- "全部" badge 的数字 = 父分类的孤儿帖子 + 各子分类去重并集，**与子分类 tab 加总不一致**
- 父分类（type=house）下的孤儿帖子会出现在**所有 10 个子分类**里
- 用户看到"全部"16 条，但点"二手房"也能看到不属于"二手房"语义的内容

### 1.3 根因

[`backend/src/modules/post/post.service.ts:79-95`](../../backend/src/modules/post/post.service.ts#L79-L95) 有一段 `[Bug fix]` 历史兼容代码：

```ts
if (cat?.parentId) {
  categoryOrFilter = [
    { categoryId: cat.id },
    { categoryId: cat.parentId },   // ← 父分类 fallback
  ];
}
```

**这是后端唯一一处父分类 fallback。** 其他 4 个 type 的 filter service（HouseService/SecondhandService/LifebizService/SearchService）已经全部是精确子分类匹配（详见 §4 影响面分析）。

---

## 2. 目标

让"全部" tab 的数据 **严格 =** 各个子分类 tab 的并集（去重），消除"全部 ≠ 子分类总和"的认知错位。

### 2.1 验收标准

- `全部` 数字 = `Σ(子分类数字)`（各子分类互不重叠）
- 各子分类 tab 内**不**再出现挂在父分类下的"孤儿"帖子
- Seed 数据 + 已通过审核的帖子在"全部"和子分类中的分布完全一致

### 2.2 非目标

- ❌ 不做大规模数据迁移（V1.1 阶段保持快迭代）
- ❌ 不改前端 UI / tab 渲染逻辑
- ❌ 不改 4 个 type 各自的 filter service（已经精确匹配）
- ❌ 不动 publish 流程的写路径

---

## 3. 设计

### 3.1 后端核心改动

**文件**：[`backend/src/modules/post/post.service.ts`](../../backend/src/modules/post/post.service.ts)

**Before**（行 78-95）：
```ts
let categoryOrFilter: Prisma.PostWhereInput[] | undefined;
if (categoryId) {
  // [Bug fix] 子类目过滤：兼容父类目直接挂的旧数据
  // 若请求的是子分类（parentId 非空），同时匹配父分类下的所有帖子
  // 这样历史 categoryId=父级 的帖子也能在子 tab 里展示
  const cat = await this.prisma.category.findUnique({
    where: { id: BigInt(categoryId) },
    select: { id: true, parentId: true },
  });
  if (cat?.parentId) {
    categoryOrFilter = [
      { categoryId: cat.id },
      { categoryId: cat.parentId },
    ];
  } else {
    categoryOrFilter = [{ categoryId: cat?.id ?? BigInt(categoryId) }];
  }
}
```

**After**：
```ts
let categoryOrFilter: Prisma.PostWhereInput[] | undefined;
if (categoryId) {
  // 子分类精确匹配（与 HouseService/SecondhandService/LifebizService/SearchService 行为一致）
  categoryOrFilter = [{ categoryId: BigInt(categoryId) }];
}
```

**净变化**：删除 1 个 `prisma.category.findUnique` 调用 + 1 个 if-else 分支，缩短 12 行。

### 3.2 新增单测

**文件**：[`backend/src/modules/post/post.service.spec.ts`](../../backend/src/modules/post/post.service.spec.ts)

在 describe('findAll') 下新增 2 个 case：

| Case | 场景 | 期望 |
|------|------|------|
| 精确匹配 | `categoryId=99`（子分类） | `where.OR = [{ categoryId: 99n }]`，**不**调用 `prisma.category.findUnique` |
| 无 fallback | seed 父分类帖子 1 条 + 子分类帖子 1 条，查询子分类 | 返回 1 条（子分类的），不返回父分类那条 |

### 3.3 新增 SQL 数据检查脚本

**新文件**：[`backend/scripts/check-orphan-posts.ts`](../../backend/scripts/check-orphan-posts.ts)

```ts
/**
 * T-022 数据前置检查：
 * 统计所有 categoryId 指向顶级分类（parentId IS NULL）的 post。
 * 子分类精确匹配修复合并前必须保证 dev 环境 = 0 行。
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orphans = await prisma.$queryRaw<Array<{
    id: bigint; title: string; type: string; cat_code: string; cat_name: string;
  }>>`
    SELECT p.id, p.title, p.type, c.code AS cat_code, c.name AS cat_name
    FROM posts p
    JOIN categories c ON c.id = p.category_id
    WHERE c.parent_id IS NULL
    ORDER BY p.type, p.id
  `;

  if (orphans.length === 0) {
    console.log('✅ No orphan posts (categoryId → 顶级分类). 子分类精确匹配修复可安全合并。');
  } else {
    console.warn(`⚠️  发现 ${orphans.length} 条父分类孤儿帖子：`);
    console.table(orphans);
    console.log('请先将这些帖子的 categoryId 迁移到合适的子分类，再合并本修复。');
    process.exit(1);
  }
}

main().finally(() => prisma.$disconnect());
```

**用法**：
```bash
cd backend && npx ts-node scripts/check-orphan-posts.ts
```

### 3.4 回归测试

- ✅ 跑 `post.service.spec.ts`（应全绿 + 2 新增 case 通过）
- ✅ 跑 L1 + L2 验收脚本（`verify-*.cjs` / `v1-acceptance`）
- ✅ 浏览器手测：
  - `localhost:3000/?type=house` → 记下"全部"数字 A
  - 依次点击 10 个子分类 → 记下每个数字
  - 验证 `A == Σ(子分类)`
  - 验证任一子分类的列表里不出现其他子分类的标题关键词

### 3.5 数据流（不变）

```
用户点 tab → setSelectedCategory(subId)
  → useEffect 触发
  → postApi.list({ categoryId: subId })
  → GET /posts?categoryId=X
  → post.service.findAll
  → where.OR = [{ categoryId: X }]   ← 现在精确匹配
  → 返回该子分类下的帖子
```

---

## 4. 影响面分析（已通过 Explore agent 验证）

| 模块 | 是否受影响 |
|------|------------|
| `PostService.getRelated` (post.service.ts:1066) | ❌ 已是精确匹配 |
| `HouseService.filterHouses` (house.service.ts:141) | ❌ 已是精确匹配 |
| `SecondhandService.filterSecondhands` (secondhand.service.ts:87) | ❌ 已是精确匹配 |
| `LifebizService.filterLifebizs` (lifebiz.service.ts:106) | ❌ 已是精确匹配 |
| `SearchService.search` (search.service.ts:48-51) | ❌ 已是精确匹配（raw SQL） |
| `AdminPostService.findAll` (admin-post.service.ts:59-86) | ❌ 不按 categoryId 过滤 |
| `PostService.findMyPosts` (post.service.ts:892) | ❌ 不按 categoryId 过滤 |
| `FavoriteService` (favorite.service.ts:140) | ❌ categoryId 只在 select，不在 filter |
| `create` / `update` 写路径 | ❌ 不受影响 |
| 前端 `home-content.tsx:95` | ❌ 只发子分类 id（来自 `uniqueSubCategories`） |
| 前端 `publish/manual-mode.tsx:253` | ❌ 写路径 |
| `post.service.spec.ts` 现有 case | ❌ 不依赖 fallback 行为 |

**结论**：移除 fallback 是**统一** `findAll` 与其他 4 个 type filter service 的行为，**不引入**新差异。

---

## 5. 风险 & 回滚

| 风险 | 等级 | 缓解 |
|------|------|------|
| 生产有父分类孤儿帖子 | 低 | 合并前跑 `check-orphan-posts.ts`；若有，手工改子分类 |
| Redis 缓存命中旧 OR 行为 | 低 | 5min TTL 自然失效；可手动 `redis-cli FLUSHDB cache:posts:*` 加速 |
| 其他端点隐式依赖 fallback | 极低 | §4 已逐个排查无依赖 |

**回滚**：1 行 `git revert` 即可恢复。

---

## 6. 验收清单

- [ ] `backend` build + 现有单测全绿
- [ ] 新增 2 个 `findAll` 单测通过
- [ ] `scripts/check-orphan-posts.ts` 在 dev 环境输出 ✅
- [ ] 浏览器手测：dev 环境 `localhost:3000/?type=house` 验证 `全部 == Σ子分类`
- [ ] L1 + L2 验收脚本无回归
- [ ] 提交 commit + push 到 `feat/v1.1.1-category-tab-exact-match` 分支

---

## 7. 后续（不在本次范围）

- V1.2: 引入 `categoryId` 写入校验（前端 publish 强制选子分类）
- V1.2: `categoryId` 数据迁移工具（自动按关键词把父分类帖子分到子分类）
- V1.2: 移除 `Category.parentId` 概念或新建 `CategoryGroup` 表（更清晰的数据模型）

---

## 8. 变更文件清单

1. `backend/src/modules/post/post.service.ts`（-12 行）
2. `backend/src/modules/post/post.service.spec.ts`（+30 行，新增 2 case）
3. `backend/scripts/check-orphan-posts.ts`（新文件，+35 行）
4. `docs/superpowers/specs/2026-07-10-category-tab-exact-match-design.md`（本文档）
