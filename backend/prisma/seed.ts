/**
 * Prisma 种子数据
 * 运行: npx prisma db seed
 * 或:   npm run prisma:seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始播种...');

  // ============================================
  // 1. 分类数据
  // ============================================
  console.log('  📁 创建分类...');

  // 顶级分类
  const topCategories = [
    { code: 'house', name: '房屋出租', icon: '🏠', sortOrder: 1 },
    { code: 'secondhand', name: '二手交易', icon: '🛍️', sortOrder: 2 },
    { code: 'job', name: '招聘求职', icon: '💼', sortOrder: 3 },
    { code: 'lifebiz', name: '便民信息', icon: '📌', sortOrder: 4 },
  ];

  const createdTopCats: Record<string, bigint> = {};

  for (const cat of topCategories) {
    const existing = await prisma.category.findFirst({
      where: { code: cat.code, parentId: 0 },
    });
    const created = existing ?? (await prisma.category.create({
      data: {
        parentId: null,
        code: cat.code,
        name: cat.name,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
        status: 1,
      },
    }));
    createdTopCats[cat.code] = created.id;
  }

  // 子分类
  const subCategories: Record<string, Array<{ name: string; sortOrder: number }>> = {
    house: [
      { name: '整租', sortOrder: 1 },
      { name: '合租', sortOrder: 2 },
      { name: '短租/日租', sortOrder: 3 },
      { name: '商铺/写字楼', sortOrder: 4 },
    ],
    secondhand: [
      { name: '数码电器', sortOrder: 1 },
      { name: '家居日用', sortOrder: 2 },
      { name: '服饰鞋包', sortOrder: 3 },
      { name: '图书音像', sortOrder: 4 },
      { name: '母婴玩具', sortOrder: 5 },
      { name: '其他', sortOrder: 6 },
    ],
    job: [
      { name: '销售/客服', sortOrder: 1 },
      { name: '餐饮/酒店', sortOrder: 2 },
      { name: '家政/保洁', sortOrder: 3 },
      { name: '司机/物流', sortOrder: 4 },
      { name: 'IT/互联网', sortOrder: 5 },
      { name: '教育/培训', sortOrder: 6 },
      { name: '其他', sortOrder: 7 },
    ],
    lifebiz: [
      { name: '顺风车', sortOrder: 1 },
      { name: '打听事', sortOrder: 2 },
      { name: '寻人寻物', sortOrder: 3 },
      { name: '家政服务', sortOrder: 4 },
      { name: '装修维修', sortOrder: 5 },
      { name: '宠物', sortOrder: 6 },
      { name: '婚恋交友', sortOrder: 7 },
      { name: '其他', sortOrder: 8 },
    ],
  };

  for (const [code, subs] of Object.entries(subCategories)) {
    for (const sub of subs) {
      const existing = await prisma.category.findFirst({
        where: { code, name: sub.name, parentId: createdTopCats[code] },
      });
      if (!existing) {
        await prisma.category.create({
          data: {
            parentId: createdTopCats[code],
            code,
            name: sub.name,
            sortOrder: sub.sortOrder,
            status: 1,
          },
        });
      }
    }
  }

  // ============================================
  // 2. 测试用户
  // ============================================
  console.log('  👤 创建测试用户...');
  const testUser = await prisma.user.upsert({
    where: { phone: '13800000000' },
    update: {},
    create: {
      phone: '13800000000',
      nickname: '测试用户',
      avatar: null,
      gender: 1,
      bio: '我是测试账号',
      status: 0,
    },
  });

  // ============================================
  // 3. 测试信息
  // ============================================
  console.log('  📝 创建测试信息...');
  const houseCatId = await prisma.category.findFirst({
    where: { code: 'house', parentId: null },
  });
  const secondhandCatId = await prisma.category.findFirst({
    where: { code: 'secondhand', parentId: null },
  });
  const jobCatId = await prisma.category.findFirst({
    where: { code: 'job', parentId: null },
  });
  const lifebizCatId = await prisma.category.findFirst({
    where: { code: 'lifebiz', parentId: null },
  });

  const samplePosts = [
    {
      type: 'house',
      categoryId: houseCatId!.id,
      title: '【伊美区】万象城精装两室出租 拎包入住',
      description: '南北通透，家具家电齐全，拎包入住，靠近万象城商圈，生活便利。',
      price: 1800,
      priceUnit: '元/月',
      contactName: '王先生',
      contactPhone: '13800000001',
      status: 'active',
      auditStatus: 'passed',
    },
    {
      type: 'secondhand',
      categoryId: secondhandCatId!.id,
      title: '九成新 iPhone 15 Pro 256G 自用出售',
      description: '自用半年，配件齐全，无磕碰，可面交验机。',
      price: 5800,
      priceUnit: '元',
      contactName: '李女士',
      contactPhone: '13800000002',
      status: 'active',
      auditStatus: 'passed',
    },
    {
      type: 'job',
      categoryId: jobCatId!.id,
      title: '招聘：连锁餐厅服务员 5000-6000/月',
      description: '招聘连锁餐厅服务员，月休 4 天，包工作餐，有晋升空间。',
      price: 6000,
      priceUnit: '元/月',
      contactName: '张经理',
      contactPhone: '13800000003',
      status: 'active',
      auditStatus: 'passed',
    },
    {
      type: 'lifebiz',
      categoryId: lifebizCatId!.id,
      title: '【顺风车】伊春→哈尔滨 明早出发 还有 2 座位',
      description: '明早 7 点从伊美区出发，目的地哈尔滨，可拼车 2 人。',
      price: 80,
      priceUnit: '元/人',
      contactName: '刘师傅',
      contactPhone: '13800000004',
      status: 'active',
      auditStatus: 'passed',
    },
  ];

  for (const post of samplePosts) {
    const exists = await prisma.post.findFirst({
      where: { title: post.title },
    });
    if (!exists) {
      await prisma.post.create({
        data: {
          userId: testUser.id,
          ...post,
        },
      });
    }
  }

  console.log('✅ 播种完成！');
  console.log(`  - 顶级分类: ${topCategories.length}`);
  console.log(`  - 子分类: ${Object.values(subCategories).reduce((s, a) => s + a.length, 0)}`);
  console.log(`  - 测试用户: 1`);
  console.log(`  - 测试信息: ${samplePosts.length}`);

  // ============================================
  // 4. 区域数据（伊春市 + 12 区县 + 主要街道）
  // ============================================
  console.log('  🗺️  创建区域...');

  // 顶级：伊春市
  const yichunCity = await prisma.area.upsert({
    where: { id: BigInt(1) }, // 第一次靠 upsert by id；如果非空则跳过
    update: {},
    create: {
      id: BigInt(1),
      parentId: null,
      name: '伊春市',
      level: 1,
      adCode: '230700',
      sortOrder: 1,
    },
  }).catch(async () => {
    return prisma.area.create({
      data: {
        parentId: null,
        name: '伊春市',
        level: 1,
        adCode: '230700',
        sortOrder: 1,
      },
    });
  });

  // 区县（12 个）
  const districts = [
    { name: '伊美区', adCode: '230702', sortOrder: 1 },
    { name: '南岔县', adCode: '230722', sortOrder: 2 },
    { name: '友好区', adCode: '230703', sortOrder: 3 },
    { name: '红星区', adCode: '230704', sortOrder: 4 },
    { name: '西林区', adCode: '230705', sortOrder: 5 },
    { name: '金林区', adCode: '230706', sortOrder: 6 },
    { name: '乌翠区', adCode: '230707', sortOrder: 7 },
    { name: '汤旺县', adCode: '230723', sortOrder: 8 },
    { name: '嘉荫县', adCode: '230724', sortOrder: 9 },
    { name: '大箐山县', adCode: '230725', sortOrder: 10 },
    { name: '丰林县', adCode: '230726', sortOrder: 11 },
    { name: '铁力市', adCode: '230781', sortOrder: 12 },
  ];

  const createdDistricts: Record<string, bigint> = {};
  for (const d of districts) {
    const existing = await prisma.area.findFirst({
      where: { parentId: yichunCity.id, name: d.name },
    });
    const created = existing ?? (await prisma.area.create({
      data: {
        parentId: yichunCity.id,
        name: d.name,
        level: 2,
        adCode: d.adCode,
        sortOrder: d.sortOrder,
      },
    }));
    createdDistricts[d.name] = created.id;
  }

  // 主要街道（仅给核心区县加几个代表性街道，V1 阶段够用）
  const streets: Record<string, Array<{ name: string; sortOrder: number }>> = {
    '伊美区': [
      { name: '旭日街道', sortOrder: 1 },
      { name: '红升街道', sortOrder: 2 },
      { name: '前进街道', sortOrder: 3 },
      { name: '朝阳街道', sortOrder: 4 },
    ],
    '南岔县': [
      { name: '南岔镇', sortOrder: 1 },
      { name: '晨明镇', sortOrder: 2 },
    ],
    '友好区': [
      { name: '友好街道', sortOrder: 1 },
      { name: '双子河街道', sortOrder: 2 },
    ],
    '红星区': [
      { name: '红星街道', sortOrder: 1 },
    ],
    '西林区': [
      { name: '西林街道', sortOrder: 1 },
      { name: '苔青街道', sortOrder: 2 },
    ],
    '金林区': [
      { name: '金山屯镇', sortOrder: 1 },
      { name: '西林镇', sortOrder: 2 },
    ],
    '铁力市': [
      { name: '铁力镇', sortOrder: 1 },
      { name: '双丰镇', sortOrder: 2 },
      { name: '桃山镇', sortOrder: 3 },
    ],
  };

  let streetCount = 0;
  for (const [districtName, list] of Object.entries(streets)) {
    const parentId = createdDistricts[districtName];
    if (!parentId) continue;
    for (const s of list) {
      const existing = await prisma.area.findFirst({
        where: { parentId, name: s.name },
      });
      if (!existing) {
        await prisma.area.create({
          data: {
            parentId,
            name: s.name,
            level: 3,
            sortOrder: s.sortOrder,
          },
        });
        streetCount++;
      }
    }
  }

  console.log(`  - 区域: 1 市 + ${districts.length} 区县 + ${streetCount} 街道`);
}

main()
  .catch((e) => {
    console.error('❌ 播种失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
