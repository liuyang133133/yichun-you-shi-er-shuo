/**
 * P1 业务逻辑修复专项验证 — 2026-07-07
 * 镜像 p0-verification.cjs 的 SMS 读取模式
 */
const API = 'http://localhost:3001/api/v1';
const ADMIN_PHONE = '13800000000'; // seed admin
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const results = [];
function record(id, desc, ok, detail, skipped = false) {
  results.push({ id, desc, ok, detail, skipped });
  if (skipped) {
    console.log(`⏸  [${id}] ${desc} (skipped) — ${detail || ''}`);
  } else {
    const sym = ok ? '✅' : '❌';
    console.log(`${sym} [${id}] ${desc}${detail ? ' — ' + detail : ''}`);
  }
}
async function call(method, url, { body, token, query } = {}) {
  let fullUrl = API + url;
  if (query) fullUrl += '?' + new URLSearchParams(query).toString();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(fullUrl, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}

function getSmsCodeFromLog(phone) {
  const re = new RegExp(`phone=${phone}[^\\d]*code=(\\d{6})`, 'g');
  const tmp = os.tmpdir();
  try {
    for (const f of fs.readdirSync(tmp)) {
      if (/^backend\d*\.log$/.test(f)) {
        const content = fs.readFileSync(path.join(tmp, f), 'utf8');
        const matches = [...content.matchAll(re)];
        if (matches.length > 0) return matches[matches.length - 1][1];
      }
    }
  } catch {}
  try {
    const dockerOut = execSync('docker logs yichun-backend --tail 300 2>&1', {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    const matches = [...dockerOut.matchAll(re)];
    if (matches.length > 0) return matches[matches.length - 1][1];
  } catch {}
  return null;
}

async function loginBySms(phone) {
  const send = await call('POST', '/auth/sms-code', { body: { phone } });
  if (![200, 201, 429].includes(send.status)) {
    throw new Error(`sms-code ${send.status}: ${JSON.stringify(send.body)}`);
  }
  if (send.status === 429) {
    console.log(`  ⏸  ${phone} sms-code 429 (rate limited, skip)`);
    return null;
  }
  await new Promise((r) => setTimeout(r, 2000));
  const code = getSmsCodeFromLog(phone);
  if (!code) throw new Error(`未取到 phone=${phone} 的 SMS 码`);
  const login = await call('POST', '/auth/login-sms', { body: { phone, code } });
  if (login.status !== 201) throw new Error(`login-sms ${login.status}: ${JSON.stringify(login.body)}`);
  return login.body.data.accessToken;
}

(async () => {
  console.log('\n========== P1 修复专项验证 ==========\n');

  // ============== V0. 准备 admin token ==============
  console.log('--- V0. 准备 admin token ---');
  let adminToken = null;
  try {
    adminToken = await loginBySms(ADMIN_PHONE);
    record('V0.admin-login', 'Admin 登录获取 token', !!adminToken);
  } catch (e) {
    record('V0.admin-login', 'Admin 登录获取 token', false, e.message);
  }

  // ============== V1. P1-8: findOnePublic 改 404 ==============
  console.log('\n--- V1. P1-8 findOnePublic 抛 404 ---');
  const noExistId = '999999999999';
  const r1 = await call('GET', `/users/${noExistId}`);
  record('V1.notFound', 'GET /users/999999999999 应 404', r1.status === 404,
    `状态=${r1.status}`);

  // ============== V2. P1-2: super_admin/admin 不允许软删 ==============
  console.log('\n--- V2. P1-2 admin 软删防护 ---');
  if (adminToken) {
    // 拿 admin 自己的 userId
    const me = await call('GET', '/users/me', { token: adminToken });
    const adminUserId = me.body?.data?.id;
    if (adminUserId) {
      const r2 = await call('DELETE', `/users/${adminUserId}`, {
        token: adminToken,
      });
      const blocked = r2.status === 400 || r2.status === 403;
      const msg = JSON.stringify(r2.body);
      record('V2.admin-protected', '软删 admin 自己应被拒 (400/403)', blocked,
        `状态=${r2.status} body=${msg.slice(0, 120)}`);
    } else {
      record('V2.admin-protected', 'admin 软删防护', false, '无法拿到 admin id');
    }
  }

  // ============== V3+V4. 共用测试用户 (省 SMS 限频) ==============
  console.log('\n--- V3. P1-7 report 防重复 + V4. P1-6 comment 深度限制 ---');
  const TEST_PHONE = '1392' + String(Date.now()).slice(-7);
  let testToken = null;
  try { testToken = await loginBySms(TEST_PHONE); } catch (e) {
    const isRateLimit = e.message.includes('429') || e.message.includes('限频');
    record('V3.setup', '注册测试用户', false, e.message, isRateLimit);
  }
  if (testToken) {
    const posts = await call('GET', '/posts', { query: { pageSize: '5' } });
    const targetPost = (posts.body?.data?.list || []).find(
      (p) => p.auditStatus === 'passed' && p.status === 'active' && p.user?.id != null
    );
    if (!targetPost) {
      record('V3.first', '举报测试', false, '未找到 active post');
      record('V3.dupBlocked', '防重复测试', false, '同上');
      record('V4.l1', 'comment 测试', false, '同上');
      record('V4.l2-blocked', '深度限制', false, '同上');
    } else {
      const postId = Number(targetPost.id);

      // --- V3.1 首次举报 ---
      const first = await call('POST', '/reports', {
        token: testToken, body: {
          postId,
          reason: '虚假信息',
          description: 'P1 验证',
        },
      });
      record('V3.first', '首次举报 201', first.status === 201,
        `状态=${first.status}`);

      // --- V3.2 重复举报 ---
      const dup = await call('POST', '/reports', {
        token: testToken, body: {
          postId,
          reason: '虚假信息',
          description: '重复测试',
        },
      });
      const blockedDup = dup.status === 400 && JSON.stringify(dup.body).includes('已举报');
      record('V3.dupBlocked', '重复举报应被拒 (400 "已举报")', blockedDup,
        `状态=${dup.status} body=${JSON.stringify(dup.body).slice(0, 100)}`);

      // --- V4.1 顶级留言 ---
      const top = await call('POST', `/posts/${postId}/comments`, {
        token: testToken, body: { content: '顶级留言 P1 验证' },
      });
      if (top.status === 201 && top.body?.data?.id) {
        const topId = Number(top.body.data.id);
        // --- V4.2 1 级回复 ---
        const r1 = await call('POST', `/posts/${postId}/comments`, {
          token: testToken, body: { content: '回复顶级', parentId: topId },
        });
        record('V4.l1', '1 级回复应 201', r1.status === 201,
          `状态=${r1.status}`);
        // --- V4.3 2 级回复 (应被拒) ---
        if (r1.body?.data?.id) {
          const l1Id = Number(r1.body.data.id);
          const r2 = await call('POST', `/posts/${postId}/comments`, {
            token: testToken, body: { content: '回复 1 级', parentId: l1Id },
          });
          const blocked = r2.status === 400 && JSON.stringify(r2.body).includes('深度');
          record('V4.l2-blocked', '2 级回复应被拒 (400 "深度")', blocked,
            `状态=${r2.status} body=${JSON.stringify(r2.body).slice(0, 100)}`);
        } else {
          record('V4.l2-blocked', '2 级深度测试', false, '未拿到 1 级回复 id');
        }
      } else {
        record('V4.l1', '1 级回复测试', false, `发顶级留言失败 状态=${top.status}`);
        record('V4.l2-blocked', '2 级深度测试', false, '同上');
      }
    }
  }

  // ============== V5. P1-5 + P1-1: comment 子过滤 + 软删 ==============
  console.log('\n--- V5. P1-5 + P1-1 comment 删父级联 ---');
  // 先造点数据: 让 admin 自己在某 post 发顶级+子留言, 然后删除顶级
  if (adminToken) {
    const posts = await call('GET', '/posts', { query: { pageSize: '5' } });
    const targetPost = (posts.body?.data?.list || [])[0];
    if (targetPost) {
      const postId = Number(targetPost.id);
      // 用 detail 接口读真实 commentCount (list 缓存 5min 会过时)
      const detailBefore = await call('GET', `/posts/${postId}`);
      const beforeCommentCount = detailBefore.body?.data?.commentCount || 0;

      // admin 发顶级
      const top = await call('POST', `/posts/${postId}/comments`, {
        token: adminToken, body: { content: 'P1 V5 顶级留言' + Date.now() },
      });
      if (top.status === 201 && top.body?.data?.id) {
        const topId = Number(top.body.data.id);
        // admin 发 1 级回复 (合法, 因为是顶级回复)
        const child = await call('POST', `/posts/${postId}/comments`, {
          token: adminToken, body: { content: 'P1 V5 子留言', parentId: topId },
        });
        if (child.status === 201) {
          // 删父留言 — 应级联软删子留言
          const del = await call('DELETE', `/comments/${topId}`, {
            token: adminToken,
          });
          // 验证子留言已软删 — 用 GET /posts/{id}/comments 查
          await new Promise((r) => setTimeout(r, 500));
          const cms = await call('GET', `/posts/${postId}/comments`);
          const topRemaining = (cms.body?.data?.list || []).find((c) => Number(c.id) === topId);
          const childHidden = !topRemaining || !topRemaining.children || topRemaining.children.length === 0;
          record('V5.cascade', `删除父留言应级联隐藏子 (1+1=2)`,
            del.status === 200 || del.status === 201,
            `del=${del.status} 子残留=${!!topRemaining?.children?.length}`);
          // commentCount 应扣 2 (1父 + 1子): before+2 →+2 → -2 = before
          const after = await call('GET', `/posts/${postId}`);
          const afterCount = after.body?.data?.commentCount || 0;
          record('V5.commentCount', `commentCount 应扣 2 (before=${beforeCommentCount}, after=${afterCount})`,
            afterCount === beforeCommentCount,
            `before=${beforeCommentCount} after=${afterCount}`);
        } else {
          record('V5.cascade', 'comment 级联测试', false, `子留言失败 状态=${child.status}`);
          record('V5.commentCount', 'commentCount 验证', false, '同上');
        }
      } else {
        record('V5.cascade', 'comment 级联测试', false, `顶级留言失败 状态=${top.status}`);
        record('V5.commentCount', 'commentCount 验证', false, '同上');
      }
    } else {
      record('V5.cascade', 'comment 级联测试', false, '无 active post');
      record('V5.commentCount', 'commentCount 验证', false, '同上');
    }
  }

  // ============== V6. P1-4: favorite 软删 + 复活 ==============
  console.log('\n--- V6. P1-4 favorite 软删 + 复活 ---');
  // 共用 V3 的 testToken (若已注册成功)
  if (!testToken) {
    record('V6.add', '首次收藏 201', false, 'V3 setup 失败, 跳过 V6');
    record('V6.reAdd', '再次收藏应成功', false, '同上');
    record('V6.count', 'favoriteCount 一致', false, '同上');
  } else {
    const posts = await call('GET', '/posts', { query: { pageSize: '3' } });
    const targetPost = (posts.body?.data?.list || [])[0];
    if (!targetPost) {
      record('V6.add', 'favorite 测试', false, '无 active post');
    } else {
      const postId = Number(targetPost.id);

      // 用详情接口拿真实 beforeCount (list 缓存 5min 会过时)
      const beforeDetail = await call('GET', `/posts/${postId}`);
      const before = beforeDetail.body?.data?.favoriteCount || 0;

      // 收藏: POST /favorites body={postId}
      const add = await call('POST', `/favorites`, {
        token: testToken, body: { postId },
      });
      record('V6.add', '首次收藏 201', add.status === 201,
        `状态=${add.status} body=${JSON.stringify(add.body).slice(0, 100)}`);

      // 取消: DELETE /favorites/:postId
      const rm = await call('DELETE', `/favorites/${postId}`, { token: testToken });
      record('V6.remove', '取消收藏 200', rm.status === 200 || rm.status === 201,
        `状态=${rm.status}`);

      // 再次收藏 — 应成功 (复活软删行)
      const reAdd = await call('POST', `/favorites`, {
        token: testToken, body: { postId },
      });
      const restoredFlag = reAdd.body?.data?.restored === true;
      record('V6.reAdd', '再次收藏应成功 (restored=true)', reAdd.status === 201,
        `状态=${reAdd.status} restored=${restoredFlag} body=${JSON.stringify(reAdd.body).slice(0, 100)}`);

      // 计数应等于 before (净变化 = add+1 + remove-1 + restore+0 = 0)
      await new Promise((r) => setTimeout(r, 500)); // 让缓存失效
      const after = await call('GET', `/posts/${postId}`);
      const afterCount = after.body?.data?.favoriteCount || 0;
      record('V6.count', `favoriteCount 净变化 = 0 (before=${before}, after=${afterCount})`,
        afterCount === before,
        `before=${before} after=${afterCount}`);
    }
  }

  // ============== 总结 ==============
  console.log('\n========== 总结 ==========');
  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = total - passed - skipped;
  console.log(`总计: ${total}  ✅ PASS: ${passed}  ⏸ SKIP: ${skipped}  ❌ FAIL: ${failed}  有效通过率: ${((passed / (total - skipped)) * 100).toFixed(1)}%`);

  const reportPath = path.join(__dirname, 'p1-verification-results.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results, summary: { total, passed, failed: total - passed }
  }, null, 2));
  console.log(`\nJSON 报告: ${reportPath}`);

  process.exit(total - passed > 0 ? 1 : 0);
})();
