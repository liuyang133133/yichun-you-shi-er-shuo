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
    { code: 'announcement.create', module: 'announcement', action: 'create', name: '创建公告' },
    { code: 'announcement.update', module: 'announcement', action: 'update', name: '更新公告' },
    { code: 'announcement.delete', module: 'announcement', action: 'delete', name: '删除公告' },
    // Banner
    { code: 'banner.create',      module: 'banner', action: 'create',   name: '创建 Banner' },
    { code: 'banner.update',      module: 'banner', action: 'update',   name: '更新 Banner' },
    { code: 'banner.delete',      module: 'banner', action: 'delete',   name: '删除 Banner' },
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
      'announcement.create', 'announcement.update', 'announcement.delete',
      'banner.create', 'banner.update', 'banner.delete',
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

main()
  .catch((e) => {
    console.error('❌ 播种失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
