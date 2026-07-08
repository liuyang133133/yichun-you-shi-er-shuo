/**
 * jwt.js — 手签 JWT (用于维度 10/11 测试)
 * 镜像 @nestjs/jwt 默认的 HS256 签法
 *
 * payload 示例:
 *   signJwt({ sub: '1', role: 'user' }, { expiresIn: -10 })  // 过期
 *   signJwt({ sub: '1' }, { alg: 'none' })                   // alg-none 攻击 (无签名)
 *   signJwt({ sub: '1', role: 'admin' }, { secret: 'wrong' }) // 错签名
 */
const crypto = require('crypto');

function b64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s) {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
}

function signJwt(payload, opts = {}) {
  const alg = opts.alg || 'HS256';
  const header = { alg, typ: 'JWT' };
  const headerB64 = b64url(JSON.stringify(header));
  const body = { ...payload };
  // 设置过期时间
  if (opts.expiresIn !== undefined) {
    const now = Math.floor(Date.now() / 1000);
    body.exp = now + opts.expiresIn; // 负数表示已过期
    body.iat = now - 10;
  } else if (opts.iatOnly) {
    // 仅设置 iat (如 V1-A-P0-03 used 手签过期 token)
    body.iat = Math.floor(Date.now() / 1000) - 60;
  }
  const payloadB64 = b64url(JSON.stringify(body));
  const signingInput = `${headerB64}.${payloadB64}`;
  if (alg === 'none') {
    return `${signingInput}.`; // 无签名段
  }
  const secret = opts.secret || process.env.JWT_SECRET_DEFAULT;
  if (!secret) {
    throw new Error('JWT_SECRET env not set (export JWT_SECRET_DEFAULT=...)');
  }
  const sig = crypto.createHmac('sha256', secret).update(signingInput).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${signingInput}.${sig}`;
}

/**
 * 制造各类"恶意" token 变体
 */
const tokenFactory = {
  validAdmin: (secret) => signJwt({
    sub: '1', phone: '13800000000', role: 'admin', type: 'access',
    jti: 'valid-admin-' + Date.now(),
  }, { secret }),
  expired: (secret) => signJwt({
    sub: '1', phone: '13800000000', role: 'admin', type: 'access',
    jti: 'expired-' + Date.now(),
  }, { secret, expiresIn: -10 }),
  wrongSecret: () => signJwt({
    sub: '1', phone: '13800000000', role: 'super_admin', type: 'access',
    jti: 'wrong-' + Date.now(),
  }, { secret: 'x'.repeat(64), expiresIn: 3600 }),
  algNone: () => signJwt({
    sub: '1', phone: '13800000000', role: 'admin', type: 'access',
    jti: 'algnone-' + Date.now(),
  }, { alg: 'none', expiresIn: 3600 }),
  noSub: (secret) => signJwt({
    phone: '13800000000', role: 'admin', type: 'access',
    jti: 'nosub-' + Date.now(),
  }, { secret, expiresIn: 3600 }),
  refreshAsAccess: (secret) => signJwt({
    sub: '1', phone: '13800000000', role: 'admin', type: 'refresh',
    jti: 'refresh-' + Date.now(),
  }, { secret, expiresIn: 86400 }),
  /** 用合法 token 但篡改 payload 中的 role (篡改签名 → 失败) */
  tamperedAdmin: (validToken) => {
    const parts = validToken.split('.');
    const payload = JSON.parse(b64urlDecode(parts[1]));
    payload.role = 'super_admin';
    // 重新以错签名拼接, 让 JwtStrategy 校验失败
    const tamperedPayload = b64url(JSON.stringify(payload));
    return `${parts[0]}.${tamperedPayload}.WRONG_SIGNATURE`;
  },
};

module.exports = { signJwt, tokenFactory };
