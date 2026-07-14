/**
 * P0 业务逻辑修复专项验证 — 2026-07-07
 * 镜像 v1-acceptance.cjs 的 SMS 读取模式 (docker logs yichun-backend)
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
  // 1) 本地 dev log
  try {
    for (const f of fs.readdirSync(tmp)) {
      if (/^backend\d*\.log$/.test(f)) {
        const content = fs.readFileSync(path.join(tmp, f), 'utf8');
        const matches = [...content.matchAll(re)];
        if (matches.length > 0) return matches[matches.length - 1][1];
      }
    }
  } catch {}
  // 2) docker logs
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
  console.log('\n========== P0 修复专项验证 ==========\n');

  // ============== V0. 准备 admin token ==============
  console.log('--- V0. 准备 admin token ---');
  let adminToken = null;
  try {
    adminToken = await loginBySms(ADMIN_PHONE);
    record('V0.admin-login', 'Admin 登录获取 token', !!adminToken);
  } catch (e) {
    record('V0.admin-login', 'Admin 登录获取 token', false, e.message);
    console.log('  ⚠️  Admin SMS 限频, V3/V4/V6 后续测试将跳过');
  }

  // ============== V1. B-P0-01 敏感词过滤 (post) ==============
  console.log('\n--- V1. B-P0-01 敏感词过滤 ---');
  const SENS_PHONE = '13900001111';
  let userToken = null;
  try {
    userToken = await loginBySms(SENS_PHONE);
  } catch (e) {
    record('V1.setup', '注册普通用户', false, e.message);
  }
  if (userToken) {
    // 找 house 分类
    const cats = await call('GET', '/categories', { query: { tree: 'true' } });
    let houseCat = null;
    function findHouse(arr) {
      for (const c of arr || []) {
        if (c.code === 'house') { houseCat = c; return; }
        if (c.children) findHouse(c.children);
      }
    }
    if (cats.body?.data) findHouse(cats.body.data);
    if (houseCat) {
      // 发帖含敏感词
      const sensRes = await call('POST', '/posts', {
        token: userToken,
        body: {
          type: 'house', categoryId: Number(houseCat.id),
          title: '赌博场所出租', description: '正常描述', price: 1000,
        },
      });
      // 拦截依据: status 400 + body 含 "违规" 或 "敏感"
      const sensBody = JSON.stringify(sensRes.body);
      const isBlocked = sensRes.status === 400 && (sensBody.includes('违规') || sensBody.includes('敏感'));
      record('V1.post.sensitive', '发帖含"赌博"敏感词应被拦截 (400)', isBlocked,
        `状态=${sensRes.status} body=${sensBody.slice(0, 120)}`);

      // 正常帖
      const cleanRes = await call('POST', '/posts', {
        token: userToken,
        body: {
          type: 'house', categoryId: Number(houseCat.id),
          title: '正常房屋出租', description: '正常描述', price: 1000,
        },
      });
      record('V1.post.clean', '正常发帖应通过', cleanRes.status === 201,
        `状态=${cleanRes.status}`);
    } else {
      record('V1.post.sensitive', '敏感词拦截', false, '未找到 house 分类');
      record('V1.post.clean', '正常发帖', false, '未找到 house 分类');
    }
  }

  // ============== V2. A-P0-01 密码登录失败计数 ==============
  console.log('\n--- V2. A-P0-01 密码登录锁定 ---');
  const LOCK_PHONE = '13900002222';
  // 先注册该手机号 (用 SMS 注册)
  try { await loginBySms(LOCK_PHONE); } catch (e) {}
  // 连续 6 次错误密码
  for (let i = 0; i < 6; i++) {
    await call('POST', '/auth/login-password', {
      body: { phone: LOCK_PHONE, password: 'WRONG_PASS' },
    });
  }
  // 第 7 次应 429
  const lockCheck = await call('POST', '/auth/login-password', {
    body: { phone: LOCK_PHONE, password: 'WRONG_PASS' },
  });
  record('V2.locked', '5+ 次错误后 429 锁定', lockCheck.status === 429,
    `状态=${lockCheck.status} body=${JSON.stringify(lockCheck.body).slice(0, 100)}`);

  // ============== V3. A-P0-02 JWT Kill Switch ==============
  console.log('\n--- V3. A-P0-02 JWT Kill Switch ---');
  // 4位前缀 + 7位时间戳后缀 = 11位手机号
  const KILL_PHONE = '1390' + String(Date.now()).slice(-7);
  let killToken = null;
  try { killToken = await loginBySms(KILL_PHONE); } catch (e) {
    const isRateLimit = e.message.includes('429') || e.message.includes('限频');
    record('V3.setup', '注册 Kill Switch 测试用户', false, e.message, isRateLimit);
  }
  if (killToken && adminToken) {
    // Ban 前
    const before = await call('GET', '/users/me', { token: killToken });
    record('V3.before', 'Ban 前 token 有效', before.status === 200,
      `状态=${before.status}`);

    // 找 userId
    const userList = await call('GET', '/admin/users', {
      token: adminToken, query: { page: '1', pageSize: '100' },
    });
    const list = userList.body?.data?.list || [];
    const found = list.find((u) => u.phone === KILL_PHONE);
    if (found) {
      // Ban
      const banRes = await call('POST', `/admin/users/${found.id}/ban`, {
        token: adminToken, body: { reason: 'P0 测试 - Kill Switch 验证' },
      });
      record('V3.ban', 'Admin ban 用户', banRes.status === 200 || banRes.status === 201,
        `状态=${banRes.status}`);

      // 立即用旧 token 调
      const after = await call('GET', '/users/me', { token: killToken });
      record('V3.killed', 'Ban 后旧 token 立即失效 (401)', after.status === 401,
        `状态=${after.status} (期望 401)`);
    } else {
      record('V3.killed', 'Ban 后旧 token 立即失效', false, '未在 admin user list 找到刚注册用户');
    }
  } else {
    record('V3.killed', 'Ban 后旧 token 立即失效', false, '无法获取 token');
  }

  // ============== V4. B-P0-02 restore auditStatus=pending ==============
  console.log('\n--- V4. B-P0-02 admin restore auditStatus=pending ---');
  if (adminToken) {
    const posts = await call('GET', '/admin/posts', {
      token: adminToken, query: { includeDeleted: 'true', pageSize: '50' },
    });
    const list = posts.body?.data?.list || [];
    const offlinePost = list.find((p) => p.status === 'deleted');
    if (offlinePost) {
      const restoreRes = await call('POST', `/admin/posts/${offlinePost.id}/restore`, {
        token: adminToken,
      });
      record('V4.restore', 'Restore 软删帖', restoreRes.status === 200 || restoreRes.status === 201,
        `状态=${restoreRes.status}`);

      // 公开列表不应见
      const pubList = await call('GET', '/posts', { query: { type: offlinePost.type, pageSize: '50' } });
      const inList = (pubList.body?.data?.list || []).find((p) => String(p.id) === String(offlinePost.id));
      record('V4.hidden', 'Restore 后公开列表不可见 (auditStatus=pending)', !inList,
        `inList=${!!inList}`);
    } else {
      record('V4.restore', 'Restore 软删帖', false, '未找到已下架帖 (留 skip)');
      record('V4.hidden', 'Restore 后公开列表不可见', false, '同上 skip');
    }
  }

  // ============== V5. B-P0-03 列表只展示 auditStatus=passed ==============
  console.log('\n--- V5. B-P0-03 公开列表 auditStatus 过滤 ---');
  const publicList = await call('GET', '/posts', { query: { type: 'house', pageSize: '20' } });
  const items = publicList.body?.data?.list || [];
  const allPassed = items.every((p) => !p.auditStatus || p.auditStatus === 'passed');
  record('V5.public', `公开列表 (${items.length} 条) 全部 auditStatus=passed`, allPassed,
    `全部 passed=${allPassed}`);

  // ============== V6. D-P0-01 招满拦截 ==============
  console.log('\n--- V6. D-P0-01 招满拦截 ---');
  if (adminToken) {
    const jobs = await call('GET', '/admin/posts', {
      token: adminToken, query: { type: 'job', pageSize: '20' },
    });
    const jobList = jobs.body?.data?.list || [];
    if (jobList.length > 0) {
      // 用一个唯一手机号 (避免 SMS 限频), 4位前缀 + 7位后缀 = 11位
      const APPLY_PHONE = '1391' + String(Date.now()).slice(-7);
      let applyToken = null;
      try { applyToken = await loginBySms(APPLY_PHONE); } catch (e) {
        const isRateLimit = e.message.includes('429') || e.message.includes('限频');
        record('V6.setup', '注册投递测试用户', false, e.message, isRateLimit);
      }
      if (applyToken) {
        // 创建简历
        await call('PUT', '/resumes/me', {
          token: applyToken, body: { name: '测试', expectedPosition: 'any' },
        });
        // 先找该 post 的 postJob id
        const detail = await call('GET', `/posts/${jobList[0].id}`);
        const postJobId = detail.body?.data?.job?.id;
        if (postJobId) {
          const applyRes = await call('POST', '/applications', {
            token: applyToken, body: { postJobId: Number(postJobId), coverLetter: 'P0 测试' },
          });
          // 期望: 201 (投递成功) 或 409 (招满或重复), 都不应 500
          const okStatus = applyRes.status === 201 || applyRes.status === 409;
          record('V6.apply', `投递请求 (状态=${applyRes.status}, 不应为 500)`, okStatus,
            `body=${JSON.stringify(applyRes.body).slice(0, 100)}`);
          // 再次投递 (同一 postJob 应被拒 — 或招满)
          const applyRes2 = await call('POST', '/applications', {
            token: applyToken, body: { postJobId: Number(postJobId), coverLetter: '重复' },
          });
          if (applyRes2.status === 409) {
            const msg = JSON.stringify(applyRes2.body);
            const isFull = msg.includes('招满');
            const isDup = msg.includes('已经投递');
            record('V6.duplicate', '重复投递 409', true,
              isFull ? '招满拦截生效' : isDup ? '重复检测生效' : '其他 409');
          } else {
            record('V6.duplicate', '重复投递 409', false, `状态=${applyRes2.status}`);
          }
        } else {
          record('V6.apply', '招满检查', false, 'post 无 postJob 详情');
        }
      } else {
        record('V6.apply', '招满检查', false, '无法获取 applyToken');
      }
    } else {
      record('V6.apply', '招满检查', false, '无 job 帖 (留 skip)');
    }
  }

  // ============== V7. D-P0-03 消息撤回 ==============
  console.log('\n--- V7. D-P0-03 消息撤回端点 ---');
  if (userToken && adminToken) {
    // 拿 admin id
    const adminMe = await call('GET', '/users/me', { token: adminToken });
    const adminId = adminMe.body?.data?.id;
    if (adminId) {
      // 发正常消息
      const sendRes = await call('POST', '/messages', {
        token: userToken, body: {
          receiverId: Number(adminId),
          content: 'P0 撤回测试 ' + Date.now(),
        },
      });
      if (sendRes.status === 201) {
        const msgId = sendRes.body?.data?.id;
        if (msgId) {
          const recallRes = await call('POST', `/messages/${msgId}/recall`, { token: userToken });
          record('V7.recall', '撤回未读消息', recallRes.status === 200 || recallRes.status === 201,
            `状态=${recallRes.status} body=${JSON.stringify(recallRes.body).slice(0, 100)}`);
        } else {
          record('V7.recall', '撤回未读消息', false, '未拿到 msgId');
        }
      } else {
        record('V7.recall', '撤回未读消息', false, `发消息失败 状态=${sendRes.status}`);
      }

      // 测试 remove (任一方)
      const sendRes2 = await call('POST', '/messages', {
        token: userToken, body: {
          receiverId: Number(adminId),
          content: 'P0 remove 测试',
        },
      });
      if (sendRes2.status === 201) {
        const msgId = sendRes2.body?.data?.id;
        if (msgId) {
          const delRes = await call('DELETE', `/messages/${msgId}`, { token: userToken });
          record('V7.remove', '删除消息', delRes.status === 200 || delRes.status === 201,
            `状态=${delRes.status} body=${JSON.stringify(delRes.body).slice(0, 100)}`);
        } else {
          record('V7.remove', '删除消息', false, '未拿到 msgId');
        }
      } else {
        record('V7.remove', '删除消息', false, `发消息失败 状态=${sendRes2.status}`);
      }
    }
  }

  // ============== 总结 ==============
  console.log('\n========== 总结 ==========');
  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = total - passed - skipped;
  console.log(`总计: ${total}  ✅ PASS: ${passed}  ⏸ SKIP: ${skipped}  ❌ FAIL: ${failed}  有效通过率: ${((passed / (total - skipped)) * 100).toFixed(1)}%`);

  const reportPath = path.join(__dirname, 'p0-verification-results.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results, summary: { total, passed, failed: total - passed }
  }, null, 2));
  console.log(`\nJSON 报告: ${reportPath}`);

  process.exit(total - passed > 0 ? 1 : 0);
})();
