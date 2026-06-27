import { test, expect } from '@playwright/test';

/**
 * T-009: 通知模板管理 E2E
 */
const ADMIN_PHONE = '13800000000';
const ADMIN_PASSWORD = 'test123456';
const API = '/api/v1';

test.describe('T-009 通知模板管理', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const r = await request.post(`${API}/auth/login-password`, {
      data: { phone: ADMIN_PHONE, password: ADMIN_PASSWORD },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    token = data.data.accessToken;
  });

  test('1) GET /admin/notifications/templates 应返回 8 个预置', async ({ request }) => {
    const r = await request.get(`${API}/admin/notifications/templates?pageSize=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(data.data.total).toBeGreaterThanOrEqual(8);
  });

  test('2) 筛选 event=comment 应只返回 comment 模板', async ({ request }) => {
    const r = await request.get(`${API}/admin/notifications/templates?event=comment`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    for (const t of data.data.list) {
      expect(t.event).toBe('comment');
    }
  });

  test('3) 模板 CRUD', async ({ request }) => {
    // 3.1) create
    const ts = Date.now();
    const newKey = `e2e_t009_${ts}`;
    const createR = await request.post(`${API}/admin/notifications/templates`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        event: 'system',
        channel: 'site',
        key: newKey,
        title: 'E2E 测试模板',
        body: '测试内容 {{var}}',
        priority: 3,
        enabled: true,
      },
    });
    expect(createR.ok()).toBeTruthy();
    const created = await createR.json();
    const id = created.data.id;

    // 3.2) read
    const readR = await request.get(`${API}/admin/notifications/templates/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(readR.ok()).toBeTruthy();
    const read = await readR.json();
    expect(read.data.key).toBe(newKey);

    // 3.3) update
    const patchR = await request.patch(`${API}/admin/notifications/templates/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: 'E2E 更新后', priority: 5 },
    });
    expect(patchR.ok()).toBeTruthy();

    // 3.4) toggle
    const toggleR = await request.post(`${API}/admin/notifications/templates/${id}/toggle`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(toggleR.ok()).toBeTruthy();
    const toggled = await toggleR.json();
    expect(toggled.data.enabled).toBe(false);

    // 3.5) preview
    const previewR = await request.post(`${API}/admin/notifications/templates/${id}/preview`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { var: '张三' },
    });
    expect(previewR.ok()).toBeTruthy();
    const preview = await previewR.json();
    expect(preview.data.body).toContain('张三');

    // 3.6) delete
    const delR = await request.delete(`${API}/admin/notifications/templates/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delR.ok()).toBeTruthy();

    // 3.7) 默认列表不应再看到（软删）
    const listR = await request.get(`${API}/admin/notifications/templates?pageSize=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = await listR.json();
    const codes = list.data.list.map((t: any) => t.key);
    expect(codes).not.toContain(newKey);

    // 3.8) includeDeleted=true 应能看到
    const listR2 = await request.get(`${API}/admin/notifications/templates?includeDeleted=true&pageSize=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list2 = await listR2.json();
    const codes2 = list2.data.list.map((t: any) => t.key);
    expect(codes2).toContain(newKey);
  });

  test('4) POST /admin/notifications/broadcast 群发', async ({ request }) => {
    const r = await request.post(`${API}/admin/notifications/broadcast`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        event: 'system',
        title: `E2E 群发测试 ${Date.now()}`,
        body: '测试群发',
        role: 'admin',
        priority: 1,
      },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(data.data.sent).toBeGreaterThanOrEqual(1);
    expect(data.data.target).toBeGreaterThanOrEqual(1);
  });

  test('5) 群发空标题应 400', async ({ request }) => {
    const r = await request.post(`${API}/admin/notifications/broadcast`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        event: 'system',
        title: '',
        body: 'test',
      },
    });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('6) 创建重名 key 应 400', async ({ request }) => {
    // 试图创建与预置重名的 key
    const r = await request.post(`${API}/admin/notifications/templates`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        event: 'comment',
        channel: 'site',
        key: 'comment_received', // 预置
        title: '重名测试',
        body: 'test',
      },
    });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('7) 无 token 应 401', async ({ request }) => {
    const r = await request.get(`${API}/admin/notifications/templates`);
    expect(r.status()).toBe(401);
  });
});