import { test, expect } from '@playwright/test';

/**
 * T-002: RBAC E2E 测试
 *
 * 流程：
 *   1. 登录 admin
 *   2. 调 /admin/roles API 验证返回 5 预置角色
 *   3. 调 /admin/permissions 验证 40 个权限码 (T-003 新增 8 个)
 *   4. 调 /admin/roles/1/permissions 验证 super_admin 拥有全部 40 个
 *   5. 调 /admin/users/1/roles 验证 admin 用户的角色
 *   6. POST /admin/users/1/roles { roleId: 2 } 给 admin 加 content_auditor
 *   7. 再次 GET 应见 2 个角色
 *   8. DELETE /admin/users/1/roles/2 撤销
 *   9. 再次 GET 应回到 1 个角色
 */

const ADMIN_PHONE = '13800000000';
const ADMIN_PASSWORD = 'test123456';

test.describe('T-002 管理后台 - RBAC 角色 / 权限', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    // 登录拿 token
    const r = await request.post('/api/v1/auth/login-password', {
      data: { phone: ADMIN_PHONE, password: ADMIN_PASSWORD },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    token = data.data.accessToken;
    expect(token).toBeTruthy();
  });

  test('1) GET /admin/roles 返回 5 个预置角色', async ({ request }) => {
    const r = await request.get('/api/v1/admin/roles', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(data.code).toBe(0);
    expect(data.data.total).toBeGreaterThanOrEqual(5);
    const codes = data.data.list.map((role: any) => role.code);
    expect(codes).toContain('super_admin');
    expect(codes).toContain('content_auditor');
    expect(codes).toContain('customer_service');
    expect(codes).toContain('finance');
    expect(codes).toContain('operator');
  });

  test('2) GET /admin/permissions 返回 40 个权限码 (T-003 新增 8 个: category/company/announcement.view)', async ({ request }) => {
    const r = await request.get('/api/v1/admin/permissions', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(data.data.total).toBe(40);
  });

  test('3) GET /admin/permissions/modules 分组', async ({ request }) => {
    const r = await request.get('/api/v1/admin/permissions/modules', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const modules = await r.json();
    expect(modules.data.length).toBeGreaterThanOrEqual(10);
  });

  test('4) GET /admin/roles/1/permissions super_admin 有 40 个', async ({ request }) => {
    const r = await request.get('/api/v1/admin/roles/1/permissions', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(data.data.count).toBe(40);
  });

  test('5) GET /admin/users/1/roles admin 用户有 super_admin', async ({ request }) => {
    const r = await request.get('/api/v1/admin/users/1/roles', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    const codes = data.data.roles.map((ur: any) => ur.code);
    expect(codes).toContain('super_admin');
  });

  test('6) POST /admin/users/1/roles 分配 content_auditor', async ({ request }) => {
    const r = await request.post('/api/v1/admin/users/1/roles', {
      headers: { Authorization: `Bearer ${token}` },
      data: { roleId: 2 },
    });
    expect(r.ok()).toBeTruthy();

    // 验证已分配
    const list = await request.get('/api/v1/admin/users/1/roles', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await list.json();
    const codes = data.data.roles.map((ur: any) => ur.code);
    expect(codes).toContain('content_auditor');
    expect(codes).toContain('super_admin');
  });

  test('7) DELETE /admin/users/1/roles/2 撤销 content_auditor', async ({ request }) => {
    const r = await request.delete('/api/v1/admin/users/1/roles/2', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();

    // 验证已撤销（content_auditor 不应在 list）
    const list = await request.get('/api/v1/admin/users/1/roles', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await list.json();
    const codes = data.data.roles.map((ur: any) => ur.code);
    expect(codes).not.toContain('content_auditor');
    expect(codes).toContain('super_admin');
  });

  test('8) POST /admin/users/999999/roles 不存在用户 → 4xx', async ({ request }) => {
    const r = await request.post('/api/v1/admin/users/999999/roles', {
      headers: { Authorization: `Bearer ${token}` },
      data: { roleId: 2 },
    });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('9) GET /admin/roles 无 token → 401', async ({ request }) => {
    const r = await request.get('/api/v1/admin/roles');
    expect(r.status()).toBe(401);
  });
});
