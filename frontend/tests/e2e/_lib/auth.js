/**
 * auth.js — 多角色登录 + token cache
 * admin/user_normal (via SMS), banned/soft-deleted (走 DB 直连 seed 已知账号)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { call } = require('./http');

const ADMIN_PHONE = '13800000000'; // seed admin
const ADMIN_PASSWORD = 'Test123456';

const tokenCache = new Map(); // phone -> {accessToken, refreshToken}

function readEnv(key) {
  try {
    // _lib/auth.js 在 frontend/tests/e2e/_lib/, 4 级 .. 才到 repo root
    const txt = fs.readFileSync(path.join(__dirname, '../../../../backend/.env'), 'utf8');
    const m = txt.match(new RegExp(`^${key}=(.+)$`, 'm'));
    if (m) return m[1].trim();
  } catch {}
  return process.env[key] || '';
}

const JWT_SECRET = readEnv('JWT_SECRET');

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
    const dockerOut = execSync('docker logs yichun-backend --tail 500 2>&1', {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    const matches = [...dockerOut.matchAll(re)];
    if (matches.length > 0) return matches[matches.length - 1][1];
  } catch {}
  return null;
}

/**
 * 用 SMS 登录 (先发短信, 读 docker log 取码, 再 login-sms)
 * 自动注册 user_normal
 * 60s 同号 cooldown 时返回 null (调用方应该 skip)
 */
async function loginBySms(phone, { sleepMs = 2200 } = {}) {
  if (tokenCache.has(phone)) return tokenCache.get(phone);
  const send = await call('POST', `${API}/auth/sms-code`, { body: { phone } });
  if (send.status === 429) return null;
  if (![200, 201].includes(send.status)) {
    throw new Error(`sms-code ${send.status}: ${JSON.stringify(send.body)}`);
  }
  await new Promise((r) => setTimeout(r, sleepMs));
  const code = getSmsCodeFromLog(phone);
  if (!code) throw new Error(`未取到 phone=${phone} 的 SMS 码`);
  const login = await call('POST', `${API}/auth/login-sms`, { body: { phone, code } });
  if (login.status === 429) return null; // IP throttle
  if (login.status !== 201) {
    throw new Error(`login-sms ${login.status}: ${JSON.stringify(login.body)}`);
  }
  const pair = login.body.data;
  const tok = { ...pair, phone };
  tokenCache.set(phone, tok);
  return tok;
}

/** 用密码登录 (admin) */
async function loginByPassword(phone, password) {
  const cacheKey = `pwd:${phone}`;
  if (tokenCache.has(cacheKey)) return tokenCache.get(cacheKey);
  const r = await call('POST', `${API}/auth/login-password`, { body: { phone, password } });
  if (r.status === 429) return null;
  if (r.status !== 201) {
    throw new Error(`login-password ${r.status}: ${JSON.stringify(r.body)}`);
  }
  const pair = r.body.data;
  const tok = { ...pair, phone };
  tokenCache.set(cacheKey, tok);
  return tok;
}

const API = process.env.API || 'http://localhost:3001/api/v1';

/**
 * 双 token 都拿到: admin 走密码, 普通用户走 SMS
 * 容忍 429 → null (调用方 skip)
 */
async function getAdminToken() {
  return loginByPassword(ADMIN_PHONE, ADMIN_PASSWORD);
}

async function getUserToken(phone) {
  return loginBySms(phone);
}

function resetTokenCache() {
  tokenCache.clear();
}

module.exports = {
  API, ADMIN_PHONE, ADMIN_PASSWORD, JWT_SECRET,
  getSmsCodeFromLog,
  loginBySms, loginByPassword,
  getAdminToken, getUserToken, resetTokenCache,
};
