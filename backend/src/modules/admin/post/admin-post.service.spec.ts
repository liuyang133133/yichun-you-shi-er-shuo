/**
 * T-001: AdminPostService 软删除 + 恢复 集成测试
 *
 * 测试目标：
 *   1. 软删后 list 默认不可见
 *   2. includeDeleted=true 时可见
 *   3. 恢复后 list 可见
 *   4. 重复恢复抛 BadRequestException
 *   5. 不存在的 post 抛 NotFoundException
 *   6. restore 写 AuditLog
 *
 * 注意：本测试直接实例化 service，依赖 PrismaService 连接真实 DB。
 */

import { AdminPostService } from './admin-post.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AdminPostService T-001 软删除 + 恢复', () => {
  let prisma: PrismaService;
  let service: AdminPostService;
  let testPostId: bigint;
  let adminId: bigint;

  beforeAll(async () => {
    prisma = new PrismaService();
    // NotificationService 用 mock，集成测试不需要真实推送
    const notificationService = { emit: jest.fn().mockResolvedValue(null) } as any;
    service = new AdminPostService(prisma, notificationService);
    await prisma.$connect();

    // 找一个 admin user，没有就用第一个 user 当 admin
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
    });
    adminId = (admin?.id ?? 1n) as bigint;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('restore()', () => {
    it('1) 恢复不存在的 post → 抛 NotFoundException', async () => {
      await expect(
        service.restore(adminId, 999999999n),
      ).rejects.toThrow(NotFoundException);
    });

    it('2) 准备测试数据：取一个 active post 软删它', async () => {
      // 找一个未软删的 post
      const post = await prisma.post.findFirst({
        where: { includeDeleted: true } as any,
        select: { id: true, deletedAt: true },
      });
      expect(post).toBeTruthy();
      testPostId = post!.id;

      // 直接调 prisma 写软删字段（不走 service.offline 以避免副作用）
      await prisma.post.update({
        where: { id: testPostId },
        data: { deletedAt: new Date(), deletedBy: adminId, status: 'deleted' },
      });
    });

    it('3) 软删后默认 list 不可见', async () => {
      const result = await service.findAll({ pageSize: 100 });
      const ids = result.list.map((p: any) => String(p.id));
      expect(ids).not.toContain(testPostId.toString());
    });

    it('4) 软删后 includeDeleted=true 可见', async () => {
      const result = await service.findAll({
        pageSize: 100,
        includeDeleted: true,
      });
      const ids = result.list.map((p: any) => String(p.id));
      expect(ids).toContain(testPostId.toString());
    });

    it('5) 恢复后默认 list 可见', async () => {
      const restored = await service.restore(adminId, testPostId);
      expect(restored).toBeTruthy();
      expect((restored as any).deletedAt).toBeNull();
      expect((restored as any).status).toBe('active');

      const result = await service.findAll({ pageSize: 100 });
      const ids = result.list.map((p: any) => String(p.id));
      expect(ids).toContain(testPostId.toString());
    });

    it('6) 重复恢复未被软删的 post → 抛 BadRequestException', async () => {
      await expect(
        service.restore(adminId, testPostId),
      ).rejects.toThrow(BadRequestException);
    });

    it('7) restore 写 AuditLog', async () => {
      // 再软删一次
      await prisma.post.update({
        where: { id: testPostId },
        data: { deletedAt: new Date(), deletedBy: adminId, status: 'deleted' },
      });
      // 恢复
      await service.restore(adminId, testPostId);

      // 检查 AuditLog
      const log = await prisma.auditLog.findFirst({
        where: {
          targetType: 'post',
          targetId: testPostId,
          action: 'restore',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(log).toBeTruthy();
      expect(log?.adminUserId).toBe(adminId);
    });
  });

  describe('findAll() includeDeleted 行为', () => {
    it('8) findAll 返回 includeDeleted 字段', async () => {
      const r = await service.findAll({ pageSize: 1, includeDeleted: true });
      expect(r).toHaveProperty('includeDeleted', true);

      const r2 = await service.findAll({ pageSize: 1 });
      expect(r2).toHaveProperty('includeDeleted', false);
    });
  });
});
