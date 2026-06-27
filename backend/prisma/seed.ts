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
      // —— 差异化新分类（邻里/社区属性） ——
      { name: '小区互助', sortOrder: 8 },
      { name: '邻居拼车', sortOrder: 9 },
      { name: '本地爆料', sortOrder: 10 },
      { name: '季节特产', sortOrder: 11 }, // 山野菜/蘑菇/坚果/雪地胎
      { name: '其他', sortOrder: 99 },
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
  // [Bug fix] 测试帖子必须挂在子分类上（id 5-29），不能挂在父分类（id 1-4）
  // 否则前端 tab 过滤时会找不到（修复前 bug）
  const houseSub = await prisma.category.findFirst({
    where: { code: 'house', parentId: { not: null }, name: '整租' },
  });
  const secondhandSub = await prisma.category.findFirst({
    where: { code: 'secondhand', parentId: { not: null }, name: '数码电器' },
  });
  const jobSub = await prisma.category.findFirst({
    where: { code: 'job', parentId: { not: null }, name: '餐饮/酒店' },
  });
  const lifebizSub = await prisma.category.findFirst({
    where: { code: 'lifebiz', parentId: { not: null }, name: '顺风车' },
  });

  const samplePosts = [
    {
      type: 'house',
      categoryId: houseSub!.id,
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
      categoryId: secondhandSub!.id,
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
      categoryId: jobSub!.id,
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
      categoryId: lifebizSub!.id,
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

  // ============================================
  // T-002: 6. RBAC 角色 / 权限 / 关联
  // ============================================
  await seedRbac();

  // ============================================
<<<<<<< HEAD
  // T-013: 7. 标签字典（30 个伊春本地常用标签）
  // ============================================
  await seedTags();
}

/**
 * T-013: 种子 30 个伊春本地常用标签
 * 幂等：多次运行不会重复插入
 */
async function seedTags() {
  console.log('  🏷️  创建标签字典...');

  const tags = [
    // 季节频道（4）
    { slug: 'shan-ye-cai', name: '山野菜', description: '春季山野菜：蕨菜、刺老芽、猴腿等', isHot: true, sortOrder: 1 },
    { slug: 'xue-di-tai', name: '雪地胎', description: '冬季雪地胎 / 防滑链', isHot: true, sortOrder: 2 },
    { slug: 'bi-shu-fang', name: '避暑房', description: '夏季避暑房 / 短期出租', isHot: true, sortOrder: 3 },
    { slug: 'dong-jiang-yu', name: '冬江鱼', description: '冬季黑龙江冰下捕鱼', isHot: true, sortOrder: 4 },

    // 本地特产（6）
    { slug: 'hei-zhong-cai', name: '黑尊菜', description: '伊春特有山野菜', sortOrder: 10 },
    { slug: 'hong-song-jie', name: '红松节', description: '伊春红松松子 / 松塔', sortOrder: 11 },
    { slug: 'ma-mao-jiu', name: '马毛酒', description: '东北鹿茸 / 林下参酒', sortOrder: 12 },
    { slug: 'lin-quan-shui', name: '林泉水', description: '山泉水 / 矿泉水', sortOrder: 13 },
    { slug: 'bei-yao-cao', name: '北药草', description: '刺五加 / 五味子 / 黄芪', sortOrder: 14 },
    { slug: 'shan-lin-te-chan', name: '山林特产', description: '伊春本地山林特产合集', isHot: true, sortOrder: 15 },

    // 房屋出租（4）
    { slug: 'zheng-zu', name: '整租', description: '整套出租', sortOrder: 20 },
    { slug: 'he-zu', name: '合租', description: '合租 / 拼房', sortOrder: 21 },
    { slug: 'duan-zu', name: '短租', description: '周租 / 月租', sortOrder: 22 },
    { slug: 'dian-shang', name: '店商', description: '商铺 / 门面出租', sortOrder: 23 },

    // 二手交易（4）
    { slug: 'jia-dian', name: '家电', description: '二手家电', sortOrder: 30 },
    { slug: 'shu-zi', name: '数码', description: '手机 / 电脑 / 相机', sortOrder: 31 },
    { slug: 'jia-ju', name: '家具', description: '二手家具', sortOrder: 32 },
    { slug: 'er-tong-yong-pin', name: '儿童用品', description: '母婴 / 儿童用品', sortOrder: 33 },

    // 招聘（4）
    { slug: 'lin-ye', name: '林业', description: '林业相关岗位', sortOrder: 40 },
    { slug: 'lv-you', name: '旅游', description: '导游 / 酒店 / 餐饮', sortOrder: 41 },
    { slug: 'jia-jiao', name: '家教', description: '中小学家教', sortOrder: 42 },
    { slug: 'jian-zhi', name: '兼职', description: '兼职 / 钟点工', sortOrder: 43 },

    // 便民（4）
    { slug: 'shou-jiang', name: '收江', description: '收购山产品', sortOrder: 50 },
    { slug: 'qi-che', name: '汽车', description: '二手车 / 二手车 / 汽修', sortOrder: 51 },
    { slug: 'chong-wu', name: '宠物', description: '宠物交易 / 寄养', sortOrder: 52 },
    { slug: 'shi-zhong', name: '失物', description: '失物招领', sortOrder: 53 },

    // 综合（4）
    { slug: 'yu-le', name: '娱乐', description: 'K歌 / 桌游 / 密室', sortOrder: 60 },
    { slug: 'ti-yu', name: '体育', description: '健身 / 球类 / 游泳', sortOrder: 61 },
    { slug: 'jiao-yu', name: '教育', description: '培训 / 考证 / 留学', sortOrder: 62 },
    { slug: 'yi-liao', name: '医疗', description: '门诊 / 药店 / 健康', sortOrder: 63 },
  ];

  let created = 0;
  for (const t of tags) {
    const exists = await prisma.tag.findUnique({ where: { slug: t.slug } });
    if (exists) continue;
    await prisma.tag.create({ data: { ...t, useCount: 0, isHot: t.isHot ?? false } });
    created++;
  }
  console.log(`  - 标签: 总 ${tags.length} 个 / 新增 ${created} 个`);
=======
  // T-018: 7. 协议（terms / privacy / about）
  // ============================================
  await seedAgreements();
>>>>>>> feature/T-018-agreements
}

/**
 * T-002: 种子 5 个预置角色 + 30+ 权限码 + 角色-权限关联
 * 幂等：多次运行不会重复插入
 */
async function seedRbac() {
  console.log('  🔐 创建 RBAC 角色 / 权限...');

  // ---- 5 个预置角色 ----
  const systemRoles = [
    { code: 'super_admin',      name: '超级管理员', description: '系统全部权限', sortOrder: 1 },
    { code: 'content_auditor',  name: '内容审核员', description: '帖子 / 评论 / 举报', sortOrder: 2 },
    { code: 'customer_service', name: '客服',       description: '用户咨询 / 申诉', sortOrder: 3 },
    { code: 'finance',          name: '财务',       description: '订单 / 退款 / 钱包', sortOrder: 4 },
    { code: 'operator',         name: '运营',       description: 'Banner / 公告 / 推送', sortOrder: 5 },
  ];

  for (const r of systemRoles) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description, sortOrder: r.sortOrder, isSystem: true },
      create: { ...r, isSystem: true, status: 1 },
    });
  }

  // ---- 30+ 权限码（按模块分组）----
  const allPermissions = [
    // 帖子（post）
    { code: 'post.view',          module: 'post', action: 'view',       name: '查看帖子' },
    { code: 'post.audit.pass',    module: 'post', action: 'audit.pass', name: '审核通过帖子' },
    { code: 'post.audit.reject',  module: 'post', action: 'audit.reject', name: '审核拒绝帖子' },
    { code: 'post.audit.batch',   module: 'post', action: 'audit.batch', name: '批量审核帖子' },
    { code: 'post.offline',       module: 'post', action: 'offline',    name: '强制下架' },
    { code: 'post.offline.batch', module: 'post', action: 'offline.batch', name: '批量下架' },
    { code: 'post.restore',       module: 'post', action: 'restore',    name: '恢复已删帖子' },
    { code: 'post.purge',         module: 'post', action: 'purge',      name: '硬清已删帖子' },
    // 评论（comment）
    { code: 'comment.view',       module: 'comment', action: 'view',    name: '查看评论' },
    { code: 'comment.delete',     module: 'comment', action: 'delete',  name: '删除评论' },
    // 举报（report）
    { code: 'report.view',        module: 'report', action: 'view',     name: '查看举报' },
    { code: 'report.handle',      module: 'report', action: 'handle',   name: '处理举报' },
    // 用户（user）
    { code: 'user.view',          module: 'user', action: 'view',       name: '查看用户' },
    { code: 'user.ban',           module: 'user', action: 'ban',        name: '封禁用户' },
    { code: 'user.unban',         module: 'user', action: 'unban',      name: '解封用户' },
    { code: 'user.viewRoles',     module: 'user', action: 'viewRoles',  name: '查看用户角色' },
    { code: 'user.assignRole',    module: 'user', action: 'assignRole', name: '分配用户角色' },
    // 角色（role）
    { code: 'role.view',          module: 'role', action: 'view',       name: '查看角色' },
    { code: 'role.create',        module: 'role', action: 'create',     name: '创建角色' },
    { code: 'role.update',        module: 'role', action: 'update',     name: '更新角色' },
    { code: 'role.delete',        module: 'role', action: 'delete',     name: '删除角色' },
    // 权限（permission）
    { code: 'permission.view',    module: 'permission', action: 'view', name: '查看权限' },
    // 公告（announcement）
    { code: 'announcement.view',   module: 'announcement', action: 'view',   name: '查看公告' },
    { code: 'announcement.create', module: 'announcement', action: 'create', name: '创建公告' },
    { code: 'announcement.update', module: 'announcement', action: 'update', name: '更新公告' },
    { code: 'announcement.delete', module: 'announcement', action: 'delete', name: '删除公告' },
    // T-019: 恢复公告（与 post.restore 平行）
    { code: 'announcement.restore', module: 'announcement', action: 'restore', name: '恢复公告' },
    // Banner
    { code: 'banner.view',        module: 'banner', action: 'view',    name: '查看 Banner' },
    { code: 'banner.create',      module: 'banner', action: 'create',   name: '创建 Banner' },
    { code: 'banner.update',      module: 'banner', action: 'update',   name: '更新 Banner' },
    { code: 'banner.delete',      module: 'banner', action: 'delete',   name: '删除 Banner' },
    // T-020: 恢复 Banner（与 announcement.restore 平行）
    { code: 'banner.restore',     module: 'banner', action: 'restore',  name: '恢复 Banner' },
    // 分类 (T-003)
    { code: 'category.view',      module: 'category', action: 'view',    name: '查看分类' },
    { code: 'category.create',    module: 'category', action: 'create',  name: '创建分类' },
    { code: 'category.update',    module: 'category', action: 'update',  name: '更新分类' },
    { code: 'category.delete',    module: 'category', action: 'delete',  name: '删除分类' },
    // 公司 (T-003)
    { code: 'company.view',       module: 'company',  action: 'view',    name: '查看公司' },
    { code: 'company.verify',     module: 'company',  action: 'verify',  name: '认证公司' },
    { code: 'company.unverify',   module: 'company',  action: 'unverify', name: '取消公司认证' },
    // 日志
    { code: 'auditLog.view',      module: 'auditLog', action: 'view',   name: '查看操作日志' },
    { code: 'loginLog.view',      module: 'loginLog', action: 'view',   name: '查看登录日志' },
    { code: 'aiUsage.view',       module: 'aiUsage',  action: 'view',   name: '查看 AI 用量' },
    // 仪表盘
    { code: 'dashboard.view',     module: 'dashboard', action: 'view',  name: '查看仪表盘' },
  ];

  for (const p of allPermissions) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, module: p.module, action: p.action },
      create: p,
    });
  }

  // ---- 角色-权限关联 ----
  // super_admin: 全部
  // content_auditor: post.* + comment.* + report.*
  // customer_service: post.view + comment.* + report.* + user.view
  // finance: 暂未实现订单/钱包，预留为 post.view + dashboard.view
  // operator: post.view + announcement.* + banner.* + dashboard.view
  const rolePermissionMap: Record<string, string[]> = {
    super_admin: allPermissions.map((p) => p.code),
    content_auditor: [
      'post.view', 'post.audit.pass', 'post.audit.reject', 'post.audit.batch',
      'post.offline', 'post.offline.batch', 'post.restore',
      'comment.view', 'comment.delete',
      'report.view', 'report.handle',
      'dashboard.view',
    ],
    customer_service: [
      'post.view',
      'comment.view', 'comment.delete',
      'report.view', 'report.handle',
      'user.view',
      'dashboard.view',
    ],
    finance: [
      'post.view',
      'dashboard.view',
    ],
    operator: [
      'post.view',
      'announcement.view', 'announcement.create', 'announcement.update', 'announcement.delete', 'announcement.restore',
      'banner.view', 'banner.create', 'banner.update', 'banner.delete', 'banner.restore',
      'category.view', 'category.create', 'category.update', 'category.delete',
      'dashboard.view',
      'aiUsage.view',
    ],
  };

  for (const [roleCode, permCodes] of Object.entries(rolePermissionMap)) {
    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) continue;
    for (const code of permCodes) {
      const perm = await prisma.permission.findUnique({ where: { code } });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  console.log(`  - 角色: ${systemRoles.length} 个, 权限: ${allPermissions.length} 个`);
}

// =====================================================
// T-018: 用户协议 / 隐私政策 / 关于我们 初始版本
// =====================================================

const AGREEMENTS_SEED: Array<{
  key: 'terms' | 'privacy' | 'about';
  title: string;
  content: string;
}> = [
  {
    key: 'terms',
    title: '伊春有事儿说 用户服务协议',
    content: `# 伊春有事儿说 用户服务协议

**版本**：v1.0
**生效日期**：2026 年 6 月 26 日

## 一、服务说明

伊春有事儿说（以下简称"本平台"）是面向黑龙江省伊春市本地居民的信息发布与生活服务平台，提供房屋出租、二手交易、招聘求职、便民信息等分类信息发布与浏览服务。

## 二、用户行为规范

使用本平台时，您承诺：

1. **真实信息**：发布信息时提供真实、准确、有效的联系方式与内容描述。
2. **合法合规**：所发布内容不得违反中华人民共和国法律、行政法规，不得含有：
   - 反对宪法所确定的基本原则的内容
   - 危害国家安全、泄露国家秘密、颠覆国家政权、破坏国家统一的内容
   - 损害国家荣誉和利益的内容
   - 煽动民族仇恨、民族歧视、破坏民族团结的内容
3. **禁止内容**：不得发布虚假信息、垃圾广告、色情低俗、暴力血腥、侵权抄袭等内容。
4. **尊重他人**：不得侮辱、诽谤他人，不得侵害他人合法权益。
5. **账号安全**：妥善保管账号与密码，不得将账号出借、转让。

## 三、信息审核

本平台对所有发布信息进行审核：

- 机器审核：发布时自动检测敏感词、违法违规内容。
- 人工审核：涉及招聘、房产等高风险类目由人工复核。
- 处理措施：违规信息将被下架，情节严重者将被封禁账号。

## 四、隐私保护

我们严格遵守《中华人民共和国个人信息保护法》：

- 收集信息：我们仅收集提供服务所必需的信息（手机号、发布内容等）。
- 信息使用：仅用于信息发布、身份验证、安全风控，不用于其他商业用途。
- 信息共享：除法律要求外，不会向第三方共享您的个人信息。
- 信息安全：采用加密存储、传输等安全措施保护您的信息。

## 五、免责声明

1. 本平台仅提供信息发布与浏览服务，不参与任何具体交易。
2. 用户应自行判断信息真实性与可靠性，本平台不承担因用户之间交易产生的纠纷责任。
3. 因不可抗力（系统维护、网络中断等）导致的服务中断，本平台不承担责任。

## 六、协议变更

本平台有权根据法律法规变更或业务调整修改本协议，修改后将在本页面公布。继续使用服务即视为接受修改后的协议。

## 七、联系我们

如有疑问，请通过站内"意见反馈"或客服邮箱联系我们。`,
  },
  {
    key: 'privacy',
    title: '伊春有事儿说 隐私政策',
    content: `# 伊春有事儿说 隐私政策

**版本**：v1.0
**生效日期**：2026 年 6 月 26 日
**更新日期**：2026 年 6 月 26 日

## 一、引言

伊春有事儿说（以下简称"我们"）深知个人信息对您的重要性，我们将按照法律法规要求，采取相应安全保护措施，致力于保护您的个人信息安全可控。鉴于此，我们制定本《隐私政策》并提示：

在使用我们的服务前，请您务必仔细阅读并透彻理解本政策，在确认充分理解并同意后再开始使用。

## 二、我们如何收集和使用您的个人信息

### 2.1 注册账号

当您注册伊春有事儿说账号时，我们会收集您的**手机号码**用于身份验证。我们不会收集与服务无关的信息。

### 2.2 信息发布

当您发布房屋、二手、招聘、便民信息时，我们会收集您主动填写的内容（标题、描述、价格、图片等）以及您选择填写的**联系信息**（手机号、微信号等）。

### 2.3 设备与日志信息

为保障服务安全，我们会收集：
- 设备信息（设备型号、操作系统版本、设备识别码）
- 网络信息（IP 地址、网络类型）
- 日志信息（访问时间、访问页面、操作行为）

## 三、我们如何共享、转让、公开披露您的个人信息

### 3.1 共享

我们**不会**与任何第三方公司、组织和个人共享您的个人信息，但以下情况除外：
- 获得您的明确同意后
- 根据法律法规或政府主管部门要求
- 为实现平台核心功能必需的共享（如支付时向微信/支付宝提供必要信息）

### 3.2 转让

我们不会将您的个人信息转让给任何公司、组织和个人。

### 3.3 公开披露

我们不会公开披露您的个人信息，但您主动公开的信息（如发布的信息内容）除外。

## 四、您的权利

您对自己的个人信息享有以下权利：

1. **查询**：您可以查看自己的个人信息与发布记录。
2. **更正**：您可以修改不准确的个人信息。
3. **删除**：您可以删除已发布的信息或申请注销账号。
4. **撤回同意**：您可以撤回对某些个人信息处理的同意。

## 五、本政策如何更新

本政策可能根据业务调整、法律法规变化进行修订。修订后我们会通过站内通知等方式告知您。

## 六、联系我们

如您对本政策或您的个人信息保护有任何疑问、意见或建议，请通过站内反馈或客服邮箱联系我们。`,
  },
  {
    key: 'about',
    title: '关于 伊春有事儿说',
    content: `# 关于 伊春有事儿说

> 伊春本地生活信息平台 · 让伊春生活更便捷

## 我们的使命

为伊春本地居民打造一个**真实、可靠、便捷**的本地生活信息平台，让找房子、卖二手、找工作、寻便民服务变得更简单。

## 平台简介

**伊春有事儿说**（域名 yichun.com）成立于 2026 年，是面向黑龙江省伊春市及周边县区的本地分类信息平台。

### 四大核心模块

| 模块 | 说明 |
|---|---|
| 🏠 **房屋** | 房屋出租、二手房出售、合租、短租 |
| 🛍️ **二手** | 二手物品转让、求购信息 |
| 💼 **招聘** | 求职简历、招聘信息 |
| 📌 **便民** | 维修、家政、搬家、教育培训等本地服务 |

### 平台特点

- ✅ **真实信息**：手机号 + 实名认证，确保信息发布者真实可信
- ✅ **本地优先**：专注于伊春本地，不做全国通用平台
- ✅ **安全可靠**：所有信息经机器 + 人工双重审核
- ✅ **操作便捷**：手机一键发布，AI 智能填写

## 联系我们

- **客服邮箱**：support@yichun.com
- **意见反馈**：站内"意见反馈"入口
- **商务合作**：bd@yichun.com

## 加入我们

我们是一个小而美的本地团队，正在寻找对本地生活平台有热情的产品 / 工程同学加入。

> 🌲 Made with ❤️ in 小兴安岭`,
  },
];

async function seedAgreements() {
  console.log('  📜 创建协议（terms / privacy / about）...');

  // 取一个 admin 作为 createdBy
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  const adminId = admin?.id;

  const now = new Date();
  for (const item of AGREEMENTS_SEED) {
    const existing = await prisma.agreement.findFirst({
      where: { key: item.key, version: 1 },
    });
    if (existing) {
      // 已存在：仅在内容不同时更新（用于 re-seed）
      if (existing.content !== item.content) {
        await prisma.agreement.update({
          where: { id: existing.id },
          data: { content: item.content, title: item.title, updatedBy: adminId },
        });
      }
      continue;
    }
    await prisma.agreement.create({
      data: {
        key: item.key,
        version: 1,
        title: item.title,
        content: item.content,
        effectiveAt: now,
        isCurrent: true,
        createdBy: adminId,
      },
    });
  }

  console.log(`  - 协议: ${AGREEMENTS_SEED.length} 个`);
}

main()
  .catch((e) => {
    console.error('❌ 播种失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
