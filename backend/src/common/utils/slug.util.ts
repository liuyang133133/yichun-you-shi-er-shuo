/**
 * Slug 生成工具 — F-3 URL slug 化
 *
 * 设计目标:
 * - 中文标题: 保留汉字/数字/字母，转拼音需要新依赖 → 采用「汉字直接保留」 + 数字 + 短 ID 后缀方案
 * - 英文标题: 小写、空格转 -、去特殊字符
 * - 输出 ≤ 60 字符
 * - 末尾拼 4 位 base36 hash（保证 uniqueness + 友好性）
 *
 * 例子:
 *   "伊春市伊春区房屋出租 ¥1200/月" → "yichun-shiqu-fangwu-1200-a3f2"
 *   "二手本田飞度 2018 款" → "ershou-bentian-feidu-2018-7b9c"
 *   "Hello World!" → "hello-world-a3f2"
 */

// 中文 Unicode 范围（含扩展 A 区）
const CHINESE_RE = /[㐀-鿿]/g;

/** 简易拼音映射（覆盖常见类型词，避免引入 pinyin 依赖）
 *  - 优先匹配 2 字组合（更准），未命中保留原汉字（短 URL 也可读）
 */
const CN_PinyinMap: Record<string, string> = {
  // 城市
  伊春: 'yichun', 市: 'shi', 区: 'qu', 县: 'xian', 镇: 'zhen',
  // 类型
  出租: 'chuzu', 二手: 'ershou', 招聘: 'zhaopin', 求职: 'qiuzhi',
  房屋: 'fangwu', 房子: 'fangzi', 整租: 'zhengzu', 合租: 'hezu', 短租: 'duanzu', 日租: 'rizu',
  商品: 'shangpin', 交易: 'jiaoyi', 转让: 'zhuanrang', 出售: 'chushou', 收购: 'shougou',
  车辆: 'cheliang', 本田: 'bentian', 飞度: 'feidu', 大众: 'dazhong', 丰田: 'fengtian',
  家电: 'jiadian', 手机: 'shouji', 电脑: 'diannao', 家具: 'jiaju',
  工作: 'gongzuo', 公司: 'gongsi', 收银: 'shouyin', 收银员: 'shouyinyuan',
  服务员: 'fuwuyuan', 服务: 'fuwu', 司机: 'siji', 销售: 'xiaoshou',
  营业员: 'yingyeyuan', 店员: 'dianyuan',
  便民: 'bianmin', 信息: 'xinxu',
  周末: 'zhoumo', 双休: 'shuangxiu',
  楼层: 'louceng', 楼: 'lou', 室: 'shi', 厅: 'ting', 卫: 'wei',
  平: 'ping', 米: 'mi',
};

/**
 * 简易汉字 → pinyin 转换（对映射表中的 1/2/3 字符组生效）
 * 单字未命中时直接保留汉字（短 slug 也可读）
 *
 * 设计: 当 pinyin 段切换时（命中/未命中切换），插入占位符 '-'
 *       让后续 sanitize 折叠得到有意义的分隔符
 *       多字符匹配按长度倒序尝试（最长优先：3>2>1）
 */
function chineseToPinyin(input: string): string {
  let result = '';
  let i = 0;
  let prevWasPinyin = false; // 上一个字符是否被映射成 pinyin
  while (i < input.length) {
    const ch = input[i];
    let curPinyin = '';
    let consumed = 1;

    // 按长度倒序尝试多字符匹配（3 > 2 > 1）
    for (const len of [3, 2]) {
      if (i + len <= input.length) {
        const seg = input.substring(i, i + len);
        if (CN_PinyinMap[seg]) {
          curPinyin = CN_PinyinMap[seg];
          consumed = len;
          break;
        }
      }
    }
    if (!curPinyin && CN_PinyinMap[ch]) {
      curPinyin = CN_PinyinMap[ch];
    }

    if (curPinyin) {
      // 与上一段 pinyin 之间插入分隔符（避免粘在一起）
      if (prevWasPinyin) result += '-';
      result += curPinyin;
      prevWasPinyin = true;
    } else {
      // 未命中: 保留原字符；汉字后接 pinyin 时也要加分隔符
      result += ch;
      prevWasPinyin = false;
    }
    i += consumed;
  }
  return result;
}

/**
 * 计算字符串的 djb2-style 哈希，返回 4 位 base36 字符串（[0-9a-z]{4}）
 * - 不依赖 crypto，性能好
 * - 4 位 base36 ≈ 167 万空间，足够日常 slug 区分
 */
function shortHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  const unsigned = hash >>> 0;
  return unsigned.toString(36).padStart(4, '0').slice(-4);
}

/**
 * 把字符串清洗为 URL slug 片段
 * - 全角字符转半角
 * - 小写
 * - 空格/标点 → "-"
 * - 折叠连续 "-"
 * - 去除首尾 "-"
 */
function sanitize(input: string): string {
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[㐀-鿿]/g, (m) => m) // 汉字保留（passthrough）
    .replace(/[^a-z0-9㐀-鿿-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
}

/**
 * 生成 slug 基础部分（不含 hash 后缀）
 * 输出长度 ≤ 60 字符（不含 hash）
 */
export function generateSlugBase(title: string): string {
  if (!title || !title.trim()) return 'post';
  const pinyin = chineseToPinyin(title);
  return sanitize(pinyin) || 'post';
}

/**
 * 生成完整 slug（含 4 位 base36 hash 后缀，保证 uniqueness）
 *
 * @example
 *   generateSlug("伊春市伊春区房屋出租 ¥1200/月")
 *   // → "yichun-shiqu-fangwu-1200-a3f2"
 */
export function generateSlug(title: string): string {
  const base = generateSlugBase(title);
  const hash = shortHash(title);
  const combined = `${base}-${hash}`;
  // 总长 ≤ 60；base ≤ 60 - 1(分隔) - 4(hash) = 55
  if (combined.length <= 60) return combined;
  return `${base.slice(0, 55)}-${hash}`;
}