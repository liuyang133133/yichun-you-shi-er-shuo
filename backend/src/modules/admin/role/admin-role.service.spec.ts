/**
 * T-002: AdminRoleService 单元测试
 *
 * 测试目标：
 *   1. findAll 返回 5 个预置角色 + 计数
 *   2. findOne 返回角色详情 + rolePermissions
 *   3. create 创建新角色
 *   4. create 重名 code 抛 BadRequest
 *   5. update 修改角色名
 *   6. remove 软删（isSystem=true 不能删）
 *   7. remove 不存在的角色抛 NotFound
 */

import { AdminRoleService } from './admin-role.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AdminRoleService T-002', () => {
  let prisma: PrismaService;
  let service: AdminRoleService;
  let adminId: bigint;

  beforeAll(async () => {
    prisma = new PrismaService();
    service = new AdminRoleService(prisma);
    await prisma.$connect();
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    adminId = admin!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1) findAll 返回 5 个预置角色 + 计数', async () => {
    const result = await service.findAll({ pageSize: 100 });
    expect(result.total).toBeGreaterThanOrEqual(5);
    const codes = result.list.map((r: any) => r.code);
    expect(codes).toContain('super_admin');
    expect(codes).toContain('content_auditor');
    expect(codes).toContain('customer_service');
    expect(codes).toContain('finance');
    expect(codes).toContain('operator');
  });

  it('2) findOne 返回 super_admin 详情 + 32 个权限', async () => {
    const role = await service.findOne(1n);
    expect(role.code).toBe('super_admin');
    expect(role.isSystem).toBe(true);
    expect(role.rolePermissions.length).toBeGreaterThanOrEqual(32);
  });

  it('3) findOne 不存在 → NotFound', async () => {
    await expect(service.findOne(999999999n)).rejects.toThrow(NotFoundException);
  });

  it('4) create 新角色', async () => {
    const code = `test_role_create_${Date.now()}`;
    const role = await service.create(adminId, {
      code,
      name: 'Test Create',
      description: 'test',
      sortOrder: 99,
    });
    expect(role.code).toBe(code);
    expect(role.isSystem).toBe(false);

    // 清理
    await prisma.role.update({
      where: { id: role.id },
      data: { deletedAt: new Date(), deletedBy: adminId, status: 0 },
    });
  });

  it('5) create 重名 code → BadRequest', async () => {
    await expect(
      service.create(adminId, { code: 'super_admin', name: 'duplicate' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('6) update 修改角色名', async () => {
    // 创建一个临时角色
    const role = await prisma.role.create({
      data: {
        code: `test_role_update_${Date.now()}`,
        name: 'Old Name',
        isSystem: false,
        sortOrder: 99,
        status: 1,
      },
    });
    const updated = await service.update(adminId, role.id, { name: 'New Name' });
    expect(updated.name).toBe('New Name');

    // 清理
    await prisma.role.update({
      where: { id: role.id },
      data: { deletedAt: new Date(), deletedBy: adminId, status: 0 },
    });
  });

  it('7) remove 系统预置角色 → BadRequest', async () => {
    await expect(service.remove(adminId, 1n)).rejects.toThrow(BadRequestException);
  });

  it('8) remove 不存在的角色 → NotFound', async () => {
    await expect(service.remove(adminId, 999999999n)).rejects.toThrow(NotFoundException);
  });

  it('9) remove 自定义角色 → 软删 + status=0', async () => {
    const role = await prisma.role.create({
      data: {
        code: `test_role_remove_${Date.now()}`,
        name: 'To Remove',
        isSystem: false,
        sortOrder: 99,
        status: 1,
      },
    });
    const result = await service.remove(adminId, role.id);
    expect(result.deletedAt).not.toBeNull();
    expect(result.status).toBe(0);
  });
});
