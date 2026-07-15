// [P0-AUDIT-2026-07-15] 端到端验证 8 P0 + 3 P0-D 修复
const jwt = require('/app/node_modules/jsonwebtoken');
const { PrismaClient } = require('/app/node_modules/@prisma/client');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) { console.error('JWT_SECRET missing'); process.exit(1); }

const BASE = process.env.VERIFY_BASE || 'http://localhost:15301/api/v1';
const prisma = new PrismaClient();

let pass = 0, fail = 0;
const results = [];

function ok(name, detail) { pass++; results.push({ name, status: 'PASS', detail: detail || '' }); }
function bad(name, detail) { fail++; results.push({ name, status: 'FAIL', detail: detail || '' }); }

async function http(path, opts) {
  opts = opts || {};
  const url = BASE + path;
  const r = await fetch(url, {
    method: opts.method || 'GET',
    headers: Object.assign({ 'content-type': 'application/json' }, opts.headers || {}),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let body = null;
  try { body = await r.json(); } catch (e) {}
  return { status: r.status, body: body };
}

async function main() {
  const aR = await prisma.user.findFirst({
    where: { role: { in: ['admin', 'super_admin'] }, status: 0, deletedAt: null },
  });
  if (!aR) { console.error('no admin user'); process.exit(1); }
  const adminId = aR.id.toString();
  const adminPhone = aR.phone;

  const uR = await prisma.user.findFirst({
    where: { status: 0, deletedAt: null, role: { notIn: ['admin', 'super_admin'] } },
  });
  if (!uR) { console.error('no normal user'); process.exit(1); }
  const normalId = uR.id.toString();
  const normalPhone = uR.phone;

  console.log('admin: id=' + adminId + ' phone=' + adminPhone);
  console.log('normal: id=' + normalId + ' phone=' + normalPhone);

  const adminToken = jwt.sign({ sub: adminId, phone: adminPhone, role: 'admin', type: 'access', jti: 'v-admin-' + Date.now() }, JWT_SECRET, { expiresIn: '1h' });
  const normalToken = jwt.sign({ sub: normalId, phone: normalPhone, role: 'user', type: 'access', jti: 'v-normal-' + Date.now() }, JWT_SECRET, { expiresIn: '1h' });

  // P0-1: /admin/tags POST 普通用户 → 403
  let r = await http('/admin/tags', { method: 'POST', headers: { authorization: 'Bearer ' + normalToken }, body: { name: 'guard-test-' + Date.now() } });
  if (r.status === 403) ok('P0-1: /admin/tags POST 普通用户 → 403');
  else bad('P0-1 POST user', 'expected 403, got ' + r.status);

  // P0-1: /admin/tags POST admin → 通
  r = await http('/admin/tags', { method: 'POST', headers: { authorization: 'Bearer ' + adminToken }, body: { name: 'verify-p0-1-' + Date.now() } });
  if (r.status === 201 || r.status === 409) ok('P0-1: /admin/tags POST admin → ' + r.status);
  else bad('P0-1 POST admin', 'expected 201/409, got ' + r.status);

  // P0-2: /categories POST 普通用户 → 403
  r = await http('/categories', { method: 'POST', headers: { authorization: 'Bearer ' + normalToken }, body: { name: 'x', code: 'xtest' + Date.now(), sortOrder: 99 } });
  if (r.status === 403) ok('P0-2: /categories POST 普通用户 → 403');
  else bad('P0-2 POST user', 'expected 403, got ' + r.status);

  // P0-2: /categories/:id PATCH 普通用户 → 403
  r = await http('/categories/1', { method: 'PATCH', headers: { authorization: 'Bearer ' + normalToken }, body: { name: 'hack' } });
  if (r.status === 403) ok('P0-2: /categories PATCH 普通用户 → 403');
  else bad('P0-2 PATCH user', 'expected 403, got ' + r.status);

  // P0-2: /categories/:id DELETE 普通用户 → 403
  r = await http('/categories/99999', { method: 'DELETE', headers: { authorization: 'Bearer ' + normalToken } });
  if (r.status === 403) ok('P0-2: /categories DELETE 普通用户 → 403');
  else bad('P0-2 DELETE user', 'expected 403, got ' + r.status);

  // P0-2: /categories/:id GET 公开 → 200
  r = await http('/categories/1');
  if (r.status === 200) ok('P0-2: /categories/:id GET 公开 OK');
  else bad('P0-2 GET', 'expected 200, got ' + r.status);

  // P0-4: passed+active 帖子 GET → 200
  const passed = await prisma.post.findFirst({ where: { auditStatus: 'passed', status: 'active', deletedAt: null } });
  if (passed) {
    r = await http('/posts/' + passed.id);
    if (r.status === 200) ok('P0-4: passed+active 帖子 GET → 200');
    else bad('P0-4 active', 'expected 200, got ' + r.status);
  }

  // P0-4: pending 帖子匿名访问 → 404
  const pending = await prisma.post.findFirst({ where: { auditStatus: 'pending', deletedAt: null } });
  if (pending) {
    r = await http('/posts/' + pending.id);
    if (r.status === 404) ok('P0-4: pending 帖子匿名 → 404');
    else bad('P0-4 pending', 'expected 404, got ' + r.status);
  } else {
    console.log('  (no pending post, skip)');
  }

  // P0-4: deleted 帖子匿名访问 → 404
  const deleted = await prisma.post.findFirst({ where: { status: 'deleted' } });
  if (deleted) {
    r = await http('/posts/' + deleted.id);
    if (r.status === 404) ok('P0-4: deleted 帖子匿名 → 404');
    else bad('P0-4 deleted', 'expected 404, got ' + r.status);
  } else {
    console.log('  (no deleted post, skip)');
  }

  // P0-6: /posts/me/stats → 200 + postsCount/commentsCount 字段
  r = await http('/posts/me/stats', { headers: { authorization: 'Bearer ' + normalToken } });
  if (r.status === 200 && r.body && r.body.data && typeof r.body.data.postsCount === 'number') {
    ok('P0-6: /posts/me/stats → 200, postsCount=' + r.body.data.postsCount + ' commentsCount=' + r.body.data.commentsCount);
  } else bad('P0-6', 'expected 200 + postsCount field, got ' + r.status + ' ' + JSON.stringify(r.body).slice(0, 150));

  // P0-7: status=2 用户被拦
  const banPhone = '139' + String(Date.now()).slice(-8);
  const banUser = await prisma.user.create({ data: { phone: banPhone, nickname: 'banned-test', status: 2, role: 'user' } });
  const banId = banUser.id.toString();
  const banToken = jwt.sign({ sub: banId, phone: banPhone, role: 'user', type: 'access', jti: 'v-ban-' + Date.now() }, JWT_SECRET, { expiresIn: '1h' });
  r = await http('/auth/me', { headers: { authorization: 'Bearer ' + banToken } });
  if (r.status === 401) ok('P0-7: status=2 用户调 /auth/me → 401');
  else bad('P0-7', 'expected 401, got ' + r.status + ' ' + JSON.stringify(r.body).slice(0, 100));
  await prisma.user.delete({ where: { id: banUser.id } });

  // P0-5: ai_usage_logs 表存在
  try {
    await prisma.aiUsageLog.count();
    ok('P0-5: ai_usage_logs 表存在 (Prisma 可查询)');
  } catch (e) {
    bad('P0-5', 'ai_usage_logs 表缺失: ' + e.message);
  }

  // P0-3: 编辑 passed 帖子 → audit_status=pending
  const edit = await prisma.post.findFirst({
    where: { auditStatus: 'passed', status: 'active', deletedAt: null, userId: uR.id },
  });
  if (edit) {
    const newTitle = edit.title + ' (verify-p0-3)';
    r = await http('/posts/' + edit.id, { method: 'PATCH', headers: { authorization: 'Bearer ' + normalToken }, body: { title: newTitle } });
    if (r.status === 200) {
      const after = await prisma.post.findUnique({ where: { id: edit.id } });
      if (after && after.auditStatus === 'pending') ok('P0-3: 编辑 passed 帖子 → audit_status=pending');
      else bad('P0-3 audit', 'expected pending, got ' + (after && after.auditStatus));
      // 还原
      await prisma.post.update({ where: { id: edit.id }, data: { title: edit.title, auditStatus: 'passed', auditReason: null } });
    } else bad('P0-3', 'PATCH failed ' + r.status + ' ' + JSON.stringify(r.body).slice(0, 150));
  } else {
    console.log('  (no passed post owned by normal user, skip P0-3)');
  }

  await prisma.$disconnect();

  console.log('\n===== 验证结果 =====');
  for (const x of results) {
    console.log('  [' + x.status + '] ' + x.name + (x.detail ? ' — ' + x.detail : ''));
  }
  console.log('\n' + pass + ' PASS / ' + fail + ' FAIL');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(function (e) { console.error('FATAL', e); process.exit(2); });