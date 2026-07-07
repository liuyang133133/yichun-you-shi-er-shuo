/**
 * Prisma 种子数据
 * 运行: npx prisma db seed
 * 或:   npm run prisma:seed
 */
import { PrismaClient } from '@prisma/client';

// =====================================================
// T-P15-02 V1: SEO TDK 种子数据（独立常量，便于 PM 调整文案）
// =====================================================

/** 顶级分类 SEO（4 条） */
const TOP_CATEGORY_SEO = [
  {
    code: 'house',
    slug: 'house',
    seoTitle: '伊春房屋出租 - 整租/合租/短租/商铺真实房源 | 伊春有事儿说',
    seoKeywords: '伊春租房,伊春房屋出租,伊春合租,伊春短租,小兴安岭租房,伊美区租房',
    seoDescription:
      '伊春本地房屋出租信息平台，提供伊美区、南岔县、友好区、铁力市等区县整租、合租、短租、商铺写字楼真实房源，每日更新，免费看房电话。',
  },
  {
    code: 'secondhand',
    slug: 'secondhand',
    seoTitle: '伊春二手交易 - 二手家电/数码/家具/母婴玩具转让 | 伊春有事儿说',
    seoKeywords:
      '伊春二手,伊春二手市场,二手家电,二手数码,二手家具,伊春二手物品',
    seoDescription:
      '伊春本地二手交易平台，手机数码、家居家电、服饰鞋包、母婴玩具等二手物品本地免费转让，本地当面交易，避免运费纠纷。',
  },
  {
    code: 'job',
    slug: 'job',
    seoTitle: '伊春招聘求职 - 销售/餐饮/IT/家政/司机真实岗位 | 伊春有事儿说',
    seoKeywords:
      '伊春招聘,伊春找工作,伊春求职,小兴安岭招聘,伊春兼职,伊春企业直招',
    seoDescription:
      '伊春本地招聘信息，涵盖销售客服、餐饮酒店、IT互联网、家政保洁、司机物流、教育培训等岗位，本地企业直招，简历置顶提升面试率。',
  },
  {
    code: 'lifebiz',
    slug: 'lifebiz',
    seoTitle: '伊春便民信息 - 顺风车/家政/装修/宠物/邻里互助 | 伊春有事儿说',
    seoKeywords:
      '伊春便民,伊春顺风车,伊春家政,伊春装修,伊春宠物,伊春邻里,伊春寻人',
    seoDescription:
      '伊春本地便民服务平台，提供顺风车、家政、装修、宠物、寻人寻物、邻里互助等社区生活信息，伊春人自己的邻里圈。',
  },
  // F-2: 5 个伊春本地刚需分类（P0-BUG 修复，详见业务审计 §3.1-BUG-P0-03）
  {
    code: 'carpool',
    slug: 'carpool',
    seoTitle: '伊春拼车顺风车 - 跨县拼车/同城拼车/上下班通勤 | 伊春有事儿说',
    seoKeywords:
      '伊春拼车,伊春顺风车,伊春拼车群,伊美区拼车,南岔拼车,友好拼车,跨县拼车,通勤拼车',
    seoDescription:
      '伊春本地拼车顺风车信息平台，提供伊美区、南岔、友好、铁力等区县跨县拼车、同城拼车、长途拼车、上下班通勤拼车，本地真实车主，绿色出行。',
  },
  {
    code: 'lostfound',
    slug: 'lostfound',
    seoTitle: '伊春失物招领 - 寻物启事/拾物招领/寻宠寻人 | 伊春有事儿说',
    seoKeywords:
      '伊春失物招领,伊春寻物,伊春拾物,伊春寻宠,伊春寻人,伊春寻狗,伊春寻猫',
    seoDescription:
      '伊春本地失物招领平台，提供寻物启事、拾物招领、寻宠启事、寻人启事，本地发布、传播更快，找回失物成功率更高。',
  },
  {
    code: 'contact',
    slug: 'contact',
    seoTitle: '伊春便民电话 - 供暖供水/物业维修/派出所/医院 | 伊春有事儿说',
    seoKeywords:
      '伊春便民电话,伊春供暖电话,伊春供水电话,伊春物业电话,伊春派出所电话,伊春医院电话',
    seoDescription:
      '伊春本地便民电话薄，汇集供暖供水、物业维修、派出所、医院学校、政府服务等常用电话，本地号码本地查，一键拨打。',
  },
  {
    code: 'forestry',
    slug: 'forestry',
    seoTitle: '伊春林下经济 - 蓝莓/木耳/松子/榛子/蘑菇/林下参 | 伊春有事儿说',
    seoKeywords:
      '伊春林下经济,伊春蓝莓,伊春木耳,伊春松子,伊春榛子,伊春蘑菇,伊春林下参,小兴安岭特产',
    seoDescription:
      '伊春林下经济特产平台，伊春本地蓝莓、木耳、松子、榛子、蘑菇、林下参、中药材等小兴安岭特产供应、求购、批发信息。',
  },
  {
    code: 'dating',
    slug: 'dating',
    seoTitle: '伊春同城交友 - 同城活动/兴趣交友/相亲征婚/体育运动 | 伊春有事儿说',
    seoKeywords:
      '伊春交友,伊春相亲,伊春同城活动,伊春兴趣交友,伊春体育运动,伊春征婚',
    seoDescription:
      '伊春本地同城交友平台，组织同城活动、兴趣交友、相亲征婚、体育运动等线下聚会，伊春人认识伊春人。',
  },
] as const;

/**
 * 子分类 slug 映射
 * - house/secondhand/job/lifebiz 4 主顶级在 V1.0 重整中：key 改为 子 code（稳定标识）
 * - F-2 的 5 个本地分类保留旧 name-keyed 映射（不动）
 */
const SUB_CATEGORY_SLUGS: Record<string, Record<string, string>> = {
  house: {
    'house-second-hand': 'house-second-hand',
    'house-new':         'house-new',
    'house-rental':      'house-rental',
    'house-shop':        'house-shop',
    'house-office':      'house-office',
    'house-warehouse':   'house-warehouse',
    'house-parking':     'house-parking',
    'house-homestay':    'house-homestay',
    'house-wanted':      'house-wanted',
    'house-service':     'house-service',
  },
  secondhand: {
    'sh-phone':     'sh-phone',
    'sh-appliance': 'sh-appliance',
    'sh-computer':  'sh-computer',
    'sh-clothing':  'sh-clothing',
    'sh-baby':      'sh-baby',
    'sh-books':     'sh-books',
    'sh-outdoor':   'sh-outdoor',
    'sh-tools':     'sh-tools',
    'sh-farm':      'sh-farm',
    'sh-pet':       'sh-pet',
    'sh-misc':      'sh-misc',
    'sh-free':      'sh-free',
  },
  job: {
    'job-fulltime':  'job-fulltime',
    'job-parttime':  'job-parttime',
    'job-resume':    'job-resume',
    'job-worker':    'job-worker',
    'job-sales':     'job-sales',
    'job-admin':     'job-admin',
    'job-finance':   'job-finance',
    'job-tech':      'job-tech',
    'job-education': 'job-education',
    'job-medical':   'job-medical',
    'job-driver':    'job-driver',
  },
  lifebiz: {
    'lb-cleaning':  'lb-cleaning',
    'lb-repair':    'lb-repair',
    'lb-move':      'lb-move',
    'lb-lock':      'lb-lock',
    'lb-errand':    'lb-errand',
    'lb-delivery':  'lb-delivery',
    'lb-carpool':   'lb-carpool',
    'lb-pet':       'lb-pet',
    'lb-wedding':   'lb-wedding',
    'lb-print':     'lb-print',
    'lb-legal':     'lb-legal',
    'lb-recycle':   'lb-recycle',
    'lb-lostfound': 'lb-lostfound',
  },
  // F-2: 5 个伊春本地刚需分类子分类 slug
  carpool: {
    '跨县拼车': 'carpool-kuaxian',
    '同城拼车': 'carpool-tongcheng',
    '长途拼车': 'carpool-changtu',
    '上下班通勤': 'carpool-tongqin',
    '其他': 'carpool-qita',
  },
  lostfound: {
    '寻物启事': 'lostfound-xunwu',
    '拾物招领': 'lostfound-shizhi',
    '寻宠启事': 'lostfound-xunchong',
    '寻人启事': 'lostfound-xunren',
    '其他': 'lostfound-qita',
  },
  contact: {
    '供暖供水': 'contact-gongnuan',
    '物业维修': 'contact-wuye',
    '派出所': 'contact-paichusuo',
    '医院学校': 'contact-yiyuan',
    '政府服务': 'contact-zhengfu',
    '其他': 'contact-qita',
  },
  forestry: {
    '蓝莓': 'forestry-lanmei',
    '木耳': 'forestry-muer',
    '松子': 'forestry-songzi',
    '榛子': 'forestry-henzi',
    '蘑菇': 'forestry-mogu',
    '林下参': 'forestry-linxia',
    '中药材': 'forestry-yaocai',
    '其他': 'forestry-qita',
  },
  dating: {
    '同城活动': 'dating-huodong',
    '兴趣交友': 'dating-xingqu',
    '相亲征婚': 'dating-xiangqin',
    '体育运动': 'dating-tiyu',
    '其他': 'dating-qita',
  },
};

/** 区县 SEO（伊春市 + 12 区县 = 13 条） */
const AREA_SEO = [
  { name: '伊春市', slug: 'yichun', level: 1 },
  { name: '伊美区', slug: 'yimei', level: 2 },
  { name: '南岔县', slug: 'nancha', level: 2 },
  { name: '友好区', slug: 'youhao', level: 2 },
  { name: '红星区', slug: 'hongxing', level: 2 },
  { name: '西林区', slug: 'xilin', level: 2 },
  { name: '金林区', slug: 'jinlin', level: 2 },
  { name: '乌翠区', slug: 'wucui', level: 2 },
  { name: '汤旺县', slug: 'tangwang', level: 2 },
  { name: '嘉荫县', slug: 'jiayin', level: 2 },
  { name: '大箐山县', slug: 'daqingshan', level: 2 },
  { name: '丰林县', slug: 'fenglin', level: 2 },
  { name: '铁力市', slug: 'tieli', level: 2 },
] as const;

/** 拼装区县 SEO TDK */
function buildAreaSeoTdk(areaName: string) {
  return {
    seoTitle: `${areaName}房屋出租/二手/招聘/便民信息 | 伊春有事儿说`,
    seoKeywords: `${areaName}信息,${areaName}租房,${areaName}二手,${areaName}招聘,${areaName}便民,伊春${areaName}`,
    seoDescription: `伊春${areaName}本地分类信息平台，提供${areaName}房屋出租、二手交易、招聘求职、便民信息，每日更新，本地真实可靠。`,
  };
}

/** 拼装子分类 SEO TDK */
function buildSubCategorySeoTdk(
  parentName: string,
  subName: string,
  parentKeywords: string,
) {
  return {
    seoTitle: `伊春${parentName}-${subName}频道 | 伊春有事儿说`,
    seoKeywords: `伊春${subName},${parentKeywords},伊春${parentName}${subName}`,
    seoDescription: `伊春本地${parentName}频道下的${subName}分类，汇集伊春各区县${subName}信息，每日更新。`,
  };
}

// =====================================================
// V1.0 子分类重整: 4 主顶级（house/secondhand/job/lifebiz）新定义
// - F-2 的 5 个本地分类（carpool/lostfound/contact/forestry/dating）保持旧定义，不参与重整
// - code 在子分类空间稳定不变（rename 时用 code 匹配，update name）
// - slug 与 code 对齐（URL 友好）
// - 总计: house=10, secondhand=12, job=11, lifebiz=13 = 46 条
// =====================================================
const NEW_SUB_CATEGORY_DEFS: Record<
  string,
  Array<{ name: string; code: string; slug: string; sortOrder: number }>
> = {
  house: [
    { name: '二手房',              code: 'house-second-hand', slug: 'house-second-hand', sortOrder: 1 },
    { name: '新房',                code: 'house-new',         slug: 'house-new',         sortOrder: 2 },
    { name: '租房（整租 / 合租）', code: 'house-rental',      slug: 'house-rental',      sortOrder: 3 },
    { name: '商铺（出租 / 出售）', code: 'house-shop',        slug: 'house-shop',        sortOrder: 4 },
    { name: '写字楼',              code: 'house-office',      slug: 'house-office',      sortOrder: 5 },
    { name: '厂房仓库',            code: 'house-warehouse',   slug: 'house-warehouse',   sortOrder: 6 },
    { name: '车位车库',            code: 'house-parking',     slug: 'house-parking',     sortOrder: 7 },
    { name: '民宿 / 短租',         code: 'house-homestay',    slug: 'house-homestay',    sortOrder: 8 },
    { name: '求租 / 求购',         code: 'house-wanted',      slug: 'house-wanted',      sortOrder: 9 },
    { name: '房屋托管 / 中介',     code: 'house-service',     slug: 'house-service',     sortOrder: 10 },
  ],
  secondhand: [
    { name: '手机数码',     code: 'sh-phone',     slug: 'sh-phone',     sortOrder: 1 },
    { name: '家电家具',     code: 'sh-appliance', slug: 'sh-appliance', sortOrder: 2 },
    { name: '电脑办公',     code: 'sh-computer',  slug: 'sh-computer',  sortOrder: 3 },
    { name: '服装鞋帽',     code: 'sh-clothing',  slug: 'sh-clothing',  sortOrder: 4 },
    { name: '母婴用品',     code: 'sh-baby',      slug: 'sh-baby',      sortOrder: 5 },
    { name: '图书乐器',     code: 'sh-books',     slug: 'sh-books',     sortOrder: 6 },
    { name: '户外运动',     code: 'sh-outdoor',   slug: 'sh-outdoor',   sortOrder: 7 },
    { name: '五金工具',     code: 'sh-tools',     slug: 'sh-tools',     sortOrder: 8 },
    { name: '农机设备',     code: 'sh-farm',      slug: 'sh-farm',      sortOrder: 9 },
    { name: '宠物用品',     code: 'sh-pet',       slug: 'sh-pet',       sortOrder: 10 },
    { name: '闲置杂物',     code: 'sh-misc',      slug: 'sh-misc',      sortOrder: 11 },
    { name: '求购 / 免费送', code: 'sh-free',     slug: 'sh-free',      sortOrder: 12 },
  ],
  job: [
    { name: '全职招聘',     code: 'job-fulltime',  slug: 'job-fulltime',  sortOrder: 1 },
    { name: '兼职招聘',     code: 'job-parttime',  slug: 'job-parttime',  sortOrder: 2 },
    { name: '求职简历',     code: 'job-resume',    slug: 'job-resume',    sortOrder: 3 },
    { name: '普工 / 技工',  code: 'job-worker',    slug: 'job-worker',    sortOrder: 4 },
    { name: '销售客服',     code: 'job-sales',     slug: 'job-sales',     sortOrder: 5 },
    { name: '文员行政',     code: 'job-admin',     slug: 'job-admin',     sortOrder: 6 },
    { name: '财务会计',     code: 'job-finance',   slug: 'job-finance',   sortOrder: 7 },
    { name: 'IT / 电商',    code: 'job-tech',      slug: 'job-tech',      sortOrder: 8 },
    { name: '教育培训',     code: 'job-education', slug: 'job-education', sortOrder: 9 },
    { name: '医疗护理',     code: 'job-medical',   slug: 'job-medical',   sortOrder: 10 },
    { name: '司机 / 家政',  code: 'job-driver',    slug: 'job-driver',    sortOrder: 11 },
  ],
  lifebiz: [
    { name: '家政保洁',                       code: 'lb-cleaning',   slug: 'lb-cleaning',   sortOrder: 1 },
    { name: '维修安装（水电/家电/电脑）', code: 'lb-repair',     slug: 'lb-repair',     sortOrder: 2 },
    { name: '搬家拉货',                       code: 'lb-move',       slug: 'lb-move',       sortOrder: 3 },
    { name: '开锁疏通',                       code: 'lb-lock',       slug: 'lb-lock',       sortOrder: 4 },
    { name: '跑腿代办',                       code: 'lb-errand',     slug: 'lb-errand',     sortOrder: 5 },
    { name: '同城配送',                       code: 'lb-delivery',   slug: 'lb-delivery',   sortOrder: 6 },
    { name: '拼车顺风车',                     code: 'lb-carpool',    slug: 'lb-carpool',    sortOrder: 7 },
    { name: '宠物服务',                       code: 'lb-pet',        slug: 'lb-pet',        sortOrder: 8 },
    { name: '婚庆摄影',                       code: 'lb-wedding',    slug: 'lb-wedding',    sortOrder: 9 },
    { name: '广告印刷',                       code: 'lb-print',      slug: 'lb-print',      sortOrder: 10 },
    { name: '法律财税',                       code: 'lb-legal',      slug: 'lb-legal',      sortOrder: 11 },
    { name: '废品回收',                       code: 'lb-recycle',    slug: 'lb-recycle',    sortOrder: 12 },
    { name: '失物招领 / 寻物',           code: 'lb-lostfound',  slug: 'lb-lostfound',  sortOrder: 13 },
  ],
};

/**
 * V1.0 子分类重整: 删除孤儿子分类
 * - 在 NEW_SUB_CATEGORY_DEFS 里的 → 保留
 * - 不在新定义里 + posts 无引用 → DELETE
 * - 不在新定义里 + posts 有引用 → 跳过，warn 输出（需用户手工处理）
 *
 * 安全策略:
 *  - 用 Prisma API (category.delete) 而非 $executeRaw，遵守 FK
 *  - 先 count posts 引用再删
 *  - 顶级分类不动（按 parentId != null 过滤）
 */
async function pruneOrphanSubcategories(prisma: PrismaClient, validCodes: Set<string>) {
  const subs = await prisma.category.findMany({
    where: { parentId: { not: null } },
    select: { id: true, code: true, name: true, parentId: true },
  });

  let deleted = 0;
  let skipped = 0;
  const skippedList: Array<{ id: bigint; code: string; name: string; refCount: number }> = [];

  for (const sub of subs) {
    if (validCodes.has(sub.code)) continue; // 在新定义里，保留
    // 不在新定义里 → 检查 posts 引用
    const refCount = await prisma.post.count({ where: { categoryId: sub.id } });
    if (refCount > 0) {
      skippedList.push({ id: sub.id, code: sub.code, name: sub.name, refCount });
      skipped++;
      continue;
    }
    try {
      await prisma.category.delete({ where: { id: sub.id } });
      console.log(`    ✓ 删除孤儿子分类 [${sub.code}] ${sub.name}`);
      deleted++;
    } catch (e: any) {
      console.warn(`    ⚠ 删除孤儿子分类失败 [${sub.code}] ${sub.name}: ${e.message}`);
      skipped++;
    }
  }

  if (skippedList.length > 0) {
    console.log(`    ⚠ 跳过 ${skippedList.length} 个被 posts 引用的孤儿子分类（需手工迁移）:`);
    for (const s of skippedList) {
      console.log(`      - id=${s.id} code=[${s.code}] name="${s.name}" posts=${s.refCount}`);
    }
  }
  return { deleted, skipped };
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始播种...');

  // ============================================
  // 0. V1.0 页面合理性修复: 清理孤儿 category
  // 根因: schema 没有 @@unique, 历史 seed 跑过 5 次, 留 4 份孤儿顶级 + 116 子
  // 策略: 按 (code, parentId, name) 找出重复组, 保留最小 id, 删其余 (无引用)
  // ============================================
  console.log('  🧹 清理孤儿 category...');
  const allCats = await prisma.category.findMany({
    select: { id: true, code: true, parentId: true, name: true },
    orderBy: [{ id: 'asc' }],
  });
  const seen = new Set<string>();
  const keepIds = new Set<bigint>();
  const orphanIds: bigint[] = [];
  for (const c of allCats) {
    const key = `${c.code}:${c.parentId ?? 'null'}:${c.name}`;
    if (seen.has(key)) {
      orphanIds.push(c.id);
    } else {
      seen.add(key);
      keepIds.add(c.id);
    }
  }
  if (orphanIds.length > 0) {
    // 只删没被 posts 引用的
    const refCats = await prisma.post.findMany({
      where: { categoryId: { in: orphanIds } },
      select: { categoryId: true },
    });
    const refSet = new Set(refCats.map((r) => r.categoryId));
    const safeOrphan = orphanIds.filter((id) => !refSet.has(id));
    if (safeOrphan.length > 0) {
      // 先删子（孤儿子）再删顶级
      const orphanSubIds = safeOrphan.filter((id) => {
        const cat = allCats.find((c) => c.id === id);
        return cat && cat.parentId != null;
      });
      const orphanTopIds = safeOrphan.filter((id) => {
        const cat = allCats.find((c) => c.id === id);
        return cat && cat.parentId == null;
      });
      if (orphanSubIds.length > 0) {
        const r = await prisma.category.deleteMany({ where: { id: { in: orphanSubIds } } });
        console.log(`    ✓ 删 ${r.count} 个孤儿子分类`);
      }
      if (orphanTopIds.length > 0) {
        const r = await prisma.category.deleteMany({ where: { id: { in: orphanTopIds } } });
        console.log(`    ✓ 删 ${r.count} 个孤儿顶级分类`);
      }
    }
    if (refSet.size > 0) {
      console.log(`    ⚠ 保留 ${refSet.size} 个被 post 引用的 category (历史脏数据, 需手工修复)`);
    }
  } else {
    console.log('    ✓ 无孤儿');
  }

  // ============================================
  // 1. 分类数据
  // ============================================
  console.log('  📁 创建分类...');

  // 顶级分类
  const topCategories = [
    { code: 'house', name: '房屋租售', icon: '🏠', sortOrder: 1 },
    { code: 'secondhand', name: '二手交易', icon: '🛍️', sortOrder: 2 },
    { code: 'job', name: '招聘求职', icon: '💼', sortOrder: 3 },
    { code: 'lifebiz', name: '便民信息', icon: '📌', sortOrder: 4 },
    // F-2: 5 个伊春本地刚需分类（业务审计 P0 修复）
    { code: 'carpool', name: '拼车/顺风车', icon: '🚗', sortOrder: 5 },
    { code: 'lostfound', name: '失物招领', icon: '🔍', sortOrder: 6 },
    { code: 'contact', name: '便民电话', icon: '📞', sortOrder: 7 },
    { code: 'forestry', name: '林下经济', icon: '🌲', sortOrder: 8 },
    { code: 'dating', name: '同城交友', icon: '💕', sortOrder: 9 },
  ];

  const createdTopCats: Record<string, bigint> = {};

  for (const cat of topCategories) {
    const seo = TOP_CATEGORY_SEO.find((s) => s.code === cat.code);
    const existing = await prisma.category.findFirst({
      where: { code: cat.code, parentId: null },
    });
    const data = {
      parentId: null,
      code: cat.code,
      name: cat.name,
      icon: cat.icon,
      sortOrder: cat.sortOrder,
      status: 1,
      slug: seo?.slug ?? cat.code,
      seoTitle: seo?.seoTitle ?? null,
      seoKeywords: seo?.seoKeywords ?? null,
      seoDescription: seo?.seoDescription ?? null,
    };
    const created = existing
      ? await prisma.category.update({ where: { id: existing.id }, data })
      : await prisma.category.create({ data });
    createdTopCats[cat.code] = created.id;
  }

  // ============================================
  // 1a. V1.0 子分类重整: prune 旧子分类
  // - 4 主顶级新子分类 code 加入 validCodes（保留）
  // - F-2 5 顶级 parent.code 加入 validCodes（保护 F-2 子分类不被误删）
  // ============================================
  console.log('  🧹 Prune 旧子分类（posts 无引用的删除，有引用的保留+warn）...');
  const validCodes = new Set<string>();
  for (const subs of Object.values(NEW_SUB_CATEGORY_DEFS)) {
    for (const s of subs) validCodes.add(s.code);
  }
  // 保护 F-2 的 5 个本地分类（其子分类 code = parent.code）
  for (const f2 of ['carpool', 'lostfound', 'contact', 'forestry', 'dating']) {
    validCodes.add(f2);
  }
  const { deleted: prunedCount, skipped: prunedSkipped } = await pruneOrphanSubcategories(
    prisma,
    validCodes,
  );
  console.log(`  ✓ prune 结果: 删 ${prunedCount} / 跳过 ${prunedSkipped}`);

  // 子分类（V1.0 重整: 4 主顶级换新 46 条；F-2 5 顶级保持旧定义）
  // - NEW (house/secondhand/job/lifebiz): 元素有 {code, name, slug, sortOrder}
  // - F-2  (carpool/lostfound/contact/forestry/dating): 元素只有 {name, sortOrder}
  type SubDef = {
    name: string;
    sortOrder: number;
    code?: string;       // NEW 子分类用
    slug?: string;       // NEW 子分类用
  };
  const subCategories: Record<string, SubDef[]> = {
    house: NEW_SUB_CATEGORY_DEFS.house as unknown as SubDef[],
    secondhand: NEW_SUB_CATEGORY_DEFS.secondhand as unknown as SubDef[],
    job: NEW_SUB_CATEGORY_DEFS.job as unknown as SubDef[],
    lifebiz: NEW_SUB_CATEGORY_DEFS.lifebiz as unknown as SubDef[],
    // F-2: 5 个伊春本地刚需分类（保持旧名 + code=parent.code 旧实现）
    carpool: [
      { name: '跨县拼车', sortOrder: 1 },
      { name: '同城拼车', sortOrder: 2 },
      { name: '长途拼车', sortOrder: 3 },
      { name: '上下班通勤', sortOrder: 4 },
      { name: '其他', sortOrder: 99 },
    ],
    lostfound: [
      { name: '寻物启事', sortOrder: 1 },
      { name: '拾物招领', sortOrder: 2 },
      { name: '寻宠启事', sortOrder: 3 },
      { name: '寻人启事', sortOrder: 4 },
      { name: '其他', sortOrder: 99 },
    ],
    contact: [
      { name: '供暖供水', sortOrder: 1 },
      { name: '物业维修', sortOrder: 2 },
      { name: '派出所', sortOrder: 3 },
      { name: '医院学校', sortOrder: 4 },
      { name: '政府服务', sortOrder: 5 },
      { name: '其他', sortOrder: 99 },
    ],
    forestry: [
      { name: '蓝莓', sortOrder: 1 },
      { name: '木耳', sortOrder: 2 },
      { name: '松子', sortOrder: 3 },
      { name: '榛子', sortOrder: 4 },
      { name: '蘑菇', sortOrder: 5 },
      { name: '林下参', sortOrder: 6 },
      { name: '中药材', sortOrder: 7 },
      { name: '其他', sortOrder: 99 },
    ],
    dating: [
      { name: '同城活动', sortOrder: 1 },
      { name: '兴趣交友', sortOrder: 2 },
      { name: '相亲征婚', sortOrder: 3 },
      { name: '体育运动', sortOrder: 4 },
      { name: '其他', sortOrder: 99 },
    ],
  };

  for (const [code, subs] of Object.entries(subCategories)) {
    const slugMap = SUB_CATEGORY_SLUGS[code] ?? {};
    const parentSeo = TOP_CATEGORY_SEO.find((s) => s.code === code);
    const parentName = topCategories.find((c) => c.code === code)?.name ?? code;
    for (const sub of subs) {
      // NEW 子分类有 sub.code/slug；F-2 没有 → 退化用 code=name/slugMap[name]
      const subCode = sub.code ?? code; // 子 code 稳定（V1.0）/ 或 parent.code（F-2）
      const slugLookupKey = sub.code ?? sub.name;
      const subSlug = sub.slug ?? slugMap[slugLookupKey] ?? `${code}-${sub.name}`;
      // 匹配：F-2 用 (code, name, parentId)；NEW 用 (code=subCode, parentId)
      //   NEW 子分类 code 空间唯一，rename 通过 subCode 命中并 update name
      const existing = await prisma.category.findFirst({
        where: { code: subCode, parentId: createdTopCats[code], name: sub.name },
      });
      const subTdk = parentSeo
        ? buildSubCategorySeoTdk(parentName, sub.name, parentSeo.seoKeywords)
        : null;
      const data = {
        parentId: createdTopCats[code],
        code: subCode,
        name: sub.name,
        sortOrder: sub.sortOrder,
        status: 1,
        slug: subSlug,
        seoTitle: subTdk?.seoTitle ?? null,
        seoKeywords: subTdk?.seoKeywords ?? null,
        seoDescription: subTdk?.seoDescription ?? null,
      };
      if (existing) {
        await prisma.category.update({ where: { id: existing.id }, data });
      } else {
        await prisma.category.create({ data });
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
  // V1.0: 用新子分类 code 匹配
  const houseSub = await prisma.category.findFirst({
    where: { code: 'house-rental', parentId: { not: null } },
  });
  const secondhandSub = await prisma.category.findFirst({
    where: { code: 'sh-phone', parentId: { not: null } },
  });
  const jobSub = await prisma.category.findFirst({
    where: { code: 'job-fulltime', parentId: { not: null } },
  });
  const lifebizSub = await prisma.category.findFirst({
    where: { code: 'lb-carpool', parentId: { not: null } },
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
  const yichunSeo = AREA_SEO.find((a) => a.name === '伊春市');
  const yichunTdk = yichunSeo ? buildAreaSeoTdk('伊春市') : null;
  const yichunCity = await prisma.area.upsert({
    where: { id: BigInt(1) }, // 第一次靠 upsert by id；如果非空则跳过
    update: {
      slug: yichunSeo?.slug ?? 'yichun',
      seoTitle: yichunTdk?.seoTitle ?? null,
      seoKeywords: yichunTdk?.seoKeywords ?? null,
      seoDescription: yichunTdk?.seoDescription ?? null,
    },
    create: {
      id: BigInt(1),
      parentId: null,
      name: '伊春市',
      level: 1,
      adCode: '230700',
      sortOrder: 1,
      slug: yichunSeo?.slug ?? 'yichun',
      seoTitle: yichunTdk?.seoTitle ?? null,
      seoKeywords: yichunTdk?.seoKeywords ?? null,
      seoDescription: yichunTdk?.seoDescription ?? null,
    },
  }).catch(async () => {
    return prisma.area.create({
      data: {
        parentId: null,
        name: '伊春市',
        level: 1,
        adCode: '230700',
        sortOrder: 1,
        slug: yichunSeo?.slug ?? 'yichun',
        seoTitle: yichunTdk?.seoTitle ?? null,
        seoKeywords: yichunTdk?.seoKeywords ?? null,
        seoDescription: yichunTdk?.seoDescription ?? null,
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
    const seo = AREA_SEO.find((a) => a.name === d.name);
    const tdk = seo ? buildAreaSeoTdk(d.name) : null;
    const existing = await prisma.area.findFirst({
      where: { parentId: yichunCity.id, name: d.name },
    });
    const data = {
      parentId: yichunCity.id,
      name: d.name,
      level: 2,
      adCode: d.adCode,
      sortOrder: d.sortOrder,
      slug: seo?.slug ?? null,
      seoTitle: tdk?.seoTitle ?? null,
      seoKeywords: tdk?.seoKeywords ?? null,
      seoDescription: tdk?.seoDescription ?? null,
    };
    const created = existing
      ? await prisma.area.update({ where: { id: existing.id }, data })
      : await prisma.area.create({ data });
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
  // T-013: 7. 标签字典（30 个伊春本地常用标签）
  // ============================================
  await seedTags();

  // ============================================
  // T-018: 7. 协议（terms / privacy / about）
  // ============================================
  await seedAgreements();

  // ============================================
  // [P0-fix] 8. 公告（Announcement）— 5 条（让 /announcements 有内容）
  // ============================================
  await seedAnnouncements();

  // ============================================
  // [P0-fix] 9. Banner（首页轮播）— 4 张（让首页 hero 有图）
  // ============================================
  await seedBanners();

  // ============================================
  // [P0-fix] 10. 扩充示例帖子 — 每 type 再补 4-6 条（让 /posts 列表不空）
  // ============================================
  await seedMorePosts();
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
    // 公司 (T-003 + T-021)
    { code: 'company.view',       module: 'company',  action: 'view',    name: '查看公司' },
    { code: 'company.verify',     module: 'company',  action: 'verify',  name: '认证公司' },
    { code: 'company.unverify',   module: 'company',  action: 'unverify', name: '取消公司认证' },
    { code: 'company.delete',     module: 'company',  action: 'delete',  name: '删除公司' },
    { code: 'company.restore',    module: 'company',  action: 'restore', name: '恢复公司' },
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

/**
 * [P0-fix] 公告种子 — 5 条平台公告
 * 幂等：按 title 查重
 */
async function seedAnnouncements() {
  console.log('  📢 创建公告...');
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  const adminId = admin?.id ?? BigInt(1);
  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 86400_000);
  const oneMonthLater = new Date(now.getTime() + 30 * 86400_000);

  const ANNOUNCEMENTS_SEED = [
    {
      title: '🎉 伊春有事儿说 1.0 正式上线',
      content: '伊春本地分类信息平台正式上线！欢迎伊春居民免费发布房屋出租、二手交易、招聘求职、便民服务信息。\n\n平台特色：\n- ✅ 真实信息：手机号 + 实名认证\n- ✅ 本地优先：专注伊春，不做全国通用\n- ✅ AI 智能发布：自然语言 1 键生成规范信息\n- ✅ 完全免费：发布、浏览、联系 0 费用\n\n客服邮箱：support@yichun.com',
      priority: 1,
      startsAt: now,
      endsAt: oneMonthLater,
    },
    {
      title: '🛡️ 信息发布规范与审核标准',
      content: '为保障平台信息质量，所有发布的信息需经机器+人工双重审核。\n\n**禁止发布：**\n- 虚假信息、夸大宣传\n- 违法违规内容（黄赌毒、违禁品）\n- 重复刷屏、垃圾广告\n- 未授权的第三方品牌信息\n\n**审核时长：**\n- 工作时间：30 分钟内\n- 夜间/节假日：2 小时内\n\n违规将下架并影响账号信用，详见《用户协议》。',
      priority: 2,
      startsAt: now,
      endsAt: oneMonthLater,
    },
    {
      title: '📞 客服联系方式与反馈渠道',
      content: '如有问题或建议，欢迎通过以下方式联系我们：\n\n- 客服邮箱：support@yichun.com\n- 商务合作：bd@yichun.com\n- 站内反馈：登录后点击"我的 → 意见反馈"\n\n工作时间：周一至周五 9:00-18:00\n紧急投诉：support@yichun.com（24h 内响应）',
      priority: 0,
      startsAt: now,
      endsAt: null,
    },
    {
      title: '✨ AI 智能发布功能上线',
      content: '现在你可以用自然语言一句话发布信息，AI 自动识别并填写表单！\n\n例如：\n> "伊美区万象城 2 室 1 厅 80 平 精装 月租 1800 明天看房 13800001234 王先生"\n\n系统会自动识别：分类、区域、户型、面积、装修、价格、联系人、联系电话，1 键生成规范信息。\n\n点击首页"AI 发布"按钮体验。',
      priority: 1,
      startsAt: now,
      endsAt: oneMonthLater,
    },
    {
      title: '🗺️ 覆盖范围：伊春市 + 12 区县',
      content: '平台已覆盖伊春市全部行政区：\n\n- 伊美区（市区）\n- 南岔县、友好区、红星区、西林区、金林区、乌翠区\n- 汤旺县、嘉荫县、大箐山县、丰林县\n- 铁力市\n\n后续将覆盖更多周边市县，欢迎提供建议。',
      priority: 0,
      startsAt: now,
      endsAt: null,
    },
  ];

  let created = 0;
  for (const a of ANNOUNCEMENTS_SEED) {
    const exists = await prisma.announcement.findFirst({ where: { title: a.title } });
    if (exists) continue;
    await prisma.announcement.create({
      data: {
        title: a.title,
        content: a.content,
        status: 1,
        priority: a.priority,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        createdBy: adminId,
      },
    });
    created++;
  }
  console.log(`  - 公告: 总 ${ANNOUNCEMENTS_SEED.length} 个 / 新增 ${created} 个`);
}

/**
 * [P0-fix] Banner 种子 — 4 张首页轮播图
 * 幂等：按 title 查重
 */
async function seedBanners() {
  console.log('  🖼️  创建 Banner...');
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  const adminId = admin?.id ?? BigInt(1);
  const now = new Date();
  const oneMonthLater = new Date(now.getTime() + 30 * 86400_000);

  const BANNERS_SEED = [
    {
      title: '伊春有事儿说 - 让伊春生活更便捷',
      imageUrl: 'https://placehold.co/1200x400/10b981/ffffff?text=伊春有事儿说+%7C+本地分类信息',
      linkType: 'url',
      linkTarget: '/?type=house',
      position: 'home_top',
      sortOrder: 1,
      startsAt: now,
      endsAt: oneMonthLater,
    },
    {
      title: 'AI 智能发布 - 一句话生成规范信息',
      imageUrl: 'https://placehold.co/1200x400/f59e0b/ffffff?text=AI+智能发布+自然语言一键生成',
      linkType: 'url',
      linkTarget: '/posts/publish',
      position: 'home_top',
      sortOrder: 2,
      startsAt: now,
      endsAt: oneMonthLater,
    },
    {
      title: '房屋租售 - 真实本地房源',
      imageUrl: 'https://placehold.co/1200x400/3b82f6/ffffff?text=房屋租售+%7C+伊美区+南岔+友好+铁力',
      linkType: 'url',
      linkTarget: '/?type=house',
      position: 'home_top',
      sortOrder: 3,
      startsAt: now,
      endsAt: oneMonthLater,
    },
    {
      title: '招聘求职 - 本地企业直招',
      imageUrl: 'https://placehold.co/1200x400/8b5cf6/ffffff?text=招聘求职+%7C+销售+餐饮+IT+家政',
      linkType: 'url',
      linkTarget: '/?type=job',
      position: 'home_top',
      sortOrder: 4,
      startsAt: now,
      endsAt: oneMonthLater,
    },
  ];

  let created = 0;
  for (const b of BANNERS_SEED) {
    const exists = await prisma.banner.findFirst({ where: { title: b.title } });
    if (exists) continue;
    await prisma.banner.create({
      data: {
        title: b.title,
        imageUrl: b.imageUrl,
        linkType: b.linkType,
        linkTarget: b.linkTarget,
        position: b.position,
        sortOrder: b.sortOrder,
        status: 1,
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        createdBy: adminId,
      },
    });
    created++;
  }
  console.log(`  - Banner: 总 ${BANNERS_SEED.length} 个 / 新增 ${created} 个`);
}

/**
 * [P0-fix] 扩充示例帖子 — 每个 type 再补 4-6 条
 * 幂等：按 title 查重
 */
async function seedMorePosts() {
  console.log('  📝 扩充示例帖子...');
  const testUser = await prisma.user.findFirst({ where: { phone: '13800000000' } });
  if (!testUser) {
    console.log('    ⚠ 未找到测试用户，跳过');
    return;
  }

  // 找各 type 的子分类
  const findSub = async (code: string) =>
    prisma.category.findFirst({ where: { code, parentId: { not: null } } });

  // 实际数据库子分类 code (house-second-hand/house-new/sh-appliance/lb-cleaning 等)
  // 之前误用 house-shared/house-sale/sh-furniture/lb-housekeeping, 跑 seed 时 null.id 崩溃
  const sub = {
    'house-rental': await findSub('house-rental'),
    'house-second-hand': await findSub('house-second-hand'),
    'house-new': await findSub('house-new'),
    'house-shop': await findSub('house-shop'),
    'sh-phone': await findSub('sh-phone'),
    'sh-appliance': await findSub('sh-appliance'),
    'sh-baby': await findSub('sh-baby'),
    'job-fulltime': await findSub('job-fulltime'),
    'job-parttime': await findSub('job-parttime'),
    'job-driver': await findSub('job-driver'),
    'lb-carpool': await findSub('lb-carpool'),
    'lb-cleaning': await findSub('lb-cleaning'),
  };

  const morePosts = [
    // 房屋
    {
      type: 'house', categoryId: sub['house-rental']!.id,
      title: '【南岔县】中心广场旁 两室一厅 简单装修',
      description: '南岔中心广场旁，5 楼，两室一厅，简单装修，家具家电齐全，月租 1200，看房方便。',
      price: 1200, priceUnit: '元/月',
      contactName: '赵女士', contactPhone: '13800000011',
      status: 'active', auditStatus: 'passed',
    },
    {
      type: 'house', categoryId: sub['house-second-hand']!.id,
      title: '【伊美区】万象城合租 主卧出租 限女生',
      description: '合租万象城小区，主卧带独卫，月租 900，无中介费，仅限女生。',
      price: 900, priceUnit: '元/月',
      contactName: '陈同学', contactPhone: '13800000012',
      status: 'active', auditStatus: 'passed',
    },
    {
      type: 'house', categoryId: sub['house-new']!.id,
      title: '【友好区】友好街道 68 平两室 出售',
      description: '友好街道，5 楼两室一厅 68 平，中等装修，售价 18 万，看房随时。',
      price: 180000, priceUnit: '元',
      contactName: '周先生', contactPhone: '13800000013',
      status: 'active', auditStatus: 'passed',
    },
    {
      type: 'house', categoryId: sub['house-shop']!.id,
      title: '【铁力市】铁力镇中心 商铺出租 50 平',
      description: '铁力镇中心位置，50 平商铺，门前停车方便，适合餐饮/便利店，月租 3500。',
      price: 3500, priceUnit: '元/月',
      contactName: '吴经理', contactPhone: '13800000014',
      status: 'active', auditStatus: 'passed',
    },
    // 二手
    {
      type: 'secondhand', categoryId: sub['sh-appliance']!.id,
      title: '九成新实木餐桌椅一套 出售',
      description: '实木餐桌+4 把椅子，使用 1 年，无划痕，自提价 800。',
      price: 800, priceUnit: '元',
      contactName: '孙女士', contactPhone: '13800000015',
      status: 'active', auditStatus: 'passed',
    },
    {
      type: 'secondhand', categoryId: sub['sh-baby']!.id,
      title: '宝宝学步车+餐椅 打包出售',
      description: '宝宝长大了用不上，学步车+餐椅打包 200，干净卫生，自提。',
      price: 200, priceUnit: '元',
      contactName: '徐妈妈', contactPhone: '13800000016',
      status: 'active', auditStatus: 'passed',
    },
    {
      type: 'secondhand', categoryId: sub['sh-phone']!.id,
      title: '出售华为 Mate 60 512G 国行',
      description: 'Mate 60 Pro+ 512G 国行，95 新，原装无拆修，配件齐全，4500 元。',
      price: 4500, priceUnit: '元',
      contactName: '马同学', contactPhone: '13800000017',
      status: 'active', auditStatus: 'passed',
    },
    {
      type: 'secondhand', categoryId: sub['sh-appliance']!.id,
      title: '品牌冰柜 300 升 9 成新',
      description: '海尔冰柜 300 升，家用商用均可，9 成新，因搬家出售 600 元。',
      price: 600, priceUnit: '元',
      contactName: '冯大姐', contactPhone: '13800000018',
      status: 'active', auditStatus: 'passed',
    },
    // 招聘
    {
      type: 'job', categoryId: sub['job-parttime']!.id,
      title: '招聘：周末家教 高中数学 200元/次',
      description: '南岔中学高一学生，数学基础弱，每周六下午 2 小时，200 元/次，有经验优先。',
      price: 200, priceUnit: '元/天',
      contactName: '韩家长', contactPhone: '13800000019',
      status: 'active', auditStatus: 'passed',
    },
    {
      type: 'job', categoryId: sub['job-driver']!.id,
      title: '招聘 B2 司机 跑运输 6000-8000/月',
      description: '招聘 B2 司机，木材运输，公司车，月休 4 天，月薪 6000-8000。',
      price: 7000, priceUnit: '元/月',
      contactName: '杨老板', contactPhone: '13800000020',
      status: 'active', auditStatus: 'passed',
    },
    {
      type: 'job', categoryId: sub['job-fulltime']!.id,
      title: '招聘：导游/景区讲解员 4500-5500/月',
      description: '五营森林公园招聘导游，要求普通话标准，有导游证优先，4500-5500/月。',
      price: 5000, priceUnit: '元/月',
      contactName: '景区刘主任', contactPhone: '13800000021',
      status: 'active', auditStatus: 'passed',
    },
    {
      type: 'job', categoryId: sub['job-fulltime']!.id,
      title: '招聘：会计 4000-6000 双休',
      description: '招聘会计 1 名，要求初级以上职称，熟悉用友/金蝶，月薪 4000-6000，双休。',
      price: 5000, priceUnit: '元/月',
      contactName: '朱总', contactPhone: '13800000022',
      status: 'active', auditStatus: 'passed',
    },
    // 便民
    {
      type: 'lifebiz', categoryId: sub['lb-carpool']!.id,
      title: '【拼车】伊春→哈尔滨 周末往返 长途',
      description: '本人每周五晚出发去哈尔滨，周日返程，可拼 2-3 人，油费均摊。',
      price: 100, priceUnit: '元/人',
      contactName: '蒋师傅', contactPhone: '13800000023',
      status: 'active', auditStatus: 'passed',
    },
    {
      type: 'lifebiz', categoryId: sub['lb-cleaning']!.id,
      title: '专业家庭保洁 50元/时 起',
      description: '提供家庭日常保洁、深度保洁、新居开荒等服务，50 元/时起，自带工具。',
      price: 50, priceUnit: '元/时',
      contactName: '魏大姐', contactPhone: '13800000024',
      status: 'active', auditStatus: 'passed',
    },
    {
      type: 'lifebiz', categoryId: sub['lb-carpool']!.id,
      title: '【拼车】伊美区通勤 旭日街道 → 区政府',
      description: '工作日通勤拼车，旭日街道至区政府方向，6 人商务车，每人 5 元/天。',
      price: 5, priceUnit: '元/人',
      contactName: '沈司机', contactPhone: '13800000025',
      status: 'active', auditStatus: 'passed',
    },
  ];

  let created = 0;
  for (const post of morePosts) {
    const exists = await prisma.post.findFirst({ where: { title: post.title } });
    if (exists) continue;
    await prisma.post.create({
      data: { userId: testUser.id, ...post },
    });
    created++;
  }
  console.log(`  - 扩充帖子: 总 ${morePosts.length} 个 / 新增 ${created} 个`);
}

main()
  .catch((e) => {
    console.error('❌ 播种失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
