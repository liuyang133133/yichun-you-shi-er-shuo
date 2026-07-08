/**
 * http.js — fetch wrapper with metrics, headers, bigint-safe JSON
 * 镜像 p0-verification.cjs 的 call() 风格, 增补:
 *   - x-request-id 自动注入 (便于对照后端日志)
 *   - latency 测量
 *   - 显式 token / raw token (任何字符串可注入, 测 bearer 容错)
 *   - 显式 body / query (不做白名单过滤, 让攻击 payload 直接穿透)
 */
const crypto = require('crypto');

function genReqId() {
  return 'audit-' + crypto.randomBytes(8).toString('hex');
}

async function call(method, url, { body, query, token, headers = {}, timeoutMs = 30000, rawToken } = {}) {
  let fullUrl = url;
  if (query) fullUrl += (url.includes('?') ? '&' : '?') + new URLSearchParams(query).toString();
  const h = {
    'Content-Type': 'application/json',
    'x-request-id': genReqId(),
    ...headers,
  };
  if (rawToken !== undefined) {
    // rawToken 任意字符串 (含空/null/alg-none), 用于维度 11 token为空
    h['Authorization'] = rawToken === null || rawToken === ''
      ? 'Bearer '
      : `Bearer ${rawToken}`;
  } else if (token) {
    h['Authorization'] = `Bearer ${token}`;
  }
  const start = Date.now();
  let res, json = null, text = '';
  try {
    res = await fetch(fullUrl, {
      method,
      headers: h,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    text = await res.text();
    try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  } catch (e) {
    return {
      ok: false, status: 0, body: null, text: '',
      latencyMs: Date.now() - start,
      error: (e && e.message) || String(e),
      request: { method, url: fullUrl, headers: h, body },
    };
  }
  return {
    ok: res.ok,
    status: res.status,
    body: json,
    text,
    latencyMs: Date.now() - start,
    request: { method, url: fullUrl, headers: h, body },
    contentType: res.headers.get('content-type') || '',
  };
}

/**
 * 通用 5xx 检测: server-side error 同时伴有非 JSON 文本 (可能为 stack trace)
 */
function hasStackLeak(response) {
  if (response.status >= 500 && response.text) {
    return /at\s+\S+\s+\(.*:\d+:\d+\)/.test(response.text) // V8 stack frame
      || /\bat\s+Object\./.test(response.text);
  }
  return false;
}

/**
 * 响应统一性弱断言 (容忍老端点)
 */
function isUnifiedShape(body) {
  if (!body || typeof body !== 'object') return false;
  // 关键字段: code 是 number, data 是 object | null (允许旧端点无 data)
  const hasCode = typeof body.code === 'number';
  const hasDataKey = 'data' in body;
  return hasCode && hasDataKey;
}

module.exports = { call, hasStackLeak, isUnifiedShape, genReqId };
