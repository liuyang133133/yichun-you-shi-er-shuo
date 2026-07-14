/**
 * verify-p0-dto.cjs — 验证 admin-post DTO 修复
 * 5 个端点的超长 body 应 4xx 不再 500
 */
const { call } = require('./_lib/http');
const { loginByPassword } = require('./_lib/auth');

(async () => {
  const API = 'http://localhost:3001/api/v1';
  const admin = await loginByPassword('13800000000', 'Test123456');
  const token = admin.accessToken;
  console.log('admin login: OK');

  const hugeReason = 'a'.repeat(70000);
  const hugeIds = Array.from({ length: 200 }, (_, i) => String(i));
  const results = [];

  // 1. /admin/posts/999999999/audit 超长 reason
  const r1 = await call('POST', `${API}/admin/posts/999999999/audit`, {
    token,
    body: { action: 'reject', reason: hugeReason },
  });
  results.push({
    test: 'POST /admin/posts/999999999/audit {reason:70k}',
    expected: '4xx (validation reject)',
    actual: r1.status,
    pass: r1.status >= 400 && r1.status < 500,
  });

  // 2. /admin/posts/999999999/offline 超长 reason
  const r2 = await call('POST', `${API}/admin/posts/999999999/offline`, {
    token,
    body: { reason: hugeReason },
  });
  results.push({
    test: 'POST /admin/posts/999999999/offline {reason:70k}',
    expected: '4xx',
    actual: r2.status,
    pass: r2.status >= 400 && r2.status < 500,
  });

  // 3. /admin/posts/audit-batch 超长 reason
  const r3 = await call('POST', `${API}/admin/posts/audit-batch`, {
    token,
    body: { ids: ['1'], action: 'pass', reason: hugeReason },
  });
  results.push({
    test: 'POST /admin/posts/audit-batch {reason:70k}',
    expected: '4xx',
    actual: r3.status,
    pass: r3.status >= 400 && r3.status < 500,
  });

  // 4. /admin/posts/offline-batch 超长 reason
  const r4 = await call('POST', `${API}/admin/posts/offline-batch`, {
    token,
    body: { ids: ['1'], reason: hugeReason },
  });
  results.push({
    test: 'POST /admin/posts/offline-batch {reason:70k}',
    expected: '4xx',
    actual: r4.status,
    pass: r4.status >= 400 && r4.status < 500,
  });

  // 5. /admin/posts/purge 负数 daysOld
  const r5 = await call('POST', `${API}/admin/posts/purge`, {
    token,
    body: { daysOld: -1 },
  });
  results.push({
    test: 'POST /admin/posts/purge {daysOld:-1}',
    expected: '4xx (validation reject)',
    actual: r5.status,
    pass: r5.status >= 400 && r5.status < 500,
  });

  // 6. /admin/posts/audit-batch 200 ids
  const r6 = await call('POST', `${API}/admin/posts/audit-batch`, {
    token,
    body: { ids: hugeIds, action: 'pass' },
  });
  results.push({
    test: 'POST /admin/posts/audit-batch {ids:200}',
    expected: '4xx (validation reject)',
    actual: r6.status,
    pass: r6.status >= 400 && r6.status < 500,
  });

  // 7. /admin/posts/audit 非枚举 action
  const r7 = await call('POST', `${API}/admin/posts/999999999/audit`, {
    token,
    body: { action: 'banana' },
  });
  results.push({
    test: 'POST /admin/posts/999999999/audit {action:banana}',
    expected: '4xx (validation reject)',
    actual: r7.status,
    pass: r7.status >= 400 && r7.status < 500,
  });

  // 8. /admin/posts/audit 正常 (postId 不存在 → 404)
  const r8 = await call('POST', `${API}/admin/posts/999999999/audit`, {
    token,
    body: { action: 'pass' },
  });
  results.push({
    test: 'POST /admin/posts/999999999/audit {action:pass}',
    expected: 404,
    actual: r8.status,
    pass: r8.status === 404,
  });

  // 9. /admin/posts/purge 正常
  const r9 = await call('POST', `${API}/admin/posts/purge`, {
    token,
    body: { daysOld: 30 },
  });
  results.push({
    test: 'POST /admin/posts/purge {daysOld:30}',
    expected: '2xx',
    actual: r9.status,
    pass: r9.status >= 200 && r9.status < 300,
  });

  console.log('\n=== admin-post DTO 验证结果 ===');
  for (const r of results) {
    const mark = r.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark}  ${r.test}  (${r.actual})`);
  }
  const pass = results.filter((r) => r.pass).length;
  console.log(`\n${pass}/${results.length} 通过`);
  process.exit(pass === results.length ? 0 : 1);
})();