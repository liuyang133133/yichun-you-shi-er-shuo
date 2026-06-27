/**
 * 一次性迁移脚本 — 修复历史帖子的 categoryId
 *
 * 问题：seed.ts (修复前) 把测试帖子的 categoryId 挂到了父分类（id 1-4），
 *       而前端 tab 过滤用的是子分类（id 5-29），导致点击子 tab 找不到帖子。
 *
 * 解决：
 *   1. 把所有挂到父分类的帖子迁移到该父分类下第一个子分类
 *   2. 顺便给 job/lifebiz 的其它子分类补几个测试帖子，方便手动验证 tab
 *
 * 用法：npx ts-node prisma/migrate-categories.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 开始迁移帖子 categoryId...');

  // 1) 找出所有顶级分类（parentId = null），按 code 分组
  const topCats = await prisma.category.findMany({
    where: { parentId: null },
    select: { id: true, code: true, name: true },
  });
  console.log(`  顶级分类数: ${topCats.length}`);

  // 2) 对每个顶级分类，把"挂到顶级分类上的帖子"重新分配到第一个子分类
  let migratedCount = 0;
  for (const top of topCats) {
    const firstSub = await prisma.category.findFirst({
      where: { parentId: top.id },
      orderBy: { sortOrder: 'asc' },
    });
    if (!firstSub) {
      console.log(`  ⚠️ ${top.name} (id=${top.id}) 无子分类，跳过`);
      continue;
    }
    const result = await prisma.post.updateMany({
      where: { categoryId: top.id },
      data: { categoryId: firstSub.id },
    });
    if (result.count > 0) {
      console.log(
        `  ✅ ${top.name}: ${result.count} 个帖子从父分类 id=${top.id} → 子分类 ${firstSub.name} (id=${firstSub.id})`,
      );
      migratedCount += result.count;
    }
  }
  console.log(`  共迁移: ${migratedCount} 个帖子`);

  // 3) 补几个 job/lifebiz 子分类的测试帖子
  console.log('📝 补充 job/lifebiz 子分类测试帖子...');

  const testUser = await prisma.user.findFirst({
    where: { phone: '13800000000' },
  });
  if (!testUser) {
    console.log('  ❌ 找不到测试用户，跳过');
    return;
  }

  const extras: Array<{
    type: string;
    subName: string;
    title: string;
    description: string;
    price: number;
    priceUnit: string;
    contactName: string;
    contactPhone: string;
  }> = [
    // job 子分类
    {
      type: 'job',
      subName: '销售/客服',
      title: '招聘：万象城手机店销售 底薪+提成 4000-8000',
      description: '万象城手机店诚招销售，底薪 3000 + 提成 5%，月入 4000-8000。',
      price: 4000,
      priceUnit: '元/月',
      contactName: '陈店长',
      contactPhone: '13800000010',
    },
    {
      type: 'job',
      subName: 'IT/互联网',
      title: '招聘：初级前端开发 5000-7000 双休',
      description: 'Vue/React 经验 1 年以上，五险一金，双休，可远程。',
      price: 6000,
      priceUnit: '元/月',
      contactName: 'HR 王',
      contactPhone: '13800000011',
    },
    // lifebiz 子分类
    {
      type: 'lifebiz',
      subName: '寻人寻物',
      title: '【寻物】丢失一只橘猫 友好区附近 有酬谢',
      description: '6 月 22 日在友好区中央大街走失，脖子上有红色项圈，找到有酬。',
      price: 500,
      priceUnit: '元酬谢',
      contactName: '赵女士',
      contactPhone: '13800000020',
    },
    {
      type: 'lifebiz',
      subName: '打听事',
      title: '【打听】伊美区哪里有教游泳的？小孩初学',
      description: '想给 8 岁孩子找游泳培训班，最好有专业教练，一对一。',
      price: 0,
      priceUnit: '元/次',
      contactName: '周爸爸',
      contactPhone: '13800000021',
    },
    // 二手再补一条
    {
      type: 'secondhand',
      subName: '家居日用',
      title: '【二手】九成新 美的电饭煲 3L 50 元出',
      description: '搬家出，美的电饭煲 3L，用过 3 次，50 元出。',
      price: 50,
      priceUnit: '元',
      contactName: '吴阿姨',
      contactPhone: '13800000030',
    },
  ];

  for (const e of extras) {
    const top = topCats.find((c) => c.code === e.type);
    if (!top) continue;
    const sub = await prisma.category.findFirst({
      where: { parentId: top.id, name: e.subName },
    });
    if (!sub) {
      console.log(`  ⚠️ ${e.type}.${e.subName} 子分类不存在，跳过`);
      continue;
    }
    const exists = await prisma.post.findFirst({ where: { title: e.title } });
    if (exists) {
      console.log(`  ⏭️  帖子已存在: ${e.title.slice(0, 30)}`);
      continue;
    }
    await prisma.post.create({
      data: {
        userId: testUser.id,
        type: e.type,
        categoryId: sub.id,
        title: e.title,
        description: e.description,
        price: e.price,
        priceUnit: e.priceUnit,
        contactName: e.contactName,
        contactPhone: e.contactPhone,
        status: 'active',
        auditStatus: 'passed',
      },
    });
    console.log(`  ✅ 创建: [${e.type}.${e.subName}] ${e.title.slice(0, 30)}`);
  }

  // 4) 汇总
  console.log('📊 当前各类型帖子数：');
  for (const t of ['house', 'secondhand', 'job', 'lifebiz'] as const) {
    const count = await prisma.post.count({
      where: { type: t, status: 'active', auditStatus: 'passed' },
    });
    console.log(`  - ${t}: ${count}`);
  }
  console.log('✨ 迁移完成！');
}

main()
  .catch((e) => {
    console.error('❌ 迁移失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
