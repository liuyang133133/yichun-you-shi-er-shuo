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
    cat_id: bigint;
    cat_code: string;
    cat_name: string;
  }>>`
    SELECT
      p.id, p.title, p.type,
      c.id AS cat_id, c.code AS cat_code, c.name AS cat_name
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
  console.log(`  SELECT id, title, type, category_id FROM posts WHERE category_id IN (${orphans.map(o => o.cat_id).join(',')})`);
  process.exit(1);
}

main()
  .catch((e) => {
    console.error('脚本执行失败：', e);
    process.exit(2);
  })
  .finally(() => prisma.$disconnect());
