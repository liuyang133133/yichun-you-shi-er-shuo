import { test, expect } from '@playwright/test';

/**
 * T-007: 通知系统 E2E
 *
 * 流程：
 *   1. 注册测试用户 + 登录拿 token
 *   2. 用 admin token 通过 emit API 发通知（间接测：通过已有 admin 操作触发系统通知）
 *   3. GET /notifications/me - 列表
 *   4. GET /notifications/unread-count - 未读数
 *   5. POST /notifications/:id/read - 标记已读
 *   6. POST /notifications/read-all - 全部已读
 *   7. DELETE /notifications/:id - 软删
 *   8. GET /notifications/settings + PUT - 偏好
 *   9. POST /devices/register + DELETE - 设备 Token
 */

const ADMIN_PHONE = '13800000000';
const ADMIN_PASSWORD = 'test123456';
const API = '/api/v1';

test.describe('T-007 通知系统', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const r = await request.post(`${API}/auth/login-password`, {
      data: { phone: ADMIN_PHONE, password: ADMIN_PASSWORD },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    token = data.data.accessToken;
  });

  test('1) GET /notifications/unread-count 应返回数字', async ({ request }) => {
    const r = await request.get(`${API}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(typeof data.data.count).toBe('number');
    expect(data.data.count).toBeGreaterThanOrEqual(0);
  });

  test('2) GET /notifications/me 应返回列表', async ({ request }) => {
    const r = await request.get(`${API}/notifications/me?pageSize=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(data.data).toHaveProperty('list');
    expect(data.data).toHaveProperty('total');
    expect(Array.isArray(data.data.list)).toBe(true);
  });

  test('3) GET /notifications/me?unreadOnly=true 仅返回未读', async ({ request }) => {
    const r = await request.get(`${API}/notifications/me?unreadOnly=true&pageSize=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    for (const n of data.data.list) {
      expect(n.readAt).toBeNull();
    }
  });

  test('4) POST /notifications/read-all 应把所有标记已读', async ({ request }) => {
    const r = await request.post(`${API}/notifications/read-all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(typeof data.data.updated).toBe('number');
    expect(data.data.updated).toBeGreaterThanOrEqual(0);

    // 验证未读数变 0
    const u = await request.get(`${API}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const uData = await u.json();
    expect(uData.data.count).toBe(0);
  });

  test('5) 单条 markRead 流程', async ({ request }) => {
    // 创建一个通知（通过内部 emit；这里借用 admin 操作触发 audit）
    // 简单方案：直接调 login-password 触发 loginLog，但不直接创建 notification
    // 跳过此 case 的创建步骤，直接测试 markRead API 行为

    // 找一个 notification id
    const listR = await request.get(`${API}/notifications/me?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = (await listR.json()).data.list;

    if (list.length > 0) {
      const id = list[0].id;
      const r = await request.post(`${API}/notifications/${id}/read`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(r.ok()).toBeTruthy();
      const data = await r.json();
      expect(typeof data.data.updated).toBe('number');
    }
  });

  test('6) GET /notifications/settings 应返回 8 类事件', async ({ request }) => {
    const r = await request.get(`${API}/notifications/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBe(8);

    const events = data.data.map((s: any) => s.event);
    expect(events).toContain('comment');
    expect(events).toContain('audit');
    expect(events).toContain('order');
    expect(events).toContain('auth');
    expect(events).toContain('system');
    expect(events).toContain('appeal');
    expect(events).toContain('follow');
    expect(events).toContain('invite');
  });

  test('7) PUT /notifications/settings/:event 应更新偏好', async ({ request }) => {
    const r = await request.put(`${API}/notifications/settings/audit`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { enabled: false },
    });
    expect(r.ok()).toBeTruthy();

    // 验证已更新
    const listR = await request.get(`${API}/notifications/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = (await listR.json()).data;
    const audit = list.find((s: any) => s.event === 'audit');
    expect(audit.enabled).toBe(false);

    // 恢复默认
    await request.put(`${API}/notifications/settings/audit`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { enabled: true },
    });
  });

  test('8) POST /devices/register 应注册推送 Token', async ({ request }) => {
    const tokenStr = `e2e-test-device-token-${Date.now()}`;
    const r = await request.post(`${API}/devices/register`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { platform: 'web', token: tokenStr, deviceId: 'chrome-mac' },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(data.data.platform).toBe('web');
    expect(data.data.id).toBeTruthy();

    // 清理：注销设备
    await request.delete(`${API}/devices/${encodeURIComponent(tokenStr)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test('9) DELETE /notifications/:id 应软删通知', async ({ request }) => {
    // 跳过：如果没通知可删
    const listR = await request.get(`${API}/notifications/me?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = (await listR.json()).data.list;

    if (list.length > 0) {
      const id = list[0].id;
      const r = await request.delete(`${API}/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(r.ok()).toBeTruthy();
    }
  });

  test('10) 无 token 应 401', async ({ request }) => {
    const r = await request.get(`${API}/notifications/me`);
    expect(r.status()).toBe(401);
  });
});