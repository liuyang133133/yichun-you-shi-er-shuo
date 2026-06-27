/**
 * T-020 BannerService 单测
 *
 * 行为：
 *   - findActive(position?) — 公开 API：当前生效集合 (status=1 + 时间窗)
 *   - findAll(query) — admin: 分页列表（position/status 过滤 + includeDeleted 过滤 T-020）
 *   - findOne(id) — 单条查询
 *   - create(adminId, dto) — 默认 linkType='url'/position='home_top'/sortOrder=0/status=1, createdBy=adminId
 *   - update(adminId, id, dto) — 破坏性字段变更写 updatedBy (T-020)
 *   - remove(adminId, id) — T-020 改软删（写 deletedAt/deletedBy/updatedBy）
 *   - restore(adminId, id) — T-020 恢复已软删（事务双写 update + auditLog）
 */
import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BannerService } from './banner.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('BannerService (T-020)', () => {
  let service: BannerService;
  let prisma: any;

  const makeRow = (over: any = {}) => ({
    id: BigInt(1),
    title: '首页头部 Banner',
    imageUrl: 'https://example.com/banner.jpg',
    linkType: 'url',
    linkTarget: 'https://example.com/promo',
    position: 'home_top',
    sortOrder: 0,
    status: 1,
    startsAt: null,
    endsAt: null,
    createdBy: BigInt(1),
    deletedAt: null,
    updatedBy: null,
    deletedBy: null,
    createdAt: new Date('2026-06-26'),
    updatedAt: new Date('2026-06-26'),
    ...over,
  });

  beforeEach(async () => {
    prisma = {
      banner: {
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
      providers: [BannerService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(BannerService);
  });

  // ===== findActive（公开）=====
  it('1. findActive 不带 position → where 不含 position', async () => {
    prisma.banner.findMany.mockResolvedValue([makeRow()]);
    await service.findActive();
    const args = prisma.banner.findMany.mock.calls[0][0];
    expect(args.where.status).toBe(1);
    expect(args.where.position).toBeUndefined();
    expect(args.where.AND).toBeDefined(); // 时间窗
    expect(args.orderBy).toEqual([{ sortOrder: 'asc' }, { id: 'desc' }]);
  });

  it('2. findActive 带 position=home_top → where.position === "home_top"', async () => {
    prisma.banner.findMany.mockResolvedValue([makeRow()]);
    await service.findActive('home_top');
    const args = prisma.banner.findMany.mock.calls[0][0];
    expect(args.where.position).toBe('home_top');
  });

  it('3. findActive → 时间窗 AND 数组含 startsAt/endsAt OR 条件', async () => {
    prisma.banner.findMany.mockResolvedValue([]);
    await service.findActive();
    const args = prisma.banner.findMany.mock.calls[0][0];
    expect(args.where.AND).toHaveLength(2);
    expect(args.where.AND[0].OR).toBeDefined();
    expect(args.where.AND[1].OR).toBeDefined();
  });

  // ===== findAll（admin）=====
  it('4. findAll 不带 status → where 不含 status 过滤', async () => {
    prisma.banner.findMany.mockResolvedValue([makeRow()]);
    prisma.banner.count.mockResolvedValue(1);
    await service.findAll({} as any);
    const args = prisma.banner.findMany.mock.calls[0][0];
    expect(args.where.status).toBeUndefined();
  });

  it('5. findAll 带 includeDeleted="true" → where.deletedAt = undefined（绕过中间件）', async () => {
    prisma.banner.findMany.mockResolvedValue([makeRow()]);
    prisma.banner.count.mockResolvedValue(1);
    await service.findAll({ includeDeleted: 'true' } as any);
    const args = prisma.banner.findMany.mock.calls[0][0];
    expect(args.where.deletedAt).toBeUndefined();
  });

  it('6. findAll 分页 page=2, pageSize=10 → skip=10, take=10', async () => {
    prisma.banner.findMany.mockResolvedValue([]);
    prisma.banner.count.mockResolvedValue(0);
    await service.findAll({ page: 2, pageSize: 10 } as any);
    const args = prisma.banner.findMany.mock.calls[0][0];
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
  });

  // ===== findOne =====
  it('7. findOne 找不到 → NotFoundException', async () => {
    prisma.banner.findUnique.mockResolvedValue(null);
    await expect(service.findOne(BigInt(99))).rejects.toThrow(NotFoundException);
  });

  // ===== create =====
  it('8. create 成功 → 默认 linkType=url, position=home_top, sortOrder=0, status=1, createdBy=adminId', async () => {
    prisma.banner.create.mockResolvedValue(makeRow());
    await service.create(BigInt(42), { title: 'X', imageUrl: 'https://example.com/x.jpg' } as any);
    const data = prisma.banner.create.mock.calls[0][0].data;
    expect(data.title).toBe('X');
    expect(data.imageUrl).toBe('https://example.com/x.jpg');
    expect(data.linkType).toBe('url');
    expect(data.position).toBe('home_top');
    expect(data.sortOrder).toBe(0);
    expect(data.status).toBe(1);
    expect(data.createdBy).toBe(BigInt(42));
  });

  it('9. create 含 linkType=post + startsAt/endsAt ISO → 转 Date', async () => {
    prisma.banner.create.mockResolvedValue(makeRow());
    await service.create(BigInt(1), {
      title: 'X',
      imageUrl: 'https://example.com/x.jpg',
      linkType: 'post',
      linkTarget: '123',
      startsAt: '2026-06-26T00:00:00.000Z',
      endsAt: '2026-07-01T00:00:00.000Z',
    } as any);
    const data = prisma.banner.create.mock.calls[0][0].data;
    expect(data.linkType).toBe('post');
    expect(data.linkTarget).toBe('123');
    expect(data.startsAt).toBeInstanceOf(Date);
    expect(data.endsAt).toBeInstanceOf(Date);
  });

  // ===== update（T-020 破坏性字段）=====
  it('10. update 找不到 → NotFoundException', async () => {
    prisma.banner.findFirst.mockResolvedValue(null);
    await expect(service.update(BigInt(1), BigInt(99), { title: 'x' } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('11. update 只改 title → 不写 updatedBy（非破坏性字段）', async () => {
    prisma.banner.findFirst.mockResolvedValue(makeRow());
    prisma.banner.update.mockResolvedValue(makeRow());
    await service.update(BigInt(1), BigInt(1), { title: '仅改标题' } as any);
    const data = prisma.banner.update.mock.calls[0][0].data;
    expect(data.title).toBe('仅改标题');
    expect(data.updatedBy).toBeUndefined();
  });

  it('12. update 含 status=0 → 写 updatedBy（破坏性字段）', async () => {
    prisma.banner.findFirst.mockResolvedValue(makeRow());
    prisma.banner.update.mockResolvedValue(makeRow());
    await service.update(BigInt(1), BigInt(1), { status: 0 } as any);
    const data = prisma.banner.update.mock.calls[0][0].data;
    expect(data.status).toBe(0);
    expect(data.updatedBy).toBe(BigInt(1));
  });

  // ===== remove（T-020 改软删）=====
  it('13. remove 找不到 → NotFoundException', async () => {
    prisma.banner.findFirst.mockResolvedValue(null);
    await expect(service.remove(BigInt(1), BigInt(99))).rejects.toThrow(NotFoundException);
  });

  it('14. remove 成功 → T-020 软删（写 deletedAt/deletedBy/updatedBy，不调 prisma.delete）', async () => {
    prisma.banner.findFirst.mockResolvedValue(makeRow());
    prisma.banner.update.mockResolvedValue({});
    const r = await service.remove(BigInt(1), BigInt(1));
    expect(prisma.banner.update).toHaveBeenCalledTimes(1);
    expect(prisma.banner.delete).not.toHaveBeenCalled();
    const data = prisma.banner.update.mock.calls[0][0].data;
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(data.deletedBy).toBe(BigInt(1));
    expect(data.updatedBy).toBe(BigInt(1));
    expect(r).toEqual({ id: '1', deleted: true });
  });

  // ===== restore（T-020 新增）=====
  it('15. restore 找不到 → NotFoundException', async () => {
    prisma.banner.findUnique.mockResolvedValue(null);
    await expect(service.restore(BigInt(1), BigInt(99))).rejects.toThrow(NotFoundException);
  });

  it('16. restore 未软删（deletedAt=null）→ BadRequestException', async () => {
    prisma.banner.findUnique.mockResolvedValue(makeRow({ deletedAt: null }));
    await expect(service.restore(BigInt(1), BigInt(1))).rejects.toThrow(BadRequestException);
  });

  it('17. restore 成功 → $transaction 双写 update + auditLog', async () => {
    prisma.banner.findUnique.mockResolvedValue(
      makeRow({ deletedAt: new Date('2026-06-26'), deletedBy: BigInt(5) }),
    );
    const r = await service.restore(BigInt(1), BigInt(1));
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // 断言 update call
    const updateCall = prisma.banner.update.mock.calls[0];
    expect(updateCall[0].where.id).toBe(BigInt(1));
    expect(updateCall[0].data.deletedAt).toBeNull();
    expect(updateCall[0].data.deletedBy).toBeNull();
    expect(updateCall[0].data.status).toBe(1);
    expect(updateCall[0].data.updatedBy).toBe(BigInt(1));
    // 断言 auditLog call
    const auditCall = prisma.auditLog.create.mock.calls[0];
    expect(auditCall[0].data.action).toBe('restore');
    expect(auditCall[0].data.targetType).toBe('banner');
    expect(auditCall[0].data.targetId).toBe(BigInt(1));
    expect(r).toEqual({ id: '1', restored: true });
  });
});
