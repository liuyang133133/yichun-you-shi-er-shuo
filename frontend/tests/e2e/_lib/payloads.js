/**
 * payloads.js — 13 维度攻击 payload 库
 * 统一模块, 按维度函数 getPayloads(dim, moduleName)
 */

// ===== 维度 5: SQL 注入 =====
const SQLI = [
  "' OR '1'='1",
  "admin'--",
  "'; DROP TABLE users;--",
  "' UNION SELECT 1,2,3--",
  "1' AND SLEEP(5)--",
  "1' AND 1=1--",
  "1 OR 1=1",
  "%' OR 1=1--",
  '{"phone":{"contains":"%"}}',
  'phone[$ne]=null',
];

// ===== 维度 6: XSS =====
const XSS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<svg/onload=alert(1)>',
  'javascript:alert(1)',
  '"><svg onload=alert(1)>',
  "'-alert(1)-'",
  "{{constructor.constructor('alert(1)')()}}",
  '<BODY ONLOAD=alert(1)>',
  '<script>alert(1)</script>',
  '<iframe src=javascript:alert(1)>',
];

// ===== 维度 2: 异常类型 =====
const INVALID_TYPE = {
  // 字符串当数组
  stringAsArray: { 'page[]': 'abc' },
  // 数组索引越界
  arrayOutOfBound: { 'ids[99999]': '1' },
  // 枚举越界 (post status)
  enumOutOfRange: { status: 'banana', auditStatus: 'potato' },
  // UUID 当 BigInt
  uuidAsBigInt: { id: 'not-a-number' },
  // 日期非日期
  invalidDate: { createdAt: 'tomorrow' },
  // 数值小数
  numericFloat: { page: 1.5 },
  // 数字字段传字符串 (留向后兼容)
  boolAsObject: { isPublic: { yes: true } },
  // 嵌套溢出 (简化版, 100 层单独 oversized)
  jsonNested: (function () { let o = {}; let cur = o; for (let i = 0; i < 100; i++) { cur.next = {}; cur = cur.next; } return o; })(),
};

// ===== 维度 3: 空/缺失 =====
const MISSING = {
  emptyObject: {},
  nullFields: { phone: null, code: null, password: null },
  emptyString: { phone: '', code: '' },
  whitespace: { phone: '   ', code: '   ' },
  emptyArray: { ids: [] },
  nullArray: { ids: null },
  forbidNonWhitelisted: { role: 'admin', isAdmin: true, status: 0, extra: 'leak' },
};

// ===== 维度 4: 超长 =====
const OVERSIZED = {
  // 65535+ chars string
  hugeString: 'a'.repeat(70000),
  // 1MB-ish UTF-8 (描述)
  hugeDescription: 'A'.repeat(200000),
  // 10K 数组
  hugeArray: Array.from({ length: 10000 }, (_, i) => i),
  // 100 层嵌套 JSON (会触发 DTO 解析失败)
  deepNested: (function () { let o = {}; let cur = o; for (let i = 0; i < 100; i++) { cur.a = {}; cur = cur.a; } return o; })(),
  // 长数字
  hugeNumber: '1'.repeat(100),
  // 长 base64 风格字符串
  longBase64: 'A'.repeat(200000),
};

// ===== 维度 9: 权限 bypass =====
const BYPASS = {
  noToken: { rawToken: undefined },  // 不带 Authorization
  emptyToken: { rawToken: '' },       // "Bearer "
  nullToken: { rawToken: 'null' },    // 字面 "null"
  refreshAsAccess: null,               // 用 refresh token 当 access
  // 错误签名 / alg-none 由 jwt.js tokenFactory 提供
};

// ===== 维度 11: Token 空 =====
const EMPTY_AUTH = [
  { rawToken: '' },
  { rawToken: 'null' },
  { rawToken: 'undefined' },
  { rawToken: ' ' },     // 空格
  { rawToken: ' fake' }, // 前置空格
  { rawToken: 'fake ' }, // 后置空格
  { rawToken: '\nfake' }, // 前换行
];

// ===== 维度 1: 正常 (happy path) =====
// 不在此处, 由各模块自己定义 sample body

// ===== 维度 13: 期望状态码矩阵 =====
// 描述每个方法的标准期望码
const EXPECTED_STATUS = {
  GET: [200],
  POST: [200, 201],
  PUT: [200, 201],
  PATCH: [200, 201],
  DELETE: [200, 204],
};

module.exports = {
  SQLI, XSS,
  INVALID_TYPE, MISSING, OVERSIZED,
  BYPASS, EMPTY_AUTH, EXPECTED_STATUS,
};
