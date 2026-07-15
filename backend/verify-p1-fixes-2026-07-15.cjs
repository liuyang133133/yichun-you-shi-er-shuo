// [P1-AUDIT-2026-07-15] 端到端验证 4 个 P1 修复
// - P1-1: 评论/回复触发通知
// - P1-7: /me/favorites 过滤已删/已拒
// - P1-8: 禁止自收藏
// - P1-11: 公司公开列表过滤 deletedAt

const jwt = require('/app/node_modules/jsonwebtoken');
const { PrismaClient } = require('/app/node_modules/@prisma/client');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) { console.error('JWT_SECRET missing'); process.exit(1); }

const BASE = process.env.VERIFY_BASE || 'http://backend:3001/api/v1';
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
  // 准备两个普通用户 (A 和 B) 用来测试互相评论/回复通知
  let aR = await prisma.user.findFirst({
    where: { status: 0, deletedAt: null, role: { notIn: ['admin', 'super_admin'] } },
  });
  if (!aR) { console.error('no normal user A'); process.exit(1); }
  const aId = aR.id.toString();
  const aPhone = aR.phone;

  let bR = await prisma.user.findFirst({
    where: { status: 0, deletedAt: null, role: { notIn: ['admin', 'super_admin'] }, id: { not: aR.id } },
  });
  if (!bR) { console.error('no normal user B (different from A)'); process.exit(1); }
  const bId = bR.id.toString();
  const bPhone = bR.phone;

  const aToken = jwt.sign({ sub: aId, phone: aPhone, role: 'user', type: 'access', jti: 'v-p1a-' + Date.now() }, JWT_SECRET, { expiresIn: '1h' });
  const bToken = jwt.sign({ sub: bId, phone: bPhone, role: 'user', type: 'access', jti: 'v-p1b-' + Date.now() }, JWT_SECRET, { expiresIn: '1h' });

  console.log('user A: id=' + aId + ' phone=' + aPhone);
  console.log('user B: id=' + bId + ' phone=' + bPhone);

  // ====== P1-7: /me/favorites 过滤已删/已拒帖子 ======
  // 准备: 找 user A 自己的一个 passed+active 帖子 (B 收藏它, 不触发 P1-8 自收藏拦截)
  const activePost = await prisma.post.findFirst({
    where: { userId: aR.id, auditStatus: 'passed', status: 'active', deletedAt: null },
  });
  if (activePost) {
    // 先清掉 B 之前对这个帖子的收藏
    await prisma.favorite.deleteMany({ where: { userId: bR.id, postId: activePost.id } }).catch(() => {});
    // 用 B 收藏 A 的帖子 (避免触发 P1-8 自收藏拦截)
    const r = await http('/favorites', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + bToken },
      body: { postId: String(activePost.id) },
    });
    if (r.status === 201 || r.status === 200) {
      // 验证 list 包含
      const lr = await http('/favorites', { headers: { authorization: 'Bearer ' + bToken } });
      const list = lr.body?.data?.list || lr.body?.list || [];
      const found = list.some((f) => String(f.post?.id || f.postId) === String(activePost.id));
      if (found) ok('P1-7 step1: active post 在 /favorites 列表');
      else bad('P1-7 step1', 'active post 不在列表中, 列表长度=' + list.length);
    } else {
      bad('P1-7 favorite', 'favorite POST failed ' + r.status + ' ' + JSON.stringify(r.body).slice(0, 100));
    }

    // 关键: 把 post 改成 rejected (模拟审核拒绝), 看 list 是否排除
    await prisma.post.update({ where: { id: activePost.id }, data: { auditStatus: 'rejected' } });
    const lr2 = await http('/favorites', { headers: { authorization: 'Bearer ' + bToken } });
    const list2 = lr2.body?.data?.list || lr2.body?.list || [];
    const found2 = list2.some((f) => String(f.post?.id || f.postId) === String(activePost.id));
    if (!found2) ok('P1-7: rejected 帖子已从 /favorites 列表排除');
    else bad('P1-7', 'rejected 帖子仍出现在列表, P1-7 修复失败');
    // 还原
    await prisma.post.update({ where: { id: activePost.id }, data: { auditStatus: 'passed' } });
    // 清理
    await prisma.favorite.deleteMany({ where: { userId: bR.id, postId: activePost.id } });
  } else {
    console.log('  (no passed+active post owned by A, skip P1-7)');
  }

  // ====== P1-8: 禁止自收藏 ======
  // 用 A 的帖子, A 收藏自己的帖子 → 应 400
  if (activePost) {
    const r = await http('/favorites', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + aToken },
      body: { postId: String(activePost.id) },
    });
    if (r.status === 400 && /自己|自|self/i.test(r.body?.message || '')) {
      ok('P1-8: 自收藏被拒 → ' + r.body.message);
    } else if (r.status === 400) {
      ok('P1-8: 自收藏被拒 (400) — ' + (r.body?.message || ''));
    } else {
      bad('P1-8', 'expected 400, got ' + r.status + ' ' + JSON.stringify(r.body).slice(0, 100));
    }
    // 清理 (万一 add 没拦, 也清掉)
    await prisma.favorite.deleteMany({ where: { userId: aR.id, postId: activePost.id } });
  }

  // ====== P1-11: 公司公开列表过滤 deletedAt ======
  // 找 A 创建的一个公司, 软删
  const aCompany = await prisma.company.findFirst({
    where: { creatorUserId: aR.id, deletedAt: null },
  });
  if (aCompany) {
    const id = aCompany.id;
    // 公开 list 中应包含
    const r1 = await http('/companies');
    const list1 = r1.body?.data?.list || r1.body?.list || [];
    const found1 = list1.some((c) => String(c.id) === String(id));
    if (found1) ok('P1-11 step1: active company 在公开列表');
    else console.log('  (company not in list, skip P1-11 step1)');
    // 软删
    await prisma.company.update({ where: { id }, data: { deletedAt: new Date() } });
    const r2 = await http('/companies');
    const list2 = r2.body?.data?.list || r2.body?.list || [];
    const found2 = list2.some((c) => String(c.id) === String(id));
    if (!found2) ok('P1-11: 软删 company 已从公开列表排除');
    else bad('P1-11', '软删 company 仍在公开列表, 修复失败');
    // 公开详情也应 404
    const r3 = await http('/companies/' + id);
    if (r3.status === 404) ok('P1-11: 软删 company 公开详情 → 404');
    else bad('P1-11 detail', 'expected 404, got ' + r3.status);
    // 还原
    await prisma.company.update({ where: { id }, data: { deletedAt: null } });
  } else {
    console.log('  (no company owned by A, skip P1-11)');
  }

  // ====== P1-1: 评论/回复触发通知 ======
  // 用 B 给 A 的帖子评论, A 应收到通知
  if (activePost) {
    // 记下 A 当前通知数
    const before = await prisma.notification.count({ where: { userId: aR.id, event: 'comment', deletedAt: null } });
    // B 评论
    const r = await http('/posts/' + activePost.id + '/comments', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + bToken },
      body: { content: 'P1-1 验证评论通知' + Date.now() },
    });
    if (r.status === 201 || r.status === 200) {
      // 短暂等待 ws/emit (容错)
      await new Promise((r) => setTimeout(r, 500));
      const after = await prisma.notification.count({ where: { userId: aR.id, event: 'comment', deletedAt: null } });
      if (after > before) ok('P1-1: B 评论 A 的帖子 → A 通知 +1 (before=' + before + ', after=' + after + ')');
      else bad('P1-1', 'A 通知数没增加 (before=' + before + ', after=' + after + '), emit 没触发');
    } else {
      bad('P1-1 create', 'comment create failed ' + r.status + ' ' + JSON.stringify(r.body).slice(0, 100));
    }
  } else {
    console.log('  (no post to test P1-1)');
  }

  await prisma.$disconnect();

  console.log('\n===== P1 验证结果 =====');
  for (const x of results) {
    console.log('  [' + x.status + '] ' + x.name + (x.detail ? ' — ' + x.detail : ''));
  }
  console.log('\n' + pass + ' PASS / ' + fail + ' FAIL');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(function (e) { console.error('FATAL', e); process.exit(2); });
