/**
 * samples.js — 每端点的 happy-path body 样本
 *
 * 对于需要 auth 的端点, 调用方会先 getToken() 再注入 token.
 * 一些端点强制需要真实依赖 (postId/categoryId); 提供动态发现的函数.
 */
const { API } = require('./auth');

// ===== Category 动态获取 (确保 categoryId 有效) =====
async function findHouseCategory(call) {
  const r = await call('GET', `${API}/categories`, { query: { tree: 'true' } });
  function walk(arr) {
    for (const c of arr || []) {
      if (c.code === 'house') return c;
      if (c.children) { const x = walk(c.children); if (x) return x; }
    }
    return null;
  }
  return walk(r.body?.data);
}
async function findJobCategory(call) { /* 同 pattern */ const r = await call('GET', `${API}/categories`, { query: { tree: 'true' } }); function walk(arr) { for (const c of arr || []) { if (c.code === 'job') return c; if (c.children) { const x = walk(c.children); if (x) return x; } } return null; } return walk(r.body?.data); }

// ===== happy-path 样本 =====
const SAMPLES = {
  // Auth
  'auth/sms-code': { phone: '13800000000' },
  'auth/login-sms': { phone: '13800000000', code: '123456' },
  'auth/login-password': { phone: '13800000000', password: 'Test123456' },
  'auth/refresh': { refreshToken: 'placeholder-replaced-at-runtime' },
  'auth/logout': {},
  // Posts
  'posts': (ctx) => ({
    type: 'house',
    categoryId: ctx.houseCategoryId,
    title: '审计测试帖子-' + Date.now(),
    description: '审计测试描述内容',
    price: 1000,
    contactName: '审计测试',
    contactPhone: '13800000001',
    contactWechat: 'audit_test',
  }),
  'posts/:id/status': { status: 'sold' },
  // Comments
  'comments': (ctx) => ({ content: '审计测试留言-' + Date.now() }),
  // Favorites
  'favorites': (ctx) => ({ postId: 1 }),
  // Applications
  'applications': (ctx) => ({ postJobId: 999999999, coverLetter: 'P0 测试' }),
  'applications/:id/status': { status: '已查看' },
  // Messages
  'messages': (ctx) => ({ receiverId: 1, content: '审计测试消息-' + Date.now() }),
  'notifications/read-all': {},
  'notifications/settings/:event': { enabled: true },
  'devices/register': { token: 'audit-fake-token-' + Date.now(), platform: 'web' },
  // Reports
  'reports': (ctx) => ({ postId: 1, reason: '违法违规', description: '审计' }),
  // Companies
  'companies': (ctx) => ({ name: '审计公司-' + Date.now() }),
  // Resumes
  'resumes/me': { name: '审计简历', expectedPosition: 'any' },
  // Admin posts audit
  'admin/posts/:id/audit': { action: 'pass', reason: '审计通过' },
  'admin/posts/:id/offline': { reason: '审计下架理由' },
  'admin/posts/audit-batch': { ids: ['1'], action: 'pass', reason: '审计批量' },
  'admin/posts/offline-batch': { ids: ['1'], reason: '下架批量' },
  'admin/posts/purge': { daysOld: 30 },
  // Admin reports
  'admin/reports/:id/handle': { action: 'reject', note: '审计处置' },
  // Admin users
  'admin/users/:id/ban': { reason: '审计封禁测试' },
  'admin/users/:id/roles': { roleId: 1 },
  // Admin notifications
  'admin/notifications/templates': {
    event: 'system',
    key: 'audit_' + Date.now(),
    title: '审计模板',
    body: '审计 body',
  },
  'admin/notifications/templates/:id/preview': { userName: '审计' },
  'admin/notifications/broadcast': { title: '广播测试', body: '审计' },
  // Admin announcements
  'admin/announcements': { title: '审计公告', content: '审计公告内容' },
  // Admin banners
  'admin/banners': { title: '审计 banner', imageUrl: 'https://example.com/x.png' },
  // Admin companies
  'admin/companies/:id/verify': { reason: '审计 verify' },
  'admin/companies/:id/unverify': { reason: '审计 unverify' },
  // Admin tags
  'admin/tags': { name: 'audit-tag-' + Date.now() },
  'admin/tags/:id/merge': { targetId: 1 },
  'admin/tags/migrate-from-json': {},
  // Admin seo
  'admin/ai/regenerate-seo-batch': { limit: 1 },
  'admin/seo/push-baidu': { urls: ['https://example.com/x'] },
  // Upload (POST /upload/image) - 需要 multipart, 不算 JSON 测试
  // Roles
  'admin/roles': { code: 'audit_role_' + Date.now(), name: '审计角色' },
  'admin/roles/:id/permissions': { permissionIds: [1] },
  // House/secondhand/lifebiz/job sub-controller: 需要先有 post, 简化返回 {}
  'posts/:id/house': { rentalType: '整租', propertyType: '小区' },
  'posts/:id/secondhand': { categoryName: '手机数码', condition: '九成新' },
  'posts/:id/lifebiz': { subCategory: '家政服务', serviceType: '上门服务' },
  'posts/:id/job': { companyId: 0, jobType: '全职' },
  // AI
  'ai/draft/extract': { title: '审计 title', description: '审计 desc' },
  'ai/draft/suggest-title': { description: '审计描述' },
  'ai/draft/score': { title: 'A', description: 'B' },
  'ai/draft/rewrite': { description: '审计 rewrite' },
  // Boost
  'posts/:id/boost': { days: 7 },
};

/**
 * 获取某端点的样本 body, 缺失则返回 {}
 */
function getSample(method, originalPath, ctx) {
  const path = originalPath;
  // 精确匹配
  if (SAMPLES[path] !== undefined) {
    return typeof SAMPLES[path] === 'function' ? SAMPLES[path](ctx || {}) : SAMPLES[path];
  }
  // 模糊匹配: 检查 ':param' 替换
  for (const key of Object.keys(SAMPLES)) {
    const re = new RegExp('^' + key.replace(/:[a-zA-Z]+/g, '[^/]+') + '$');
    if (re.test(path)) {
      const sample = SAMPLES[key];
      return typeof sample === 'function' ? sample(ctx || {}) : sample;
    }
  }
  return {};
}

/**
 * 简化的 query 参数样本 (GET 用)
 */
const QUERY_SAMPLES = {
  '/posts': { type: 'house', pageSize: '5' },
  '/posts/count': { type: 'house' },
  '/posts/me': { status: 'active', pageSize: '5' },
  '/posts/:id/contact': {},
  '/posts/:id/breadcrumb': {},
  '/posts/:id/related': {},
  '/posts/:id': {},
  '/categories/tree': { tree: 'true' },
  '/categories': { tree: 'true' },
  '/favorites': { pageSize: '5' },
  '/resumes/me': {},
  '/companies': { pageSize: '5' },
  '/companies/:id/jobs': {},
  '/applications/me': {},
  '/applications/post-job/:id': {},
  '/reports': { pageSize: '5' },
  '/admin/posts': { pageSize: '5' },
  '/admin/users': { pageSize: '5' },
  '/admin/reports': { pageSize: '5' },
  '/admin/categories': {},
  '/admin/categories/tree': {},
  '/admin/roles': {},
  '/admin/roles/:id/permissions': {},
  '/admin/permissions': {},
  '/admin/notifications/templates': {},
  '/admin/announcements': {},
  '/admin/banners': {},
  '/admin/companies': {},
  '/admin/companies/:id': {},
  '/admin/tags': {},
  '/admin/audit-logs': { pageSize: '5' },
  '/admin/audit-logs/options': {},
  '/admin/login-logs': { pageSize: '5' },
  '/admin/ai-usage/stats': { range: 'month' },
  '/admin/permissions/modules': {},
  '/admin/users/:id/roles': {},
  '/admin/posts/purge': { daysOld: 30 },
  '/notifications/me': { pageSize: '5' },
  '/notifications/unread-count': {},
  '/notifications/settings': {},
  '/notifications/settings/:event': {},
  '/admin/ai/regenerate-seo/:postId': {},
  '/admin/ai/regenerate-seo-batch': { limit: 1 },
  '/admin/seo/push-baidu': { urls: ['https://example.com/x'] },
  '/search': { q: 'iphone' },
  '/search/hot': {},
  '/tags': { pageSize: '5' },
  '/tags/hot': {},
  '/tags/:slug': {},
  '/tags/:slug/posts': { pageSize: '5' },
  '/announcements': {},
  '/announcements/active': {},
  '/announcements/:id': {},
  '/agreements': {},
  '/agreements/:key': {},
  '/banners/active': {},
  '/areas': { tree: 'true' },
  '/areas/count': {},
  '/areas/:id': {},
  '/messages/inbox': { pageSize: '5' },
  '/messages/outbox': { pageSize: '5' },
  '/messages/with/:userId': {},
  '/messages/unread-count': {},
  '/seo/sitemap-full': {},
  '/seo/categories/:slug': {},
  '/seo/areas/:slug': {},
  '/seo/tdk': {},
  '/users': { pageSize: '5' },
  '/users/me': {},
  '/users/:id': {},
  '/houses': { pageSize: '5' },
  '/secondhands': { pageSize: '5' },
  '/lifebizs': { pageSize: '5' },
  '/jobs': { pageSize: '5' },
  '/resumes': { pageSize: '5' },
  '/resumes/:id': {},
  '/reports/reasons': {},
  '/health': {},
  '/posts/sitemap-data': {},
  '/sitemap.xml': {},
  '/comments/:id': {},
};

module.exports = { SAMPLES, QUERY_SAMPLES, getSample, findHouseCategory, findJobCategory };
