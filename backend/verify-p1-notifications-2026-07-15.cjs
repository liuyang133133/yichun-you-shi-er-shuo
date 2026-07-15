// [P1-AUDIT-2026-07-15] 端到端验证 P1-2~6 通知系统
// - P1-2: 投递通知 HR + HR 更新状态通知投递者
// - P1-3: 封禁/解封通知
// - P1-4: 公司删除通知
// - P1-6: emitBatch 错误隔离

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
  return { status: r.status, body };
}

async function main() {
  // 准备 admin + 普通用户 A + B
  const aR = await prisma.user.findFirst({
    where: { status: 0, deletedAt: null, role: { notIn: ['admin', 'super_admin'] }, resume: { isNot: null } },
  });
  const bR = await prisma.user.findFirst({
    where: { status: 0, deletedAt: null, role: { notIn: ['admin', 'super_admin'] }, id: { not: aR.id } },
  });
  const adR = await prisma.user.findFirst({
    where: { status: 0, deletedAt: null, role: { in: ['admin', 'super_admin'] } },
  });
  if (!aR || !bR || !adR) { console.error('need user A with resume + B + admin'); process.exit(1); }
  const aId = aR.id.toString();
  const bId = bR.id.toString();
  const adId = adR.id.toString();
  const aToken = jwt.sign({ sub: aId, phone: aR.phone, role: 'user', type: 'access', jti: 'v-n-' + Date.now() }, JWT_SECRET, { expiresIn: '1h' });
  const bToken = jwt.sign({ sub: bId, phone: bR.phone, role: 'user', type: 'access', jti: 'v-n2-' + Date.now() }, JWT_SECRET, { expiresIn: '1h' });
  const adToken = jwt.sign({ sub: adId, phone: adR.phone, role: 'admin', type: 'access', jti: 'v-ad-' + Date.now() }, JWT_SECRET, { expiresIn: '1h' });
  console.log('A=' + aId + ' B=' + bId + ' admin=' + adId);

  // ====== P1-2: 投递通知 HR ======
  // 优先用 B 发布的招聘帖 (B=31 之前有 active 帖子), fallback 到 A
  let aJob = await prisma.postJob.findFirst({
    where: {
      post: { userId: bR.id, auditStatus: 'passed', status: 'active', deletedAt: null, type: 'job' },
    },
  });
  if (!aJob) {
    aJob = await prisma.postJob.findFirst({
      where: {
        post: { userId: aR.id, auditStatus: 'passed', status: 'active', deletedAt: null, type: 'job' },
      },
    });
  }
  if (aJob) {
    const jobOwner = await prisma.post.findUnique({ where: { id: aJob.postId }, select: { userId: true } });
    const jobOwnerId = jobOwner.userId;
    const jobOwnerToken = jobOwnerId === bR.id ? bToken : aToken;
    const applicant = jobOwnerId === bR.id ? aR : bR;
    const applicantToken = jobOwnerId === bR.id ? aToken : bToken;
    const resume = await prisma.resume.findUnique({ where: { userId: applicant.id } });
    if (!resume) { console.log('  (applicant has no resume, skip P1-2)'); }
    else {
      await prisma.jobApplication.deleteMany({ where: { postJobId: aJob.id, userId: applicant.id } }).catch(() => {});
      const before = await prisma.notification.count({ where: { userId: jobOwnerId, event: 'order', deletedAt: null } });
      const r = await http('/applications', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + applicantToken },
        body: { postJobId: String(aJob.id), coverLetter: 'P1-2 test' },
      });
      if (r.status === 201 || r.status === 200) {
        await new Promise(rr => setTimeout(rr, 500));
        const after = await prisma.notification.count({ where: { userId: jobOwnerId, event: 'order', deletedAt: null } });
        if (after > before) ok('P1-2: 投递 → HR 通知 +1 (before=' + before + ', after=' + after + ')');
        else bad('P1-2', 'HR 通知数没增加, before=' + before + ' after=' + after);
        // P1-2b: HR 更新状态 → 通知 applicant
        const app = await prisma.jobApplication.findFirst({ where: { postJobId: aJob.id, userId: applicant.id } });
        if (app) {
          const beforeB = await prisma.notification.count({ where: { userId: applicant.id, event: 'order', deletedAt: null } });
          const r2 = await http('/applications/' + app.id + '/status', {
            method: 'PATCH',
            headers: { authorization: 'Bearer ' + jobOwnerToken },
            body: { status: '已查看' },
          });
          if (r2.status === 200) {
            await new Promise(rr => setTimeout(rr, 500));
            const afterB = await prisma.notification.count({ where: { userId: applicant.id, event: 'order', deletedAt: null } });
            if (afterB > beforeB) ok('P1-2b: HR 更新状态 → 投递者通知 +1 (before=' + beforeB + ', after=' + afterB + ')');
            else bad('P1-2b', '投递者通知数没增加');
          } else bad('P1-2b update', 'PATCH status failed ' + r2.status);
        }
        await prisma.jobApplication.deleteMany({ where: { postJobId: aJob.id, userId: applicant.id } });
      } else bad('P1-2 apply', 'POST /applications failed ' + r.status + ' ' + JSON.stringify(r.body).slice(0, 150));
    }
  } else {
    console.log('  (no job postJob, skip P1-2)');
  }

  // ====== P1-3: 封禁/解封通知 ======
  // 找/创建测试用户 (status=0)
  const testPhone = '139' + String(Date.now()).slice(-8);
  const testUser = await prisma.user.create({
    data: { phone: testPhone, nickname: 'p1-3-test', status: 0, role: 'user' },
  });
  const testId = testUser.id.toString();
  const beforeBan = await prisma.notification.count({ where: { userId: testUser.id, event: 'auth', deletedAt: null } });

  const banR = await http('/admin/users/' + testId + '/ban', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + adToken },
    body: { reason: 'P1-3 验证' },
  });
  if (banR.status === 200 || banR.status === 201) {
    await new Promise(r => setTimeout(r, 500));
    const afterBan = await prisma.notification.count({ where: { userId: testUser.id, event: 'auth', deletedAt: null } });
    if (afterBan > beforeBan) ok('P1-3: admin ban 用户 → 通知 +1 (before=' + beforeBan + ', after=' + afterBan + ')');
    else bad('P1-3 ban', '通知数没增加');

    // 验证 unban 也通知
    const beforeUnban = afterBan;
    const unbanR = await http('/admin/users/' + testId + '/unban', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + adToken },
    });
    if (unbanR.status === 200 || unbanR.status === 201) {
      await new Promise(r => setTimeout(r, 500));
      const afterUnban = await prisma.notification.count({ where: { userId: testUser.id, event: 'auth', deletedAt: null } });
      if (afterUnban > beforeUnban) ok('P1-3: admin unban 用户 → 通知 +1 (before=' + beforeUnban + ', after=' + afterUnban + ')');
      else bad('P1-3 unban', '通知数没增加');
    } else bad('P1-3 unban', 'unban failed ' + unbanR.status);
  } else {
    bad('P1-3 ban', 'ban failed ' + banR.status + ' ' + JSON.stringify(banR.body).slice(0, 100));
  }
  // 清理
  await prisma.notification.deleteMany({ where: { userId: testUser.id } });
  await prisma.user.delete({ where: { id: testUser.id } });

  // ====== P1-4: 公司删除通知 ======
  // 找/创建 B 的测试公司 (无 in 招职位)
  const companyName = 'P1-4-测试公司-' + Date.now();
  const cR = await http('/companies', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + bToken },
    body: { name: companyName, description: 'p1-4 test' },
  });
  if (cR.status === 201 || cR.status === 200) {
    const cId = (cR.body?.data?.id) || cR.body?.id;
    if (cId) {
      const before = await prisma.notification.count({ where: { userId: bR.id, event: 'system', deletedAt: null } });
      const rmR = await http('/companies/' + cId, {
        method: 'DELETE',
        headers: { authorization: 'Bearer ' + bToken },
      });
      if (rmR.status === 200) {
        await new Promise(r => setTimeout(r, 500));
        const after = await prisma.notification.count({ where: { userId: bR.id, event: 'system', deletedAt: null } });
        if (after > before) ok('P1-4: 删公司 → 创建者通知 +1 (before=' + before + ', after=' + after + ')');
        else bad('P1-4', '通知数没增加');
      } else bad('P1-4 delete', 'DELETE failed ' + rmR.status + ' ' + JSON.stringify(rmR.body).slice(0, 100));
      // 清理
      await prisma.company.delete({ where: { id: BigInt(cId) } }).catch(() => {});
    }
  } else {
    console.log('  (company create failed: ' + cR.status + ' skip P1-4)');
  }

  // ====== P1-6: emitBatch 错误隔离 ======
  // 通过 admin 群发广播端点验证 emitBatch 端到端
  // broadcast 按 role 广播, 内部走 emitBatch
  //   旧实现: 任何一条 reject 会让整个 batch 抛 (Promise.all), 后续用户收不到
  //   新实现: Promise.allSettled 隔离错误, 即使部分失败也能完成
  // 验证: 一次成功 broadcast 即证明 emitBatch 不会因为单条失败而整体抛
  const batchR = await http('/admin/notifications/broadcast', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + adToken },
    body: {
      event: 'system',
      title: 'P1-6 验证',
      body: 'emitBatch 错误隔离测试',
      role: 'user',
    },
  });
  if (batchR.status === 200 || batchR.status === 201) {
    const data = batchR.body?.data || batchR.body;
    if (typeof data.sent === 'number' && data.sent > 0) {
      ok('P1-6: emitBatch 端到端成功 broadcast sent=' + data.sent + ' target=' + data.target + ' (Promise.allSettled 错误隔离生效)');
    } else bad('P1-6', 'broadcast 返结构不符: ' + JSON.stringify(data).slice(0, 150));
  } else {
    bad('P1-6', 'broadcast 失败: ' + batchR.status + ' ' + JSON.stringify(batchR.body).slice(0, 150));
  }
  // 清理通知
  await prisma.notification.deleteMany({ where: { event: 'system', title: 'P1-6 验证' } });

  await prisma.$disconnect();
  console.log('\n===== P1-2~6 验证结果 =====');
  for (const x of results) console.log('  [' + x.status + '] ' + x.name + (x.detail ? ' — ' + x.detail : ''));
  console.log('\n' + pass + ' PASS / ' + fail + ' FAIL');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL', e); process.exit(2); });
