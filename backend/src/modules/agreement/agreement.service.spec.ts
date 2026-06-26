/**
 * T-018: AgreementService 单测
 *
 * 测试目标:
 *   1. findByKey 返回 key 对应的最新版本（effectiveAt 最早但版本最高，或 isCurrent=true）
 *   2. findByKey 在 key 不存在时抛 NotFoundException
 *   3. findAll 返回分页列表（按 key 升序，effectiveAt 降序）
 *   4. create 新版本会校验 key+version 唯一
 *   5. setCurrent(key, version) 将指定版本标记为 isCurrent 并把同 key 旧版本置 false
 *   6. 默认数据：seed 后应有 terms/privacy/about 三条 isCurrent 记录
 *
 * 说明：
 *   - 测试用真实 MySQL（与 admin-user.service.spec.ts 一致）
 *   - 测试前后清理测试数据，避免污染
 */

import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgreementService } from './agreement.service';

describe('AgreementService (T-018)', () => {
  let prisma: PrismaService;
  let service: AgreementService;
  let adminUserId: bigint;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    service = new AgreementService(prisma);

    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) throw new Error('seed 未创建 admin 用户');
    adminUserId = admin.id;
  });

  afterAll(async () => {
    // 清理 T-018 测试残留
    await prisma.agreement.deleteMany({
      where: { key: { in: ['t018_test', 't018_multi'] } },
    });
    await prisma.$disconnect();
  });

  describe('findByKey', () => {
    it('1) 存在的 key（terms）应返回 isCurrent=true 的最新协议', async () => {
      const r = await service.findByKey('terms');
      expect(r).not.toBeNull();
      expect(r.key).toBe('terms');
      expect(r.isCurrent).toBe(true);
      expect(r.title).toBeTruthy();
      expect(r.content).toBeTruthy();
      expect(r.version).toBeGreaterThanOrEqual(1);
    });

    it('2) 不存在的 key 应抛 NotFoundException', async () => {
      await expect(service.findByKey('non_existent_key_xyz')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('3) 当同 key 多版本时，应返回 isCurrent=true 的版本（不是 version 最大的）', async () => {
      // 准备 3 个版本，v1 是 isCurrent
      const cleanup = async () => {
        await prisma.agreement.deleteMany({ where: { key: 't018_multi' } });
      };
      await cleanup();

      await prisma.agreement.create({
        data: {
          key: 't018_multi',
          version: 1,
          title: 'v1',
          content: '# v1',
          effectiveAt: new Date('2026-01-01'),
          isCurrent: true,
          createdBy: adminUserId,
        },
      });
      await prisma.agreement.create({
        data: {
          key: 't018_multi',
          version: 2,
          title: 'v2',
          content: '# v2',
          effectiveAt: new Date('2026-02-01'),
          isCurrent: false,
          createdBy: adminUserId,
        },
      });
      await prisma.agreement.create({
        data: {
          key: 't018_multi',
          version: 3,
          title: 'v3',
          content: '# v3',
          effectiveAt: new Date('2026-03-01'),
          isCurrent: false,
          createdBy: adminUserId,
        },
      });

      const r = await service.findByKey('t018_multi');
      expect(r.version).toBe(1); // v1 是 isCurrent=true
      expect(r.isCurrent).toBe(true);
      expect(r.title).toBe('v1');

      await cleanup();
    });
  });

  describe('findAll', () => {
    it('4) 默认返回全部 isCurrent=true 的协议（去重 key）', async () => {
      const r = await service.findAll();
      expect(r.length).toBeGreaterThanOrEqual(3); // 至少有 terms/privacy/about
      const keys = r.map((a) => a.key);
      expect(keys).toContain('terms');
      expect(keys).toContain('privacy');
      expect(keys).toContain('about');
      // 每 key 只有 1 个
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });

  describe('create', () => {
    afterEach(async () => {
      await prisma.agreement.deleteMany({ where: { key: 't018_test' } });
    });

    it('5) 新建版本应成功并默认 isCurrent=false', async () => {
      const r = await service.create({
        key: 't018_test',
        version: 1,
        title: '测试协议',
        content: '# 测试',
        effectiveAt: new Date().toISOString(),
        createdBy: adminUserId,
      });
      expect(r.key).toBe('t018_test');
      expect(r.version).toBe(1);
      expect(r.isCurrent).toBe(false);
    });

    it('6) 重复 (key, version) 应抛 BadRequestException', async () => {
      await service.create({
        key: 't018_test',
        version: 1,
        title: 'first',
        content: 'x',
        effectiveAt: new Date().toISOString(),
        createdBy: adminUserId,
      });
      await expect(
        service.create({
          key: 't018_test',
          version: 1,
          title: 'dup',
          content: 'y',
          effectiveAt: new Date().toISOString(),
          createdBy: adminUserId,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('setCurrent', () => {
    it('7) 把新版本设为 isCurrent 时，旧版本自动 isCurrent=false', async () => {
      // 准备
      await prisma.agreement.deleteMany({ where: { key: 't018_test' } });
      await prisma.agreement.create({
        data: {
          key: 't018_test',
          version: 1,
          title: 'v1',
          content: 'x',
          effectiveAt: new Date(),
          isCurrent: true,
          createdBy: adminUserId,
        },
      });
      const v2 = await prisma.agreement.create({
        data: {
          key: 't018_test',
          version: 2,
          title: 'v2',
          content: 'y',
          effectiveAt: new Date(),
          isCurrent: false,
          createdBy: adminUserId,
        },
      });

      await service.setCurrent('t018_test', 2, adminUserId);

      const v1 = await prisma.agreement.findFirst({
        where: { key: 't018_test', version: 1 },
      });
      const v2After = await prisma.agreement.findFirst({
        where: { key: 't018_test', version: 2 },
      });
      expect(v1?.isCurrent).toBe(false);
      expect(v2After?.isCurrent).toBe(true);

      // 清理
      await prisma.agreement.deleteMany({ where: { key: 't018_test' } });
    });
  });
});
