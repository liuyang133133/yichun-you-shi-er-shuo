/**
 * T-021 AdminCompanyService 单测
 *
 * 行为：
 *   - findAll(query) — admin: 分页列表（keyword/verified 过滤 + includeDeleted 过滤 T-021）
 *   - findOne(id) — 单条查询（含 creator + _count.jobs）
 *   - verify(adminId, id) — P0-006 认证通过（update verified=1 + auditLog）
 *   - unverify(adminId, id) — P0-006 取消认证（update verified=0 + auditLog）
 *   - remove(adminId, id) — T-021 改软删（写 deletedAt/deletedBy/updatedBy）
 *   - restore(adminId, id) — T-021 恢复（事务双写 update + auditLog；不重置 verified）
 */
import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminCompanyService } from './admin-company.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('AdminCompanyService (T-021)', () => {
  let service: AdminCompanyService;
  let prisma: any;

  const makeRow = (over: any = {}) => ({
    id: BigInt(1),
    creatorUserId: BigInt(10),
    name: '伊春测试公司',
    logo: null,
    industry: '互联网',
    scale: '100-499人',
    nature: '民营',
    address: '伊春市伊春区',
    description: '测试描述',
    verified: 0,
    deletedAt: null,
    createdBy: BigInt(10),
    updatedBy: null,
    deletedBy: null,
    createdAt: new Date('2026-06-26'),
    updatedAt: new Date('2026-06-26'),
    ...over,
  });

  beforeEach(async () => {
    prisma = {
      company: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockResolvedValue(undefined),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [AdminCompanyService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AdminCompanyService);
  });

  // ===== findAll（admin）=====
  it('1. findAll 不带 includeDeleted → 默认过滤已软删（中间件自动加 deletedAt:null）', async () => {
    prisma.company.findMany.mockResolvedValue([makeRow()]);
    prisma.company.count.mockResolvedValue(1);
    await service.findAll({} as any);
    const args = prisma.company.findMany.mock.calls[0][0];
    // 默认不显式设置 deletedAt（依赖 Prisma 中间件自动过滤）
    expect(args.where.deletedAt).toBeUndefined();
  });

  it('2. findAll 带 includeDeleted="true" → where.deletedAt = undefined（绕过中间件）', async () => {
    prisma.company.findMany.mockResolvedValue([makeRow({ deletedAt: new Date() })]);
    prisma.company.count.mockResolvedValue(1);
    await service.findAll({ includeDeleted: 'true' } as any);
    const args = prisma.company.findMany.mock.calls[0][0];
    expect(args.where.deletedAt).toBeUndefined();
  });

  // ===== findOne =====
  it('3. findOne 找不到 → NotFoundException', async () => {
    prisma.company.findUnique.mockResolvedValue(null);
    await expect(service.findOne(BigInt(99))).rejects.toThrow(NotFoundException);
  });

  // ===== verify =====
  it('4. verify 成功 → update verified=1 + auditLog.action=verify', async () => {
    prisma.company.findUnique.mockResolvedValue(makeRow({ verified: 0 }));
    prisma.company.update.mockResolvedValue(makeRow({ verified: 1 }));
    const r = await service.verify(BigInt(1), BigInt(1));
    expect(prisma.company.update).toHaveBeenCalledTimes(1);
    expect(prisma.company.update.mock.calls[0][0].data.verified).toBe(1);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create.mock.calls[0][0].data.action).toBe('verify');
    expect(r.verified).toBe(1);
  });

  it('5. verify 找不到 → NotFoundException', async () => {
    prisma.company.findUnique.mockResolvedValue(null);
    await expect(service.verify(BigInt(1), BigInt(99))).rejects.toThrow(NotFoundException);
    expect(prisma.company.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  // ===== unverify =====
  it('6. unverify 成功 → update verified=0 + auditLog.action=unverify', async () => {
    prisma.company.findUnique.mockResolvedValue(makeRow({ verified: 1 }));
    prisma.company.update.mockResolvedValue(makeRow({ verified: 0 }));
    const r = await service.unverify(BigInt(1), BigInt(1));
    expect(prisma.company.update).toHaveBeenCalledTimes(1);
    expect(prisma.company.update.mock.calls[0][0].data.verified).toBe(0);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create.mock.calls[0][0].data.action).toBe('unverify');
    expect(r.verified).toBe(0);
  });

  it('7. unverify 找不到 → NotFoundException', async () => {
    prisma.company.findUnique.mockResolvedValue(null);
    await expect(service.unverify(BigInt(1), BigInt(99))).rejects.toThrow(NotFoundException);
    expect(prisma.company.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  // ===== remove（T-021 改软删）=====
  it('8. remove 成功 → T-021 软删（写 deletedAt/deletedBy/updatedBy，不调 prisma.delete）', async () => {
    prisma.company.findFirst.mockResolvedValue(makeRow());
    prisma.company.update.mockResolvedValue({});
    const r = await service.remove(BigInt(1), BigInt(1));
    expect(prisma.company.update).toHaveBeenCalledTimes(1);
    expect(prisma.company.delete).not.toHaveBeenCalled();
    const data = prisma.company.update.mock.calls[0][0].data;
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(data.deletedBy).toBe(BigInt(1));
    expect(data.updatedBy).toBe(BigInt(1));
    expect(r).toEqual({ id: '1', deleted: true });
  });
});