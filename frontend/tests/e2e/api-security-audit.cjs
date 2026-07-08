/**
 * api-security-audit.cjs — 主审计脚本
 *
 * Usage:
 *   node api-security-audit.cjs --layer=L1   # 全部端点 x 3 用例 (正常 + 状态码 + 响应统一)
 *   node api-security-audit.cjs --layer=L2   # 写端点 x 8 用例 (L1+异常+空+权限+超长+重复)
 *   node api-security-audit.cjs --layer=L3   # 12 高风险端点 x 13 维度全跑
 *   node api-security-audit.cjs --layer=L3 --endpoints=auth
 *
 * 默认: --layer=L1, --filter=public (避免 SMS throttle)
 */
const fs = require('fs');
const path = require('path');

// ===== CLI =====
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v || true];
  })
);
const LAYER = args.layer || 'L1';
const FILTER_AUTH = args.filter || (LAYER === 'L1' ? 'all' : 'jwt');
const FILTER_MODULE = args.endpoints || null;
const PARALLEL = parseInt(args.parallel || '4');

// ===== Libs =====
const { call, hasStackLeak, isUnifiedShape } = require('./_lib/http');
const { API, ADMIN_PHONE, ADMIN_PASSWORD, JWT_SECRET,
  loginBySms, loginByPassword, getAdminToken, getUserToken } = require('./_lib/auth');
const { tokenFactory } = require('./_lib/jwt');
const { runConcurrent } = require('./_lib/concurrent');
const { writeReports } = require('./_lib/reporter');
const { ENDPOINTS, getAllEndpoints, getEndpointsByAuth, substitutePathParams } = require('./_lib/discovery');
const { SQLI, XSS, INVALID_TYPE, MISSING, OVERSIZED, BYPASS, EMPTY_AUTH, EXPECTED_STATUS } = require('./_lib/payloads');
const { SAMPLES, QUERY_SAMPLES, getSample, findHouseCategory } = require('./_lib/samples');

// ===== Init shared state =====
process.env.JWT_SECRET_DEFAULT = JWT_SECRET;
if (!process.env.JWT_SECRET_DEFAULT) {
  console.error('FATAL: JWT_SECRET not loaded from backend/.env');
  process.exit(2);
}

const results = []; // 测试结果

let adminToken = null;
let adminRefresh = null;
let userToken = null;
let testHouseCategoryId = null;
let testPostsId = null;

function record(r) {
  results.push(r);
  const sym = r.outcome === 'PASS' ? '✅'
    : r.outcome === 'FAIL' ? '❌'
    : r.outcome === 'ISSUE' ? '⚠️'
    : r.outcome === 'SKIP' ? '⏸'
    : '?';
  console.log(`${sym} [${r.method} ${r.path}] dim${r.dim} ${r.testName}` +
    (r.outcome !== 'PASS' ? ` — ${r.outcome} (${r.actualStatus})` : '') +
    (r.note ? ` — ${r.note}` : ''));
}

function classifyOutcome({ actualStatus, expected }) {
  // expected: array of ok codes (e.g. [200, 201])
  // PASS if actual matches; FAIL if not in expected but expected had ≥1 code and actual is 5xx (server bug); ISSUE otherwise
  if (!actualStatus) return { outcome: 'FAIL', severity: 'P2', note: 'connection failed' };
  const expectedArr = Array.isArray(expected) ? expected : [expected];
  if (expectedArr.includes(actualStatus)) return { outcome: 'PASS' };
  if (expectedArr.includes(4) /* 4xx range pseudo */) {
    if (actualStatus >= 400 && actualStatus < 500) return { outcome: 'PASS' };
  }
  if (expectedArr.includes('2xx')) {
    if (actualStatus >= 200 && actualStatus < 300) return { outcome: 'PASS' };
  }
  // Servers should never 5xx on input validation
  if (actualStatus >= 500) {
    return { outcome: 'FAIL', severity: 'P0', note: `server bug: 5xx on input` };
  }
  // 4xx is generally OK for bad input, but if we expected 2xx we have auth/perm bug
  if (actualStatus === 401 && !expectedArr.includes(401)) {
    return { outcome: 'ISSUE', severity: 'P1', note: 'auth required (expected public)' };
  }
  if (actualStatus === 403 && !expectedArr.includes(403)) {
    return { outcome: 'ISSUE', severity: 'P1', note: 'forbidden (expected OK)' };
  }
  // catch-all
  return { outcome: 'ISSUE', severity: 'P2', note: `unexpected ${actualStatus}, expected ${expectedArr}` };
}

// ===== 维度 1: 正常参数 (L1) =====
async function dim1_normal(method, path, opts) {
  const url = API + path;
  const sampleBody = opts.needBody ? getSample(method, path, { houseCategoryId: testHouseCategoryId }) : undefined;
  const sampleQuery = method === 'GET' ? getQuerySample(path) : undefined;
  const useToken = pickToken(opts, path);
  const res = await call(method, url, {
    method,
    body: sampleBody,
    query: sampleQuery,
    token: useToken,
  });
  // OK / Created / No Content / Not Found (resource not exist) 都是可接受
  const expected = method === 'GET'
    ? [200, 401, 403, 404]
    : [200, 201, 204, 400, 401, 403, 404, 409];
  const cls = classifyOutcome({ actualStatus: res.status, expected });
  record({
    method, path, dim: 1, testName: '正常参数',
    outcome: cls.outcome, severity: cls.severity,
    actualStatus: res.status, expected,
    note: cls.note,
    latencyMs: res.latencyMs,
  });
  // 响应统一性检查
  if (res.body && !isUnifiedShape(res.body)) {
    record({
      method, path, dim: 12, testName: '响应统一 (L1)',
      outcome: 'ISSUE', severity: 'P3',
      actualStatus: res.status, expected: 'unified shape',
      note: `body keys: ${Object.keys(res.body).join(',')}`,
    });
  }
}

// ===== 维度 13: 状态码 + dim12: 响应统一 =====
function dim13_status(method, path, result) {
  // merge into dim1 result's status (above)
}

// ===== 维度 2: 异常类型 =====
async function dim2_invalid(method, path, opts) {
  const url = API + path;
  const token = pickToken(opts, path);
  const payloads = [
    INVALID_TYPE.stringAsArray,
    INVALID_TYPE.enumOutOfRange,
    INVALID_TYPE.invalidDate,
    INVALID_TYPE.numericFloat,
    INVALID_TYPE.forbidNonWhitelisted,
  ];
  for (const body of payloads) {
    const res = await call(method, url, {
      method, body: method !== 'GET' ? body : undefined,
      query: method === 'GET' ? body : undefined,
      token,
    });
    // 401/403 表示 auth 拦截 (正常, 因为 input 没经过 auth gate)
    // 其他 4xx 表示 validation 拦截
    // 5xx 是 P0 bug
    const isOk = (res.status >= 400 && res.status < 500)
      || res.status === 401 || res.status === 403;
    const isServerBug = res.status >= 500;
    const cls = isServerBug
      ? { outcome: 'FAIL', severity: 'P0', note: `5xx on invalid body: ${(res.text || '').slice(0, 80)}` }
      : isOk
        ? { outcome: 'PASS', note: `invalid body → ${res.status}` }
        : { outcome: 'ISSUE', severity: 'P2', note: `unexpected ${res.status}` };
    record({
      method, path, dim: 2, testName: `异常类型 (${Object.keys(body).slice(0, 2).join(',')})`,
      ...cls, actualStatus: res.status, expected: '4xx (含 401/403 auth 拦截)',
    });
  }
}

// ===== 维度 3: 空/缺失 =====
async function dim3_missing(method, path, opts) {
  const url = API + path;
  const token = pickToken(opts, path);
  const cases = [MISSING.emptyObject, MISSING.nullFields, MISSING.emptyString, MISSING.whitespace];
  for (const body of cases) {
    const res = await call(method, url, {
      method, body: method !== 'GET' ? body : undefined,
      query: method === 'GET' ? body : undefined,
      token,
    });
    // 401/403 auth 拦截也算 OK
    const isOk = (res.status >= 400 && res.status < 500) || res.status === 401 || res.status === 403;
    record({
      method, path, dim: 3, testName: `空/缺失 (${Object.values(body).slice(0, 1).join(',')})`,
      outcome: isOk ? 'PASS' : (res.status >= 500 ? 'FAIL' : 'ISSUE'),
      severity: res.status >= 500 ? 'P0' : (isOk ? undefined : 'P3'),
      actualStatus: res.status, expected: '4xx (含 401/403)',
      note: isOk ? '' : `${res.status}`,
    });
  }
}

// ===== 维度 4: 超长 =====
async function dim4_oversized(method, path, opts) {
  const url = API + path;
  const token = pickToken(opts, path);
  for (const [key, val] of Object.entries(OVERSIZED)) {
    const body = method === 'GET' ? { q: val } : { title: val, description: val };
    const res = await call(method, url, {
      method, body: method !== 'GET' ? body : undefined,
      query: method === 'GET' ? body : undefined,
      token,
      timeoutMs: 10000,
    });
    // 401/403 auth 拦截也算 OK
    const isOk = (res.status >= 400 && res.status < 500) || res.status === 401 || res.status === 403;
    record({
      method, path, dim: 4, testName: `超长 (${key})`,
      outcome: isOk ? 'PASS' : (res.status >= 500 ? 'FAIL' : 'ISSUE'),
      severity: res.status >= 500 ? 'P0' : (isOk ? undefined : 'P3'),
      actualStatus: res.status, expected: '4xx (不 OOM)',
    });
  }
}

// ===== 维度 5: SQL 注入 =====
async function dim5_sqli(method, path, opts) {
  const url = API + path;
  const token = pickToken(opts, path);
  for (const payload of SQLI) {
    const isQueryLike = path.includes('search') || path.includes('posts') && method === 'GET';
    const body = isQueryLike ? undefined : { phone: payload, content: payload, title: payload };
    const query = isQueryLike ? { q: payload, keyword: payload } : undefined;
    const res = await call(method, url, { method, body, query, token });
    // 401/403 auth 拦截也算 OK
    const isOk = (res.status >= 400 && res.status < 500) || res.status === 401 || res.status === 403;
    const leakedSql = res.text && /\bSELECT\b|\bDROP\b|Error: SQL/i.test(res.text);
    record({
      method, path, dim: 5, testName: `SQL 注入 (${payload.slice(0, 30)}...)`,
      outcome: isOk ? 'PASS' : (res.status >= 500 ? 'FAIL' : 'ISSUE'),
      severity: (res.status >= 500 || leakedSql) ? 'P0' : (isOk ? undefined : 'P2'),
      actualStatus: res.status, expected: '4xx',
      note: leakedSql ? 'SQL 关键字出现在响应中!' : (isOk ? '拦截' : `${res.status}`),
    });
  }
}

// ===== 维度 6: XSS =====
async function dim6_xss(method, path, opts) {
  const url = API + path;
  const token = pickToken(opts, path);
  for (const payload of XSS) {
    const body = { title: payload, description: payload, content: payload, name: payload };
    const res = await call(method, url, { method, body, token });
    // 后端 JSON 端点不会"执行" XSS; 主要检查 Content-Type + 字段被原样保留 (下游自己防)
    const okCt = !res.contentType || res.contentType.includes('application/json');
    const is4xx = res.status >= 400 && res.status < 500;
    record({
      method, path, dim: 6, testName: `XSS (${payload.slice(0, 30)})`,
      outcome: (okCt && (is4xx || res.status === 201 || res.status === 200)) ? 'PASS'
        : (res.status >= 500 ? 'FAIL' : 'ISSUE'),
      severity: res.status >= 500 ? 'P0' : ((!okCt) ? 'P1' : 'P3'),
      actualStatus: res.status, expected: 'JSON CT, 200/201/4xx',
      note: res.contentType || '',
    });
  }
}

// ===== 维度 9: 权限 bypass =====
async function dim9_bypass(method, path, opts) {
  const url = API + path;
  const cases = [
    { name: '无 token', rawToken: undefined, expected: 401 },
    { name: '空 token', rawToken: '', expected: 401 },
    { name: 'null token', rawToken: 'null', expected: 401 },
    { name: '过期 token', useExpired: true, expected: 401 },
    { name: '错签名 token', useWrongSecret: true, expected: 401 },
    { name: 'alg=none', useAlgNone: true, expected: 401 },
  ];
  for (const tc of cases) {
    let token;
    let useTokenOpts = {};
    if (tc.useExpired) token = tokenFactory.expired(JWT_SECRET);
    else if (tc.useWrongSecret) token = tokenFactory.wrongSecret();
    else if (tc.useAlgNone) token = tokenFactory.algNone();
    else if (tc.rawToken !== undefined) useTokenOpts.rawToken = tc.rawToken;
    else continue;

    const sampleBody = opts.needBody ? getSample(method, path, { houseCategoryId: testHouseCategoryId }) : undefined;
    const res = await call(method, url, { method, body: sampleBody, token, ...useTokenOpts });
    const ok = res.status === tc.expected;
    record({
      method, path, dim: 9, testName: `权限 bypass: ${tc.name}`,
      outcome: ok ? 'PASS' : (res.status === 200 || res.status === 201 ? 'FAIL' : 'ISSUE'),
      severity: (res.status === 200 || res.status === 201) ? 'P0' : 'P3',
      actualStatus: res.status, expected: tc.expected,
      note: ok ? '' : `expected ${tc.expected} got ${res.status}`,
    });
  }
}

// ===== 维度 11: Token 空 (header 变种) =====
async function dim11_emptyAuth(method, path, opts) {
  for (const tc of EMPTY_AUTH) {
    const url = API + path;
    const res = await call(method, url, {
      method,
      body: opts.needBody ? getSample(method, path) : undefined,
      token: undefined,
      ...tc,
    });
    const ok = res.status === 401 || res.status === 400;
    record({
      method, path, dim: 11, testName: `Token 空 header (${JSON.stringify(tc)})`,
      outcome: ok ? 'PASS' : 'ISSUE',
      severity: 'P3',
      actualStatus: res.status, expected: 401,
    });
  }
}

// ===== 维度 8: 并发 =====
async function dim8_concurrent(method, path, opts) {
  // 仅对 POST/PATCH/DELETE, GET 跳过 (无副作用)
  if (method === 'GET') { record({ method, path, dim: 8, testName: '并发 (skip GET)', outcome: 'SKIP' }); return; }
  const body = opts.needBody ? getSample(method, path) : undefined;
  const token = pickToken(opts, path);
  const stats = await runConcurrent('concurrency', async () => call(method, API + path, {
    method, body, token,
  }), 5); // 5 并发, 避免 IP throttle
  // 至少看到 1 个 200/201 表示成功, 不应该全 5xx
  const hasSuccess = (stats.byStatus[200] || 0) + (stats.byStatus[201] || 0) > 0;
  const noCrash = (stats.byStatus[500] || 0) === 0;
  record({
    method, path, dim: 8, testName: `并发 N=5`,
    outcome: (hasSuccess && noCrash) ? 'PASS' : 'ISSUE',
    severity: 'P2',
    actualStatus: Object.entries(stats.byStatus).map(([k, v]) => `${k}:${v}`).join(','),
    expected: '200/201 + no 5xx',
    note: `elapsed ${stats.elapsedMs}ms`,
  });
}

// ===== 维度 7: 重复 =====
async function dim7_duplicate(method, path, opts) {
  if (method === 'GET') { record({ method, path, dim: 7, testName: '重复 (skip GET)', outcome: 'SKIP' }); return; }
  const token = pickToken(opts, path);
  const body = opts.needBody ? getSample(method, path) : undefined;
  const results407 = [];
  for (let i = 0; i < 3; i++) {
    const res = await call(method, API + path, { method, body, token });
    results407.push(res.status);
  }
  // 3 次连发, 期望至少 1 次 201 + 后续 409/200 (幂等) 或 全失败
  const codes = results407.join(',');
  const ok = codes.includes('201') || codes.includes('200');
  record({
    method, path, dim: 7, testName: `重复 x3`,
    outcome: ok ? 'PASS' : 'ISSUE',
    severity: 'P3',
    actualStatus: codes,
    expected: '201 + 409 or all-OK idempotent',
  });
}

// ===== dim10: 过期 token =====
async function dim10_expired(method, path, opts) {
  const expiredTok = tokenFactory.expired(JWT_SECRET);
  const res = await call(method, API + path, {
    method,
    body: opts.needBody ? getSample(method, path) : undefined,
    token: expiredTok,
  });
  record({
    method, path, dim: 10, testName: 'Token 过期',
    outcome: res.status === 401 ? 'PASS' : 'FAIL',
    severity: res.status === 200 || res.status === 201 ? 'P0' : 'P3',
    actualStatus: res.status, expected: 401,
    note: res.status === 401 ? '' : 'expired token 应该 401',
  });
}

// ===== dim12: 响应统一 (L2/L3) =====
async function dim12_unifiedShape(method, path, opts) {
  const url = API + path;
  const token = pickToken(opts, path);
  const sampleBody = opts.needBody ? getSample(method, path) : undefined;
  const sampleQuery = method === 'GET' ? getQuerySample(path) : undefined;
  const res = await call(method, url, { method, body: sampleBody, query: sampleQuery, token });
  if (!res.body) {
    record({ method, path, dim: 12, testName: '响应统一', outcome: 'SKIP', note: '空响应' });
    return;
  }
  const unified = isUnifiedShape(res.body);
  record({
    method, path, dim: 12, testName: '响应统一',
    outcome: unified ? 'PASS' : 'FAIL',
    severity: unified ? undefined : 'P3',
    actualStatus: res.status, expected: '{code:number, data:any}',
    note: unified ? '' : `body keys: ${Object.keys(res.body).join(',')}`,
  });
}

// ===== helpers =====
function getQuerySample(path) {
  // 精确优先
  if (QUERY_SAMPLES[path]) return QUERY_SAMPLES[path];
  for (const k of Object.keys(QUERY_SAMPLES)) {
    const re = new RegExp('^' + k.replace(/:[a-zA-Z]+/g, '[^/]+') + '$');
    if (re.test(path)) return QUERY_SAMPLES[k];
  }
  return undefined;
}

function pickToken(opts, path) {
  // Admin-only path 必须 admin
  if (opts.adminRequired) return adminToken;
  // JWT-required 或默认
  if (opts.auth === 'public') return undefined;
  if (!userToken) return adminToken || undefined; // 退而用 admin, 没 admin 就空
  return userToken;
}

// ===== Main dispatcher =====
async function runForEndpoint(ep) {
  const path = substitutePathParams(ep.path);
  const opts = { ...ep };
  // 全维度 try/catch 防一个测试异常带崩整轮
  const dimCalls = [
    () => dim1_normal(ep.method, path, opts),
  ];
  if (LAYER !== 'L1') {
    if (ep.needBody) {
      dimCalls.push(() => dim2_invalid(ep.method, path, opts));
      dimCalls.push(() => dim3_missing(ep.method, path, opts));
      dimCalls.push(() => dim4_oversized(ep.method, path, opts));
      dimCalls.push(() => dim5_sqli(ep.method, path, opts));
      dimCalls.push(() => dim6_xss(ep.method, path, opts));
      dimCalls.push(() => dim7_duplicate(ep.method, path, opts));
      dimCalls.push(() => dim8_concurrent(ep.method, path, opts));
    }
    if (ep.auth !== 'public') {
      dimCalls.push(() => dim9_bypass(ep.method, path, opts));
      dimCalls.push(() => dim10_expired(ep.method, path, opts));
      dimCalls.push(() => dim11_emptyAuth(ep.method, path, opts));
    }
    dimCalls.push(() => dim12_unifiedShape(ep.method, path, opts));
  }
  for (const fn of dimCalls) {
    try {
      await fn();
    } catch (e) {
      record({ method: ep.method, path, dim: 0, testName: 'dim runner error',
        outcome: 'FAIL', severity: 'P1', actualStatus: 0, expected: 'execute',
        note: (e.message || String(e)).slice(0, 200) });
    }
  }
}

// ===== Bootstrap =====
(async () => {
  const t0 = Date.now();

  console.log(`\n========== API 安全审计 (${LAYER}) ==========\n`);

  // 1) 获取 tokens
  console.log('— Bootstrapping tokens —');
  const adminPair = await getAdminToken();
  if (adminPair) {
    adminToken = adminPair.accessToken;
    adminRefresh = adminPair.refreshToken;
    console.log(`  admin token ✓ (role=${adminPair.user?.role || '?'})`);
  } else { console.log('  admin token ✗ (429 rate limit)'); }

  const TEST_USER_PHONE = '13900000' + String(Date.now()).slice(-3);
  try {
    const userPair = await getUserToken(TEST_USER_PHONE);
    if (userPair) {
      userToken = userPair.accessToken;
      console.log(`  user token ✓ (phone=${TEST_USER_PHONE})`);
    } else {
      console.log('  user token ✗ (429 SMS cooldown) — JWT 测试用 admin token 退而求其次');
    }
  } catch (e) {
    console.log(`  user token ✗ (${e.message.slice(0, 60)})`);
  }

  // 2) Find house category (避免传无效)
  const hc = await findHouseCategory(call);
  if (hc) testHouseCategoryId = Number(hc.id);

  console.log(`\n— Filtering: --filter=${FILTER_AUTH} --endpoints=${FILTER_MODULE || 'all'} —\n`);

  // 3) 过滤
  let eps = getAllEndpoints();
  if (FILTER_AUTH !== 'all') eps = eps.filter((e) => e.auth === FILTER_AUTH);
  if (FILTER_MODULE) eps = eps.filter((e) => e.module === FILTER_MODULE || e.path.includes(FILTER_MODULE));
  // 12 高风险 (L3)
  if (LAYER === 'L3') {
    eps = eps.filter((e) => {
      const p = e.path;
      return p.startsWith('/auth/') || p === '/upload/image'
        || p.startsWith('/admin/posts/') || p.startsWith('/admin/users/')
        || p === '/admin/notifications/broadcast' || p.startsWith('/admin/companies/');
    });
  }
  console.log(`Total endpoints to test: ${eps.length}\n`);

  // 4) 跑
  for (const ep of eps) {
    try {
      await runForEndpoint(ep);
    } catch (e) {
      record({ method: ep.method, path: ep.path, dim: 0, testName: '测试器异常',
        outcome: 'FAIL', severity: 'P1', actualStatus: 0, expected: 'execute', note: e.message });
    }
  }

  // 5) 报告
  const t1 = Date.now();
  const dim = {}; const mod = {};
  for (const r of results) {
    if (!dim[r.dim]) dim[r.dim] = { pass: 0, fail: 0, issue: 0, skip: 0 };
    if (r.outcome === 'PASS') dim[r.dim].pass++;
    else if (r.outcome === 'FAIL') dim[r.dim].fail++;
    else if (r.outcome === 'ISSUE') dim[r.dim].issue++;
    else dim[r.dim].skip++;
    const moduleKey = r.path.split('/').slice(1, 3).join('/');
    if (!mod[moduleKey]) mod[moduleKey] = { total: 0, pass: 0, fail: 0, issue: 0 };
    mod[moduleKey].total++;
    if (r.outcome === 'PASS') mod[moduleKey].pass++;
    else if (r.outcome === 'FAIL') mod[moduleKey].fail++;
    else if (r.outcome === 'ISSUE') mod[moduleKey].issue++;
  }

  const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runDir = path.join(__dirname, 'reports', `run-${runId}`);
  writeReports(runDir, {
    results,
    dimensionsSummary: dim,
    moduleSummary: mod,
    t0, t1, layer: LAYER.replace('L', ''),
  });

  const total = results.length;
  const passed = results.filter((r) => r.outcome === 'PASS').length;
  const failed = results.filter((r) => r.outcome === 'FAIL').length;
  const issues = results.filter((r) => r.outcome === 'ISSUE').length;
  const skipped = results.filter((r) => r.outcome === 'SKIP').length;
  console.log(`\n========== 总结 ==========`);
  console.log(`总计: ${total}  ✅ ${passed}  ❌ ${failed}  ⚠️ ${issues}  ⏸ ${skipped}`);
  console.log(`用时: ${Math.floor((t1 - t0) / 1000)}s`);
  console.log(`报告: ${runDir}`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(2);
});
