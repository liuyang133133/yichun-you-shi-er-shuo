# T-022 Category Tab 精确匹配修复 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除 `post.service.ts` 的父分类 fallback，让首页"全部" tab 数据 = 各个子分类 tab 的并集（去重），消除"全部 ≠ 子分类总和"的认知错位。

**Architecture:** 单点后端修复（~12 行代码），配合 2 个单测 + 1 个 SQL 数据前置检查脚本。改动让 `PostService.findAll` 与其他 4 个 type filter service（HouseService/SecondhandService/LifebizService/SearchService）的行为对齐（都是精确子分类匹配）。

**Tech Stack:** NestJS + Prisma + Jest（TypeScript）

**Spec:** [docs/superpowers/specs/2026-07-10-category-tab-exact-match-design.md](../specs/2026-07-10-category-tab-exact-match-design.md)

---

## 文件结构

| 文件 | 类型 | 责任 |
|------|------|------|
| `backend/src/modules/post/post.service.ts` | Modify (行 78-95) | 移除父分类 fallback，改为精确匹配 |
| `backend/src/modules/post/post.service.spec.ts` | Modify (findAll describe 块) | 加 2 个 case：精确匹配 + 无 fallback |
| `backend/scripts/check-orphan-posts.ts` | Create | 数据前置检查：打印 `categoryId → 父分类` 的孤儿帖子 |
| `backend/package.json` | Modify | 加 npm script `check:orphan-posts` |

**净变化**：后端 -12 行 / +30 行单测 / +35 行新脚本。零前端改动。

---

## Task 1: 添加 SQL 数据前置检查脚本

**Files:**
- Create: `backend/scripts/check-orphan-posts.ts`
- Modify: `backend/package.json`（加 npm script）

- [ ] **Step 1: 创建脚本文件**

创建 `backend/scripts/check-orphan-posts.ts`：

```ts
/**
 * T-022 数据前置检查：
 * 统计所有 categoryId 指向顶级分类（parentId IS NULL）的 post。
 * 子分类精确匹配修复合并前必须保证 dev 环境 = 0 行。
 *
 * 用法：
 *   cd backend && npm run check:orphan-posts
 *   或: npx ts-node scripts/check-orphan-posts.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orphans = await prisma.$queryRaw<Array<{
    id: bigint;
    title: string;
    type: string;
    cat_code: string;
    cat_name: string;
  }>>`
    SELECT
      p.id, p.title, p.type,
      c.code AS cat_code, c.name AS cat_name
    FROM posts p
    JOIN categories c ON c.id = p.category_id
    WHERE c.parent_id IS NULL
    ORDER BY p.type, p.id
  `;

  if (orphans.length === 0) {
    console.log('✅ No orphan posts (categoryId → 顶级分类). 子分类精确匹配修复可安全合并。');
    process.exit(0);
  }

  console.warn(`⚠️  发现 ${orphans.length} 条父分类孤儿帖子：`);
  console.table(orphans);
  console.log('\n请先将这些帖子的 categoryId 迁移到合适的子分类，再合并本修复。');
  console.log('查询 SQL：');
  console.log(`  SELECT id, title, type, category_id FROM posts WHERE category_id IN (${orphans.map(o => o.id).join(',')})`);
  process.exit(1);
}

main()
  .catch((e) => {
    console.error('脚本执行失败：', e);
    process.exit(2);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: 在 package.json 加 npm script**

打开 `backend/package.json`，在 `scripts` 区块里加一行（找 `start:dev` 旁边的位置）：

```json
"check:orphan-posts": "ts-node scripts/check-orphan-posts.ts",
```

- [ ] **Step 3: 验证脚本可执行（不连库，仅看编译）**

Run:
```bash
cd backend && npx tsc --noEmit scripts/check-orphan-posts.ts 2>&1 | head -20
```

Expected: 无错误输出（可能有 "Cannot find module '@prisma/client'"，这是因为 tsc 不读 tsconfig path，**可忽略**；实际跑 `npm run` 时 Node 会解析）。

- [ ] **Step 4: Commit**

```bash
cd backend
git add scripts/check-orphan-posts.ts package.json
git commit -m "feat(check): T-022 添加 check-orphan-posts 数据前置检查脚本"
```

---

## Task 2: 在 dev 环境跑检查脚本（必须 0 行才允许继续）

**Files:** 无（仅执行）

- [ ] **Step 1: 确认 dev 数据库可连**

Run:
```bash
cd backend && cat .env | grep DATABASE_URL
```

Expected: 输出形如 `DATABASE_URL="mysql://..."`。

- [ ] **Step 2: 跑检查脚本**

Run:
```bash
cd backend && npm run check:orphan-posts
```

Expected output（**0 行才可继续**）：
```
✅ No orphan posts (categoryId → 顶级分类). 子分类精确匹配修复可安全合并。
```

- [ ] **Step 3: 如果输出有孤儿帖子 → STOP**

如果有输出：

```
⚠️  发现 N 条父分类孤儿帖子：
```

**立即停止**，把输出贴给用户，要求：
1. 手工把每条 `categoryId` 改到合适的子分类（用 SQL `UPDATE posts SET category_id = X WHERE id = Y`）
2. 再跑一次脚本确认 0 行
3. 然后才继续 Task 3

**不要在没修复数据的情况下继续** — 合并后这些孤儿帖会从子分类 tab "消失"（虽然在"全部"里还能看到）。

---

## Task 3: 写测试 1（精确匹配 — 不调 prisma.category.findUnique）

**Files:**
- Modify: `backend/src/modules/post/post.service.spec.ts`（在 `describe('PostService.findAll - tags include (T-013b)')` 块内追加 1 个 it）

- [ ] **Step 1: 在 `findAll` describe 块末尾追加新 case**

打开 `backend/src/modules/post/post.service.spec.ts`，定位到 **行 199-204**（`it('findAll + tagIds 过滤应构造 AND 子句', ...)` 之后），追加：

```ts
  // T-022: 子分类精确匹配 — 不调 prisma.category.findUnique
  it('findAll + categoryId 应只查 categoryId 自身（不查父分类 fallback）', async () => {
    mockPrisma.category = { findUnique: jest.fn() };
    await service.findAll({ type: 'house', categoryId: 99 } as any);
    // 不应触发 prisma.category.findUnique（移除父分类 fallback 后无此调用）
    expect(mockPrisma.category.findUnique).not.toHaveBeenCalled();
    // 应只构造精确匹配的 where.OR
    const callArgs = mockPrisma.post.findMany.mock.calls[0]?.[0];
    expect(callArgs?.where?.OR).toEqual([{ categoryId: 99n }]);
  });
```

注意：`mockPrisma` 在 `findAll` describe 块的 `beforeEach` 里没有 `category` 字段，所以第 1 行手动加了一个 `category.findUnique` mock，以便 `not.toHaveBeenCalled()` 断言能跑通。

- [ ] **Step 2: 跑测试确认 PASS（因为当前代码还在调 prisma.category.findUnique — 这里会 FAIL）**

Run:
```bash
cd backend && npx jest --testPathPattern=post.service.spec.ts -t "不调 prisma.category.findUnique" --no-coverage 2>&1 | tail -30
```

Expected: **FAIL** with `Expected: 0, Received: 1`（说明 `prisma.category.findUnique` 被调到了，证明移除前的代码仍依赖它）。

如果测试 PASS（极小概率，说明 mock 不工作），停下来检查 mock 设置。

---

## Task 4: 改 post.service.ts（移除父分类 fallback）

**Files:**
- Modify: `backend/src/modules/post/post.service.ts`（行 78-95 → 行 78-80）

- [ ] **Step 1: 替换行 78-95**

打开 `backend/src/modules/post/post.service.ts`，定位到 **行 78-95**：

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

**整段替换为**：

```ts
    let categoryOrFilter: Prisma.PostWhereInput[] | undefined;
    if (categoryId) {
      // T-022: 子分类精确匹配（与 HouseService/SecondhandService/LifebizService/SearchService 行为一致）
      // 父分类下的孤儿帖子需手工迁移到子分类后才会出现在子 tab
      categoryOrFilter = [{ categoryId: BigInt(categoryId) }];
    }
```

净变化：-12 行（含 1 个 `prisma.category.findUnique` 调用 + 1 个 if-else）。

- [ ] **Step 2: 跑 Task 3 的测试确认 PASS**

Run:
```bash
cd backend && npx jest --testPathPattern=post.service.spec.ts -t "不调 prisma.category.findUnique" --no-coverage 2>&1 | tail -15
```

Expected: **PASS** with 1 passed。

---

## Task 5: 写测试 2（无 fallback — 父分类帖子不返回）

**Files:**
- Modify: `backend/src/modules/post/post.service.spec.ts`（在 Task 3 的 case 后追加）

- [ ] **Step 1: 追加第 2 个 case**

在 Task 3 追加的 `it(...)` 之后，再追加：

```ts
  // T-022: 无 fallback — 父分类下的孤儿帖子不返回
  it('findAll + categoryId 子分类时, 父分类的帖子不混入结果', async () => {
    // 模拟：子分类 99 和父分类 1 都有帖子
    mockPrisma.post.findMany.mockResolvedValue([
      { id: 10n, categoryId: 99n, title: '子分类帖' },  // 应返回
      // 注意: 父分类帖不会出现在 findMany 返回里（精确匹配 OR 不会命中父分类）
    ] as any);
    mockPrisma.post.count.mockResolvedValue(1);

    const result = await service.findAll({ type: 'house', categoryId: 99 } as any);

    // 验证 where.OR 只包含子分类 id（精确匹配）
    const callArgs = mockPrisma.post.findMany.mock.calls[0]?.[0];
    expect(callArgs?.where?.OR).toEqual([{ categoryId: 99n }]);
    // where.OR 长度必须 = 1（无 fallback）
    expect(callArgs?.where?.OR).toHaveLength(1);
    // 返回值只包含子分类帖
    expect(result.list.every((p: any) => p.categoryId === 99n)).toBe(true);
    expect(result.total).toBe(1);
  });
```

- [ ] **Step 2: 跑测试确认 PASS**

Run:
```bash
cd backend && npx jest --testPathPattern=post.service.spec.ts -t "父分类的帖子不混入" --no-coverage 2>&1 | tail -15
```

Expected: **PASS** with 1 passed。

如果 FAIL：检查 `mockPrisma.post.findMany` 返回的 `categoryId` 字段是否被 service 透传（service 不应修改它）。

---

## Task 6: 跑后端全量单测（确认无回归）

**Files:** 无（仅执行）

- [ ] **Step 1: 跑 PostService 整文件测试**

Run:
```bash
cd backend && npx jest --testPathPattern=post.service.spec.ts --no-coverage 2>&1 | tail -20
```

Expected: 所有 case PASS（应该看到 `Tests: N passed, N total`，N 包括 Task 3/5 新加的 2 个 + 原有所有 case）。

- [ ] **Step 2: 跑后端 build 确认无 TS 错误**

Run:
```bash
cd backend && npm run build 2>&1 | tail -20
```

Expected: 0 errors。如果有 TS 报错，**不要继续**，贴给用户排查。

- [ ] **Step 3: 跑相邻模块的测试（house/secondhand/lifebiz）确认无回归**

Run:
```bash
cd backend && npx jest --testPathPattern="post/(house|secondhand|lifebiz)" --no-coverage 2>&1 | tail -15
```

Expected: 全部 PASS（这些模块本来就用精确匹配，不应受影响）。

---

## Task 7: 浏览器手测（dev 环境验收）

**Files:** 无（仅执行）

- [ ] **Step 1: 启动 dev 后端 + 前端**

如果已经在跑，先重启（确保新代码生效）：

```bash
# 在 backend/ 目录
cd backend && npm run start:dev
# 在另一个终端，frontend/ 目录
cd frontend && npm run dev
```

- [ ] **Step 2: 打开房屋 tab，记下"全部"数字**

浏览器打开 `http://localhost:3000/?type=house`，记下：
- "全部 N" 的 N 值 = A
- 截图保存

- [ ] **Step 3: 依次点 10 个子分类，验证数字加总**

依次点击：二手房 / 新房 / 租房（整租/合租）/ 商铺（出租/出售）/ 写字楼 / 厂房仓库 / 车位车库 / 民宿/短租 / 求租/求购 / 房屋托管/中介

每个 tab 记下数字，**验证**：

```
A == Σ(10 个子分类数字)
```

如果不等：停下来贴给用户，**不要继续**。

- [ ] **Step 4: 验证子分类不串味**

随机点 2 个子分类（如"二手房"和"新房"），目视检查：
- 二手房列表里**不**应出现明显是"租房"的标题（如包含"出租""月租""元/月"）
- 新房列表里**不**应出现"出租"标题

如果出现：停下来贴给用户排查（可能是 seed 数据问题，不一定是修复 bug）。

---

## Task 8: 提交 + 推送 + 提 PR

**Files:** 无（仅执行）

- [ ] **Step 1: 检查 git 状态**

Run:
```bash
cd /e/workspace/yichun-you-shi-er-shuo && git status
```

Expected: 应该有 2-3 个 modified 文件（post.service.ts / post.service.spec.ts / package.json）+ Task 1 已 commit 的 check-orphan-posts.ts（不会出现在 status 里因为已 add 过）。

- [ ] **Step 2: Stage 改动**

Run:
```bash
cd /e/workspace/yichun-you-shi-er-shuo
git add backend/src/modules/post/post.service.ts
git add backend/src/modules/post/post.service.spec.ts
git add backend/package.json
git status
```

Expected: 3 个 modified 已 staged。

- [ ] **Step 3: Commit**

Run:
```bash
cd /e/workspace/yichun-you-shi-er-shuo
git commit -m "fix(post): T-022 移除子分类查询的父分类 fallback

- 让 PostService.findAll 与其他 4 个 type filter service 行为一致（精确匹配）
- 修复首页「全部」≠ 子分类并集的认知错位
- 验收：dev 跑 npm run check:orphan-posts 输出 0 行
- 见 docs/superpowers/specs/2026-07-10-category-tab-exact-match-design.md

Co-Authored-By: Claude <noreply@anthropic.com>"
```

- [ ] **Step 4: Push**

Run:
```bash
cd /e/workspace/yichun-you-shi-er-shuo
git push origin feat/v1.1-batch-seo-async-filter-tests
```

Expected: `* [new branch] ... → feat/v1.1-batch-seo-async-filter-tests`。

- [ ] **Step 5: 在 GitHub 提 PR（可选 / 待用户决定）**

```bash
gh pr create \
  --title "fix(v1.1.1): T-022 Category Tab 精确匹配修复" \
  --body "$(cat <<'EOF'
## 修复

移除 `post.service.ts:79-95` 的父分类 fallback，让首页"全部" tab = 各子分类 tab 的并集（去重）。

## 根因

`findAll` 在请求子分类 id 时用 `OR: [{categoryId: sub.id}, {categoryId: sub.parentId}]` 同时匹配父分类下的"孤儿"帖子，导致：
- 父分类下的孤儿帖会出现在**所有 10 个子分类**里
- "全部"数字与子分类数字加总不一致
- 用户看到"全部 16"，点子分类也能看到不属于该子分类语义的内容

## 改动

- `backend/src/modules/post/post.service.ts` -12 行
- `backend/src/modules/post/post.service.spec.ts` +2 case
- `backend/scripts/check-orphan-posts.ts` 新增（数据前置检查）
- `backend/package.json` +1 npm script

## 验收

- [x] 后端 build + 现有单测全绿
- [x] 新增 2 个 findAll 单测通过
- [x] `check-orphan-posts` 在 dev 输出 0 行
- [x] 浏览器手测：dev 房屋页 `全部 == Σ子分类`

## 影响面

后端唯一一处带 fallback 的地方，其他 4 个 type filter service（HouseService/SecondhandService/LifebizService/SearchService）已经精确匹配，本修复让 findAll 与之对齐。详见 spec §4。

## 回滚

1 行 `git revert`。
EOF
)"
```

Expected: PR URL 输出。

---

## 验收清单（汇总）

- [ ] Task 1: 脚本 + npm script 创建 + commit
- [ ] Task 2: dev 跑检查输出 ✅ 0 行
- [ ] Task 3: 写测试 1，初始 FAIL
- [ ] Task 4: 改 post.service.ts，测试 1 变 PASS
- [ ] Task 5: 写测试 2，PASS
- [ ] Task 6: PostService 整文件测试全 PASS + backend build 0 错
- [ ] Task 7: 浏览器手测 `全部 == Σ子分类`
- [ ] Task 8: commit + push + (可选) PR

---

## 失败模式参考

| 现象 | 原因 | 处理 |
|------|------|------|
| Task 3 测试 FAIL 但 mock 看起来 OK | service 还调了 prisma.category.findUnique（在 cache key 拼接里？） | 检查 post.service.ts:172-178 附近的 cacheKey 是否含 category.parentId |
| Task 6 build 报 BigInt 错误 | `BigInt(categoryId)` 传入了非数字 | 检查 DTO `categoryId` 类型定义 `backend/src/modules/post/dto/list-post.dto.ts` |
| 浏览器看到"全部 16"但子分类加总 18 | 父分类下有孤儿帖子（Task 2 跑脚本应该会看到警告） | 停下，回到 Task 2 处理数据 |
| 浏览器看到"全部 10"但子分类加总 10，子分类里还能看到"出租"标题 | seed 数据问题（与本修复无关） | 贴给用户判断 |
