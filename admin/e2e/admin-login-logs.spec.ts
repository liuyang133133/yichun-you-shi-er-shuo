import { test, expect } from '@playwright/test';

/**
 * T-006: 登录日志查询页 E2E
 *
 * 流程：
 *   1. 登录 admin，调登录失败接口触发 LoginLog
 *   2. GET /admin/login-logs 验证能查到
 *   3. 6 种筛选各自验证
 *   4. GET /admin/login-logs/abnormal-ips 验证异常 IP 检测
 *   5. GET /admin/login-logs/export 验证 CSV 头 + BOM
 *   6. GET /admin/login-logs/:id 验证详情
 */

const ADMIN_PHONE = '13800000000';
const ADMIN_PASSWORD = 'test123456';
const API = '/api/v1';

test.describe('T-006 登录日志查询', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const r = await request.post(`${API}/auth/login-password`, {
      data: { phone: ADMIN_PHONE, password: ADMIN_PASSWORD },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    token = data.data.accessToken;
  });

  test('1) GET /admin/login-logs 默认返回记录（含 user + isFailed）', async ({ request }) => {
    const r = await request.get(`${API}/admin/login-logs?pageSize=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(data.data.list.length).toBeGreaterThan(0);
    const log = data.data.list[0];
    expect(log).toHaveProperty('userPhone');
    expect(log).toHaveProperty('ip');
    expect(log).toHaveProperty('status');
    expect(log).toHaveProperty('isFailed');
  });

  test('2) 6 种筛选', async ({ request }) => {
    // 2.1) userId
    let r = await request.get(`${API}/admin/login-logs?userId=1&pageSize=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let data = await r.json();
    for (const log of data.data.list) expect(log.userId).toBe('1');

    // 2.2) phone
    r = await request.get(`${API}/admin/login-logs?phone=138&pageSize=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    data = await r.json();
    for (const log of data.data.list) expect(log.userPhone).toContain('138');

    // 2.3) ip
    r = await request.get(`${API}/admin/login-logs?ip=127.0.0.1&pageSize=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    data = await r.json();
    for (const log of data.data.list) {
      if (log.ip) expect(log.ip).toContain('127.0.0.1');
    }

    // 2.4) status=success
    r = await request.get(`${API}/admin/login-logs?status=success&pageSize=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    data = await r.json();
    for (const log of data.data.list) {
      expect(log.status).toBe('success');
      expect(log.isFailed).toBe(false);
    }

    // 2.5) status=failed
    r = await request.get(`${API}/admin/login-logs?status=failed&pageSize=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    data = await r.json();
    for (const log of data.data.list) {
      expect(log.status).toBe('failed');
      expect(log.isFailed).toBe(true);
    }

    // 2.6) from
    const future = new Date(Date.now() + 86400000).toISOString();
    r = await request.get(`${API}/admin/login-logs?from=${future}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    data = await r.json();
    expect(data.data.list.length).toBe(0);

    // 2.7) to
    const past = new Date(Date.now() - 86400000).toISOString();
    r = await request.get(`${API}/admin/login-logs?to=${past}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    data = await r.json();
    expect(data.data.list.length).toBe(0);
  });

  test('3) GET /admin/login-logs/options 返回 status 分组', async ({ request }) => {
    const r = await request.get(`${API}/admin/login-logs/options`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(data.statuses.length).toBeGreaterThan(0);
    const values = data.statuses.map((s: any) => s.value);
    expect(values).toContain('success');
    expect(values).toContain('failed');
  });

  test('4) GET /admin/login-logs/abnormal-ips 返回 IP 数组', async ({ request }) => {
    const r = await request.get(`${API}/admin/login-logs/abnormal-ips`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(data).toHaveProperty('ips');
    expect(data).toHaveProperty('count');
    expect(data).toHaveProperty('windowHours');
    expect(data).toHaveProperty('threshold');
    expect(Array.isArray(data.ips)).toBe(true);
  });

  test('5) GET /admin/login-logs/:id 详情', async ({ request }) => {
    const listR = await request.get(`${API}/admin/login-logs?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const log = (await listR.json()).data.list[0];

    const r = await request.get(`${API}/admin/login-logs/${log.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const detail = await r.json();
    expect(detail.id).toBe(log.id);
    expect(detail).toHaveProperty('user');
    expect(detail.user).toHaveProperty('phone');
    expect(detail).toHaveProperty('isFailed');
  });

  test('6) GET /admin/login-logs/export CSV 含 BOM + 表头', async ({ request }) => {
    const r = await request.get(`${API}/admin/login-logs/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    expect(r.headers()['content-type']).toContain('text/csv');
    expect(r.headers()['content-disposition']).toContain('attachment');

    const buf = await r.body();
    expect(buf[0]).toBe(0xef);
    expect(buf[1]).toBe(0xbb);
    expect(buf[2]).toBe(0xbf);

    const text = buf.toString('utf-8').replace(/^﻿/, '');
    expect(text).toContain('id,userId,phone,nickname');
    expect(text).toContain('ip,userAgent,device');
    expect(text).toContain('status,failReason,createdAt');
  });

  test('7) 登录失败应写入 LoginLog (status=failed)', async ({ request }) => {
    // 故意登录失败
    const r = await request.post(`${API}/auth/login-password`, {
      data: { phone: ADMIN_PHONE, password: 'wrong_password_for_test' },
    });
    // 登录失败应返回 4xx 但仍写 LoginLog
    expect(r.status()).toBeGreaterThanOrEqual(400);

    // 查最近失败记录
    const listR = await request.get(`${API}/admin/login-logs?status=failed&pageSize=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = (await listR.json()).data.list;
    // 应该能找到刚才的失败登录
    expect(list.length).toBeGreaterThan(0);
  });

  test('8) 无 token 应 401', async ({ request }) => {
    const r = await request.get(`${API}/admin/login-logs`);
    expect(r.status()).toBe(401);
  });
});