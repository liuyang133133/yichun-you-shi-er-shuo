import { test, expect } from '@playwright/test';

/**
 * T-004: RBAC 后台 UI E2E 测试
 *
 * 4 个用户旅程：
 *   1. 角色管理 - 创建角色 → 列表看到 → 删除（软删）
 *   2. 权限管理 - 列表所有 40 个权限码，按模块分组
 *   3. 角色权限分配 - PUT /admin/roles/:id/permissions 后 listUserPermissions 反映
 *   4. 管理员列表 - 给用户分配 RBAC 角色 → 撤销
 */

const ADMIN_PHONE = '13800000000';
const ADMIN_PASSWORD = 'test123456';
const API = '/api/v1';

test.describe('T-004 RBAC 后台 UI', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const r = await request.post(`${API}/auth/login-password`, {
      data: { phone: ADMIN_PHONE, password: ADMIN_PASSWORD },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    token = data.data.accessToken;
  });

  test('旅程 1: 角色 CRUD', async ({ request }) => {
    // 1.1) 创建一个临时角色
    const ts = Date.now();
    const newCode = `e2e_role_${ts}`;
    const createR = await request.post(`${API}/admin/roles`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { code: newCode, name: `E2E 测试角色 ${ts}`, sortOrder: 99, isSystem: false },
    });
    expect(createR.ok()).toBeTruthy();
    const created = await createR.json();
    const roleId = created.data.id;
    expect(created.data.code).toBe(newCode);

    // 1.2) 列表应能看到
    const listR = await request.get(`${API}/admin/roles?includeDeleted=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = await listR.json();
    const codes = list.data.list.map((r: any) => r.code);
    expect(codes).toContain(newCode);

    // 1.3) 编辑（改名）
    const newName = `E2E 改名后 ${ts}`;
    const patchR = await request.patch(`${API}/admin/roles/${roleId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: newName },
    });
    expect(patchR.ok()).toBeTruthy();
    const patched = await patchR.json();
    expect(patched.data.name).toBe(newName);

    // 1.4) 删除（软删）
    const delR = await request.delete(`${API}/admin/roles/${roleId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delR.ok()).toBeTruthy();

    // 1.5) 默认列表不应再看到（软删过滤）
    const listR2 = await request.get(`${API}/admin/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list2 = await listR2.json();
    const codes2 = list2.data.list.map((r: any) => r.code);
    expect(codes2).not.toContain(newCode);

    // 1.6) includeDeleted=true 应能看到
    const listR3 = await request.get(`${API}/admin/roles?includeDeleted=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list3 = await listR3.json();
    const codes3 = list3.data.list.map((r: any) => r.code);
    expect(codes3).toContain(newCode);
  });

  test('旅程 2: 权限管理视图 (40 个权限码)', async ({ request }) => {
    const r = await request.get(`${API}/admin/permissions?pageSize=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(data.data.total).toBeGreaterThanOrEqual(40);

    // 模块分组
    const modulesR = await request.get(`${API}/admin/permissions/modules`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(modulesR.ok()).toBeTruthy();
    const modules = await modulesR.json();
    expect(modules.data.length).toBeGreaterThanOrEqual(10);

    // T-003 新模块应在列表中
    const moduleNames = modules.data.map((m: any) => m.module);
    expect(moduleNames).toContain('category');
    expect(moduleNames).toContain('company');
  });

  test('旅程 3: 角色权限分配', async ({ request }) => {
    // 3.1) 创建一个空权限角色
    const ts = Date.now();
    const createR = await request.post(`${API}/admin/roles`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { code: `e2e_perm_${ts}`, name: `E2E 权限测试 ${ts}`, sortOrder: 99, isSystem: false },
    });
    expect(createR.ok()).toBeTruthy();
    const roleId = (await createR.json()).data.id;

    // 3.2) 初始权限为空
    const initialR = await request.get(`${API}/admin/roles/${roleId}/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const initial = await initialR.json();
    expect(initial.data.count).toBe(0);

    // 3.3) 取 3 个权限码
    const permsR = await request.get(`${API}/admin/permissions?pageSize=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const allPerms = (await permsR.json()).data.list;
    const picked = allPerms
      .filter((p: any) => ['post.view', 'post.audit.pass', 'dashboard.view'].includes(p.code))
      .map((p: any) => Number(p.id));

    // 3.4) 全量替换
    const setR = await request.put(`${API}/admin/roles/${roleId}/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { permissionIds: picked },
    });
    expect(setR.ok()).toBeTruthy();

    // 3.5) 验证权限码已设置
    const afterR = await request.get(`${API}/admin/roles/${roleId}/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const after = await afterR.json();
    expect(after.data.count).toBe(3);
    expect(after.data.permissionCodes.sort()).toEqual(
      ['dashboard.view', 'post.audit.pass', 'post.view'].sort(),
    );

    // 3.6) 替换为 1 个
    const singleP = allPerms.find((p: any) => p.code === 'dashboard.view');
    await request.put(`${API}/admin/roles/${roleId}/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { permissionIds: [Number(singleP.id)] },
    });

    const after2R = await request.get(`${API}/admin/roles/${roleId}/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const after2 = await after2R.json();
    expect(after2.data.count).toBe(1);
    expect(after2.data.permissionCodes).toEqual(['dashboard.view']);

    // 3.7) 清理
    await request.delete(`${API}/admin/roles/${roleId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test('旅程 4: 管理员列表 + 角色分配 + 撤销', async ({ request }) => {
    // 4.1) 创建一个测试用户并设为 admin（直接用现有 admin）
    const adminUserId = 1; // 测试主 admin 用户
    const contentAuditorId = 2; // content_auditor 角色 ID

    // 4.2) admin 用户当前的角色
    const beforeR = await request.get(`${API}/admin/users/${adminUserId}/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const before = await beforeR.json();
    const beforeCodes = before.data.roles.map((r: any) => r.code);

    // 4.3) 如果还没有 content_auditor，则分配
    if (!beforeCodes.includes('content_auditor')) {
      const assignR = await request.post(`${API}/admin/users/${adminUserId}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { roleId: contentAuditorId },
      });
      expect(assignR.ok()).toBeTruthy();

      // 验证已分配
      const afterR = await request.get(`${API}/admin/users/${adminUserId}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const after = await afterR.json();
      const codes = after.data.roles.map((r: any) => r.code);
      expect(codes).toContain('content_auditor');

      // 4.4) 撤销
      const revokeR = await request.delete(
        `${API}/admin/users/${adminUserId}/roles/${contentAuditorId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(revokeR.ok()).toBeTruthy();

      // 4.5) 验证已撤销
      const finalR = await request.get(`${API}/admin/users/${adminUserId}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const final = await finalR.json();
      const finalCodes = final.data.roles.map((r: any) => r.code);
      expect(finalCodes).not.toContain('content_auditor');
    }
  });

  test('旅程 5: withRoles=true 用户列表', async ({ request }) => {
    const r = await request.get(`${API}/admin/users?withRoles=true&role=admin&pageSize=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(r.ok()).toBeTruthy();
    const data = await r.json();
    expect(data.data.list.length).toBeGreaterThan(0);
    // 至少有一个 admin 应有 roles 字段
    const withRolesField = data.data.list.filter((u: any) => u.roles !== undefined);
    expect(withRolesField.length).toBeGreaterThan(0);
  });

  test('旅程 6: 系统预置角色不可删除', async ({ request }) => {
    // 尝试删除 super_admin（id=1）应失败
    const r = await request.delete(`${API}/admin/roles/1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 应返回 4xx
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('旅程 7: 角色 code 重复应报错', async ({ request }) => {
    const r = await request.post(`${API}/admin/roles`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { code: 'super_admin', name: '重名测试', sortOrder: 99, isSystem: false },
    });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });
});