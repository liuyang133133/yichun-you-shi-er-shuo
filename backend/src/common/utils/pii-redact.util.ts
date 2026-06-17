/**
 * PII 脱敏工具 - 给 LLM 调用前过滤敏感信息
 * - 手机号 (11 位, 1[3-9] 开头)
 * - 微信号 (6+ 字母数字下划线, 紧跟前缀: 微信/vx/v/v信/加我)
 * - 身份证 (18 位, 末位可能 X)
 * - 银行卡 (16-19 位连续数字)
 * - 邮箱
 *
 * 安全策略: 宁可漏脱敏 (false negative) 也不误脱 (false positive),
 * 所以所有模式都要求前缀/边界锚点
 */

const PATTERNS: Array<{ re: RegExp; replace: string | ((m: string) => string) }> = [
  // 手机号: 必须 1[3-9] 开头, 后面 9 位数字
  {
    re: /(?<!\d)1[3-9]\d{9}(?!\d)/g,
    replace: (m) => `${m.slice(0, 3)}****${m.slice(7)}`,
  },
  // 身份证: 17 位数字 + 1 位数字/X
  {
    re: /(?<!\d)\d{17}[\dXx](?!\d)/g,
    replace: (m) => `${m.slice(0, 3)}***********${m.slice(-4)}`,
  },
  // 银行卡: 16-19 位连续数字 (在 "卡号/银行卡/账号" 上下文里)
  // 保留前缀, 只替换数字部分
  {
    re: /(?:卡号|银行卡|账号|卡\s*号)[:：\s]*(\d{16,19})\b/gi,
    replace: (m) => m.replace(/\d{16,19}\b/, '****'),
  },
  // 邮箱
  {
    re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replace: 'e_****@****.com',
  },
  // 微信号: 前缀 + 6+ 字母数字下划线
  // 注意: 要先匹配微信号再匹配通用账号
  {
    re: /(?:微信号?|加\s*[Vv]|加\s*v信|加\s*微信|vx)[:：\s]*([a-zA-Z][a-zA-Z0-9_-]{5,30})/g,
    replace: (m) => m.replace(/([a-zA-Z][a-zA-Z0-9_-]{5,30})$/, 'wx_****'),
  },
];

export function redactPii(text: string): string {
  if (!text) return text;
  let result = text;
  for (const { re, replace } of PATTERNS) {
    result = result.replace(re, replace as any);
  }
  return result;
}

/**
 * 计算文本 sha256 (用于缓存 key + 日志去重)
 */
export function sha256(text: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(text).digest('hex');
}
