import { test, expect } from '@playwright/test';

/**
 * T-005: 操作日志查询页 E2E
 *
 * 流程：
 *   1. 登录 admin，调 POST /admin/users/:id/ban 触发一条 AuditLog
 *   2. GET /admin/audit-logs 验证能查到
 *   3. 7 种筛选各自验证
 *   4. GET /admin/audit-logs/export 验证 CSV 头 + BOM
 *   5. GET /admin/audit-logs/:id 验证详情
 *   6. GET /admin/audit-logs/options 验证下拉数据
 */

const ADMIN_PHONE = '13800000000';
const ADMIN_PASSWORD = 'test123456';
const API = '/api/v1';

test.describe('T-005 操作日志查询', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const r = await request.post(`${API}/auth/login-password`, {
      data: { phone: ADMIN_PHONE, password: ADMIN_PASSWORD },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    token = data.data.accessToken;
  });

  test('1) GET /admin/audit-logs 默认返回记录', async ({ request }) => {
    const r = await request.get(`${API}/admin/audit-logs?pageSize=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(data.data.list.length).toBeGreaterThan(0);
    expect(data.data.total).toBeGreaterThan(0);

    // 验证新字段
    const log = data.data.list[0];
    expect(log).toHaveProperty('adminPhone');
    expect(log).toHaveProperty('ip');
    expect(log).toHaveProperty('userAgent');
    expect(log).toHaveProperty('requestId');
  });

  test('2) 7 种筛选', async ({ request }) => {
    // 2.1) module
    let r = await request.get(`${API}/admin/audit-logs?module=user&pageSize=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let data = await r.json();
    for (const log of data.data.list) expect(log.module).toBe('user');

    // 2.2) action
    r = await request.get(`${API}/admin/audit-logs?action=ban&pageSize=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    data = await r.json();
    for (const log of data.data.list) expect(log.action).toBe('ban');

    // 2.3) adminUserId
    r = await request.get(`${API}/admin/audit-logs?adminUserId=1&pageSize=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    data = await r.json();
    for (const log of data.data.list) expect(log.adminUserId).toBe('1');

    // 2.4) targetType
    r = await request.get(`${API}/admin/audit-logs?targetType=post&pageSize=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    data = await r.json();
    for (const log of data.data.list) expect(log.targetType).toBe('post');

    // 2.5) targetId (取 ban 的某一条)
    if (data.data.list.length > 0) {
      const banLog = data.data.list.find((l: any) => l.action === 'ban');
      if (banLog) {
        r = await request.get(`${API}/admin/audit-logs?targetId=${banLog.targetId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        data = await r.json();
        for (const log of data.data.list) expect(log.targetId).toBe(banLog.targetId);
      }
    }

    // 2.6) from（未来时间应返回空）
    const future = new Date(Date.now() + 86400000).toISOString();
    r = await request.get(`${API}/admin/audit-logs?from=${future}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    data = await r.json();
    expect(data.data.list.length).toBe(0);

    // 2.7) to（过去时间应返回空）
    const past = new Date(Date.now() - 86400000).toISOString();
    r = await request.get(`${API}/admin/audit-logs?to=${past}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    data = await r.json();
    expect(data.data.list.length).toBe(0);
  });

  test('3) 组合筛选 module + action', async ({ request }) => {
    const r = await request.get(`${API}/admin/audit-logs?module=user&action=ban&pageSize=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    for (const log of data.data.list) {
      expect(log.module).toBe('user');
      expect(log.action).toBe('ban');
    }
  });

  test('4) GET /admin/audit-logs/options 返回下拉数据', async ({ request }) => {
    const r = await request.get(`${API}/admin/audit-logs/options`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(data.modules.length).toBeGreaterThan(0);
    expect(data.actions.length).toBeGreaterThan(0);
    expect(data.targetTypes.length).toBeGreaterThan(0);

    const moduleValues = data.modules.map((m: any) => m.value);
    expect(moduleValues).toContain('post');
    expect(moduleValues).toContain('user');
  });

  test('5) GET /admin/audit-logs/:id 详情', async ({ request }) => {
    // 先取一条 log id
    const listR = await request.get(`${API}/admin/audit-logs?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const log = (await listR.json()).data.list[0];

    const r = await request.get(`${API}/admin/audit-logs/${log.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const detail = await r.json();
    expect(detail.id).toBe(log.id);
    expect(detail).toHaveProperty('admin');
    expect(detail.admin).toHaveProperty('phone');
  });

  test('6) GET /admin/audit-logs/export CSV 含 BOM + 表头', async ({ request }) => {
    const r = await request.get(`${API}/admin/audit-logs/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    expect(r.headers()['content-type']).toContain('text/csv');
    expect(r.headers()['content-disposition']).toContain('attachment');

    const buf = await r.body();
    // BOM
    expect(buf[0]).toBe(0xef);
    expect(buf[1]).toBe(0xbb);
    expect(buf[2]).toBe(0xbf);
    // 转字符串检查表头
    const text = buf.toString('utf-8').replace(/^﻿/, '');
    expect(text).toContain('id,adminUserId,adminPhone');
    expect(text).toContain('requestId,ip,userAgent');
  });

  test('7) export CSV 带筛选', async ({ request }) => {
    const r = await request.get(`${API}/admin/audit-logs/export?module=post`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const text = (await r.body()).toString('utf-8').replace(/^﻿/, '');
    const lines = text.split('\r\n').slice(1);
    for (const line of lines) {
      if (!line.trim()) continue;
      // CSV 行应包含 module 字段（列 5）
      const cols = line.split(',');
      // 第 4 列（0-indexed）是 module（id, adminUserId, adminPhone, adminNickname, module, ...）
      expect(cols[4]).toContain('post');
    }
  });

  test('8) 无 token 应 401', async ({ request }) => {
    const r = await request.get(`${API}/admin/audit-logs`);
    expect(r.status()).toBe(401);
  });
});