/**
 * verify-p0-fixes.cjs — 验证 3 个 P0 admin seo 修复
 * 用 admin token 测:
 *   1. POST /admin/ai/regenerate-seo/999999999 → 应 404 (原 500)
 *   2. POST /admin/seo/push-baidu            → 应 503 (原 500)
 *   3. POST /admin/ai/regenerate-seo-batch  → 应 200 (原 超时)
 */
const { call } = require('./_lib/http');
const { loginByPassword } = require('./_lib/auth');

(async () => {
  const API = 'http://localhost:3001/api/v1';
  let admin;
  try {
    admin = await loginByPassword('13800000000', 'Test123456');
    console.log('admin login: OK');
  } catch (e) {
    console.error('admin login FAIL:', e.message);
    process.exit(1);
  }
  const token = admin.accessToken;

  const results = [];

  // ====== Test 1: regenerate-seo with non-existent postId ======
  const t1Start = Date.now();
  const r1 = await call('POST', `${API}/admin/ai/regenerate-seo/999999999`, {
    token,
  });
  const t1Dur = Date.now() - t1Start;
  const r1OK = r1.status === 404;
  results.push({
    test: 'POST /admin/ai/regenerate-seo/999999999',
    expected: 404,
    actual: r1.status,
    pass: r1OK,
    durationMs: t1Dur,
    body: r1.body,
  });

  // ====== Test 2: push-baidu without BAIDU_PUSH_TOKEN ======
  const t2Start = Date.now();
  const r2 = await call('POST', `${API}/admin/seo/push-baidu`, {
    token,
    body: {},
  });
  const t2Dur = Date.now() - t2Start;
  const r2OK = r2.status === 503;
  results.push({
    test: 'POST /admin/seo/push-baidu (no BAIDU_PUSH_TOKEN)',
    expected: 503,
    actual: r2.status,
    pass: r2OK,
    durationMs: t2Dur,
    body: r2.body,
  });

  // ====== Test 3: regenerate-seo-batch with limit=200 (overflow) ======
  const t3Start = Date.now();
  const r3 = await call('POST', `${API}/admin/ai/regenerate-seo-batch`, {
    token,
    body: { postIds: null, limit: 200 },
  });
  const t3Dur = Date.now() - t3Start;
  const r3OK = r3.status === 201 && t3Dur < 35000; // 应立即返 + 不超过 35s
  results.push({
    test: 'POST /admin/ai/regenerate-seo-batch {limit:200}',
    expected: '201 fast (<35s)',
    actual: `${r3.status} (${t3Dur}ms)`,
    pass: r3OK,
    durationMs: t3Dur,
    body: r3.body,
  });

  console.log('\n=== P0 修复验证结果 ===');
  for (const r of results) {
    const mark = r.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark}  ${r.test}`);
    console.log(`        expected=${r.expected}, actual=${r.actual}, ${r.durationMs}ms`);
    if (!r.pass) console.log(`        body=${JSON.stringify(r.body).slice(0, 200)}`);
  }
  const pass = results.filter((r) => r.pass).length;
  console.log(`\n${pass}/${results.length} 通过`);
  process.exit(pass === results.length ? 0 : 1);
})();