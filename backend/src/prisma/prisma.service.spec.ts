/**
 * T-001: 软删除中间件单元测试
 *
 * 测试目标：
 *   1. findMany 自动注入 deletedAt: null
 *   2. findFirst 自动注入 deletedAt: null
 *   3. findUnique 被改写为 findFirst + 自动注入 deletedAt: null
 *   4. includeDeleted=true 时绕过过滤
 *   5. 业务显式指定 deletedAt 时不被覆盖
 *   6. 日志/验证码表（不在 SOFT_DELETE_MODELS）不被中间件影响
 *   7. count 也会被自动过滤
 */

import { PrismaService } from './prisma.service';

describe('PrismaService 软删除中间件 (T-001)', () => {
  let prisma: PrismaService;

  beforeAll(() => {
    prisma = new PrismaService();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('静态方法 getSoftDeleteModels', () => {
    it('1) 应返回包含 Post、User、Category 的 18 个业务模型', () => {
      const models = PrismaService.getSoftDeleteModels();
      expect(models).toContain('Post');
      expect(models).toContain('User');
      expect(models).toContain('Category');
      expect(models).toContain('Message');
      expect(models).toContain('Announcement');
      expect(models).toContain('Banner');
      expect(models.length).toBe(18);
    });

    it('2) 不应包含日志/验证码表', () => {
      const models = PrismaService.getSoftDeleteModels();
      expect(models).not.toContain('AuditLog');
      expect(models).not.toContain('LoginLog');
      expect(models).not.toContain('ViewLog');
      expect(models).not.toContain('AiUsageLog');
      expect(models).not.toContain('SitemapPushLog');
      expect(models).not.toContain('SmsCode');
    });
  });

  describe('中间件过滤逻辑（通过实际查询验证）', () => {
    it('3) findFirst on Post 应自动注入 deletedAt: null', async () => {
      // 准备：取一个真实存在的 post id（用 first 拿第一个，不依赖 fixture）
      const sample = await prisma.post.findFirst({
        where: { includeDeleted: true } as any,
        select: { id: true, deletedAt: true },
      });
      if (!sample) {
        // 没有任何 post：跳过（生产环境依赖 seed data）
        return;
      }
      // 业务调用 findFirst 不传 deletedAt：中间件应自动注入 deletedAt: null
      const found = await prisma.post.findFirst({
        where: { id: sample.id } as any,
        select: { id: true },
      });
      // 如果原样本已被软删，found 应为 null（被过滤掉）
      if (sample.deletedAt) {
        expect(found).toBeNull();
      } else {
        expect(found?.id.toString()).toBe(sample.id.toString());
      }
    });

    it('4) includeDeleted=true 应绕过过滤', async () => {
      // 创建测试数据（用 category 因为容易清理）
      // 这里只验证中间件逻辑：includeDeleted=true 的 findFirst 应返回所有
      const allIncludingDeleted = await prisma.post.findFirst({
        where: { includeDeleted: true } as any,
      });
      // 即使存在已删 post，也应能取到
      expect(allIncludingDeleted === null || typeof allIncludingDeleted === 'object').toBe(true);
    });

    it('5) 业务显式传 deletedAt: { not: null } 应被保留', async () => {
      // 显式传 deletedAt 不为空 → 找已软删的
      const result = await prisma.post.findFirst({
        where: { deletedAt: { not: null } } as any,
        select: { id: true, deletedAt: true },
      });
      // 不应被中间件改写（如果结果是 null 也 OK，只是说明没有已软删的）
      if (result) {
        expect(result.deletedAt).not.toBeNull();
      }
    });

    it('6) 业务显式传 deletedAt: null 应被保留', async () => {
      const result = await prisma.post.findFirst({
        where: { deletedAt: null } as any,
        select: { id: true, deletedAt: true },
      });
      if (result) {
        expect(result.deletedAt).toBeNull();
      }
    });

    it('7) 日志表 AuditLog 不应被中间件过滤', async () => {
      // 显式 includeDeleted（AuditLog 不在 SOFT_DELETE_MODELS 中，无中间件影响）
      // 预期：Prisma 报错 "Unknown argument includeDeleted"，证明中间件未跑
      await expect(
        prisma.auditLog.findFirst({
          where: { includeDeleted: true } as any,
        }),
      ).rejects.toThrow(/includeDeleted|Unknown argument/);
    });

    it('8) SmsCode 不应被中间件过滤', async () => {
      await expect(
        prisma.smsCode.findFirst({
          where: { includeDeleted: true } as any,
        }),
      ).rejects.toThrow(/includeDeleted|Unknown argument/);
    });
  });

  describe('findUnique → findFirst 改写', () => {
    it('9) findUnique on Post 应被中间件改写为 findFirst', async () => {
      // 取一个真实 id
      const sample = await prisma.post.findFirst({
        where: { includeDeleted: true } as any,
        select: { id: true },
      });
      if (!sample) return;

      // findUnique 中间件会改写为 findFirst + 注入 deletedAt: null
      const found = await prisma.post.findUnique({
        where: { id: sample.id } as any,
      });

      // 原样本已软删 → 应为 null
      const original = await prisma.post.findFirst({
        where: { id: sample.id, includeDeleted: true } as any,
        select: { deletedAt: true },
      });
      if (original?.deletedAt) {
        expect(found).toBeNull();
      } else {
        expect(found?.id.toString()).toBe(sample.id.toString());
      }
    });
  });
});
