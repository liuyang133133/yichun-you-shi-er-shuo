/**
 * T-004: AdminUserService 单测
 *
 * 测试目标:
 *   1. findAll 基础列表（不带角色）
 *   2. findAll withRoles=true 返回每个用户的 RBAC 角色
 *   3. findAll 过滤 keyword / role / status
 *   4. findAll 软删默认过滤
 *   5. ban / unban 写 AuditLog + 更新 status
 *   6. ban 拒绝 admin 用户
 */

import { AdminUserService } from './admin-user.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('AdminUserService (T-004)', () => {
  let prisma: PrismaService;
  let redis: any; // Mock — 不真正连 Redis
  let service: AdminUserService;
  let adminUserId: bigint;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    // Mock RedisService - 仅需 del 方法
    redis = { del: async () => undefined };
    service = new AdminUserService(prisma, redis);

    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) throw new Error('seed 未创建 admin 用户');
    adminUserId = admin.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('findAll 基础', () => {
    it('1) 不带 withRoles 应返回用户列表无 roles 字段', async () => {
      const r = await service.findAll({ pageSize: 5 });
      expect(r.list.length).toBeGreaterThan(0);
      for (const u of r.list) {
        expect(u).not.toHaveProperty('roles');
      }
    });

    it('2) withRoles=true 应返回每个用户的角色数组', async () => {
      const r = await service.findAll({ pageSize: 10, withRoles: true });
      expect(r.list.length).toBeGreaterThan(0);
      for (const u of r.list) {
        expect(u).toHaveProperty('roles');
        expect(Array.isArray(u.roles)).toBe(true);
      }
    });

    it('3) admin 用户应至少有 1 个 RBAC 角色', async () => {
      const r = await service.findAll({ role: 'admin', withRoles: true, pageSize: 5 });
      const admins = r.list.filter((u) => u.role === 'admin');
      expect(admins.length).toBeGreaterThan(0);
      // 至少一个 admin 有角色
      const hasRole = admins.some((u) => u.roles && u.roles.length > 0);
      expect(hasRole).toBe(true);
    });
  });

  describe('findAll 过滤', () => {
    it('4) keyword 过滤（手机号）应工作', async () => {
      const r = await service.findAll({ keyword: '138', pageSize: 5 });
      expect(r.list.length).toBeGreaterThan(0);
      for (const u of r.list) {
        expect(u.phone).toContain('138');
      }
    });

    it('5) role=admin 过滤应只返回 admin', async () => {
      const r = await service.findAll({ role: 'admin', pageSize: 50 });
      for (const u of r.list) {
        expect(u.role).toBe('admin');
      }
    });

    it('6) status=0 应只返回正常用户', async () => {
      const r = await service.findAll({ status: 0, pageSize: 10 });
      for (const u of r.list) {
        expect(u.status).toBe(0);
      }
    });
  });

  describe('findAll 软删', () => {
    it('7) 默认不应返回已软删用户', async () => {
      // 创建一个测试用户然后软删
      const ts = Date.now();
      const testUser = await prisma.user.create({
        data: {
          phone: `139${ts.toString().slice(-8)}`,
          nickname: 'test_soft_del',
          status: 0,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
      });
      // 软删
      await prisma.user.update({
        where: { id: testUser.id },
        data: { deletedAt: new Date(), deletedBy: adminUserId },
      });

      // 不带 includeDeleted 不应找到
      const r1 = await service.findAll({ keyword: 'test_soft_del' });
      expect(r1.list.length).toBe(0);

      // 带 includeDeleted 应找到（虽然 findAll 当前不支持，但 Prisma 中间件会过滤）
      // 我们测试的是中间件行为：用 Prisma 直接查
      const direct = await prisma.user.findFirst({
        where: { id: testUser.id, includeDeleted: true } as any,
        select: { id: true, deletedAt: true },
      });
      expect(direct).not.toBeNull();
      expect(direct!.deletedAt).not.toBeNull();
    });
  });

  describe('ban / unban', () => {
    let testUserId: bigint;
    let testPhone: string;

    beforeAll(async () => {
      const ts = Date.now() + Math.floor(Math.random() * 1000);
      testPhone = `138${ts.toString().slice(-8)}`;
      const u = await prisma.user.create({
        data: {
          phone: testPhone,
          nickname: 'test_ban',
          status: 0,
          role: 'user',
          createdBy: adminUserId,
          updatedBy: adminUserId,
        },
      });
      testUserId = u.id;
    });

    afterAll(async () => {
      // 清理
      await prisma.user.update({
        where: { id: testUserId },
        data: { deletedAt: new Date(), deletedBy: adminUserId, updatedBy: adminUserId },
      });
    });

    it('8) ban 应写入 status=1 + 写 AuditLog', async () => {
      const r = await service.ban(adminUserId, testUserId, '测试封禁');
      expect(r.status).toBe(1);

      const audit = await prisma.auditLog.findFirst({
        where: { targetId: testUserId, action: 'ban' },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).not.toBeNull();
      expect(audit?.reason).toBe('测试封禁');
    });

    it('9) unban 应写入 status=0 + 写 AuditLog', async () => {
      const r = await service.unban(adminUserId, testUserId);
      expect(r.status).toBe(0);

      const audit = await prisma.auditLog.findFirst({
        where: { targetId: testUserId, action: 'unban' },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).not.toBeNull();
    });

    it('10) ban admin 用户应抛 400', async () => {
      await expect(service.ban(adminUserId, adminUserId, '试图封禁 admin')).rejects.toThrow(
        /不能封禁 admin/,
      );
    });

    it('11) ban 不存在用户应抛 404', async () => {
      await expect(service.ban(adminUserId, BigInt(999999999), '不存在')).rejects.toThrow(
        /不存在/,
      );
    });
  });
});