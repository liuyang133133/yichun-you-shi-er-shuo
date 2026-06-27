/**
 * AnnouncementService 单测 (T-016 + T-019)
 *
 * 行为：
 *   - findActive() — 公开 API：当前生效集合 (status=1 + time window)
 *   - findAll(query) — admin: 分页列表（status 过滤 + includeDeleted 过滤 T-019）
 *   - create(adminId, dto) — 默认 status=1, priority=0, createdBy=adminId
 *   - update(adminId, id, dto) — 破坏性字段变更写 updatedBy (T-019)
 *   - remove(adminId, id) — T-019 改软删（写 deletedAt/deletedBy/updatedBy）
 *   - restore(adminId, id) — T-019 恢复已软删（事务双写 update + auditLog）
 */
import { Test } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AnnouncementService (T-016 + T-019)', () => {
  let service: AnnouncementService;
  let prisma: any;

  const makeRow = (over: any = {}) => ({
    id: BigInt(1),
    title: '系统升级通知',
    content: '今晚 22:00-23:00 维护',
    status: 1,
    priority: 0,
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
      announcement: {
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
      // $transaction 接受 ops 数组，service 是 await 调用
      // 不需要返回值（service 仅 await，不读 result），mock.calls 记录原始 args
      $transaction: jest.fn().mockResolvedValue(undefined),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [AnnouncementService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AnnouncementService);
  });

  // ===== findActive =====
  it('1. findActive → status=1 + 生效时间窗 where 构造正确 + orderBy + take 5', async () => {
    prisma.announcement.findMany.mockResolvedValue([makeRow()]);
    await service.findActive();
    const args = prisma.announcement.findMany.mock.calls[0][0];
    expect(args.where.status).toBe(1);
    expect(args.where.OR).toBeDefined();
    expect(args.where.AND).toBeDefined();
    expect(args.orderBy).toEqual([{ priority: 'desc' }, { createdAt: 'desc' }]);
    expect(args.take).toBe(5);
  });

  it('2. findActive → 不依赖当前时间（只传时间窗条件）', async () => {
    prisma.announcement.findMany.mockResolvedValue([]);
    await service.findActive();
    const args = prisma.announcement.findMany.mock.calls[0][0];
    expect(Object.keys(args.where).sort()).toEqual(['AND', 'OR', 'status']);
  });

  // ===== findAll =====
  it('3. findAll 不带 status → where 不含 status 过滤（admin 全列表）', async () => {
    prisma.announcement.findMany.mockResolvedValue([makeRow()]);
    prisma.announcement.count.mockResolvedValue(1);
    await service.findAll({});
    const args = prisma.announcement.findMany.mock.calls[0][0];
    expect(args.where.status).toBeUndefined();
    expect(args.orderBy).toEqual([{ priority: 'desc' }, { createdAt: 'desc' }]);
  });

  it('4. findAll 带 status=0 → where.status === 0', async () => {
    prisma.announcement.findMany.mockResolvedValue([makeRow({ status: 0 })]);
    prisma.announcement.count.mockResolvedValue(1);
    await service.findAll({ status: 0 });
    const args = prisma.announcement.findMany.mock.calls[0][0];
    expect(args.where.status).toBe(0);
  });

  it('5. findAll 分页 page=2, pageSize=10 → skip=10, take=10', async () => {
    prisma.announcement.findMany.mockResolvedValue([]);
    prisma.announcement.count.mockResolvedValue(0);
    await service.findAll({ page: 2, pageSize: 10 });
    const args = prisma.announcement.findMany.mock.calls[0][0];
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
  });

  // ===== create =====
  it('6. create 成功 → 默认 status=1, priority=0, createdBy=adminId；startsAt/endsAt 转 Date', async () => {
    prisma.announcement.create.mockResolvedValue(makeRow());
    await service.create(BigInt(42), {
      title: '测试公告',
      content: '内容',
    } as any);
    const data = prisma.announcement.create.mock.calls[0][0].data;
    expect(data.status).toBe(1);
    expect(data.priority).toBe(0);
    expect(data.createdBy).toBe(BigInt(42));
    expect(data.title).toBe('测试公告');
    expect(data.content).toBe('内容');
  });

  it('7. create 含 startsAt/endsAt ISO → 转 Date 对象', async () => {
    prisma.announcement.create.mockResolvedValue(makeRow());
    await service.create(BigInt(1), {
      title: '限时公告',
      content: 'X',
      startsAt: '2026-06-26T00:00:00.000Z',
      endsAt: '2026-07-01T00:00:00.000Z',
    } as any);
    const data = prisma.announcement.create.mock.calls[0][0].data;
    expect(data.startsAt).toBeInstanceOf(Date);
    expect(data.endsAt).toBeInstanceOf(Date);
  });

  // ===== update =====
  it('8. update 找不到 → NotFoundException', async () => {
    prisma.announcement.findFirst.mockResolvedValue(null);
    await expect(service.update(BigInt(1), BigInt(99), { title: 'x' } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('9. update 成功 → startsAt 转 Date；DTO 未提供 endsAt 时不写入 data', async () => {
    prisma.announcement.findFirst.mockResolvedValue(makeRow());
    prisma.announcement.update.mockResolvedValue(makeRow());
    await service.update(BigInt(1), BigInt(1), {
      title: '新标题',
      startsAt: '2026-06-26T00:00:00.000Z',
    } as any);
    const data = prisma.announcement.update.mock.calls[0][0].data;
    expect(data.title).toBe('新标题');
    expect(data.startsAt).toBeInstanceOf(Date);
    expect(data.endsAt).toBeUndefined();
  });

  it('10. update 只改 title → 不写 updatedBy（非破坏性字段）', async () => {
    prisma.announcement.findFirst.mockResolvedValue(makeRow());
    prisma.announcement.update.mockResolvedValue(makeRow());
    await service.update(BigInt(1), BigInt(1), { title: '仅改标题' } as any);
    const data = prisma.announcement.update.mock.calls[0][0].data;
    expect(data.title).toBe('仅改标题');
    // T-019: title/content 不算破坏性，不写 updatedBy
    expect(data.updatedBy).toBeUndefined();
  });

  // ===== remove（T-019 改软删）=====
  it('11. remove 找不到 → NotFoundException', async () => {
    prisma.announcement.findFirst.mockResolvedValue(null);
    await expect(service.remove(BigInt(1), BigInt(99))).rejects.toThrow(NotFoundException);
  });

  it('12. remove 成功 → T-019 软删（写 deletedAt/deletedBy/updatedBy，不调 prisma.delete）', async () => {
    prisma.announcement.findFirst.mockResolvedValue(makeRow());
    prisma.announcement.update.mockResolvedValue({});
    const r = await service.remove(BigInt(1), BigInt(1));
    // 断言调用 update 而非 delete
    expect(prisma.announcement.update).toHaveBeenCalledTimes(1);
    expect(prisma.announcement.delete).not.toHaveBeenCalled();
    const data = prisma.announcement.update.mock.calls[0][0].data;
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(data.deletedBy).toBe(BigInt(1));
    expect(data.updatedBy).toBe(BigInt(1));
    expect(r).toEqual({ id: '1', deleted: true });
  });

  // ===== restore（T-019 新增）=====
  it('13. restore 找不到 → NotFoundException', async () => {
    prisma.announcement.findUnique.mockResolvedValue(null);
    await expect(service.restore(BigInt(1), BigInt(99))).rejects.toThrow(NotFoundException);
  });

  it('14. restore 未软删（deletedAt=null）→ BadRequestException', async () => {
    prisma.announcement.findUnique.mockResolvedValue(makeRow({ deletedAt: null }));
    await expect(service.restore(BigInt(1), BigInt(1))).rejects.toThrow(BadRequestException);
  });

  it('15. restore 成功 → $transaction 双写 update + auditLog', async () => {
    prisma.announcement.findUnique.mockResolvedValue(
      makeRow({ deletedAt: new Date('2026-06-26'), deletedBy: BigInt(5) }),
    );
    const r = await service.restore(BigInt(1), BigInt(1));
    // 断言 $transaction 被调用一次（事务入口）
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // 断言 update 被调用（事务内） — 写 deletedAt: null + deletedBy: null + status: 1 + updatedBy
    const updateCall = prisma.announcement.update.mock.calls[0];
    expect(updateCall[0].where.id).toBe(BigInt(1));
    expect(updateCall[0].data.deletedAt).toBeNull();
    expect(updateCall[0].data.deletedBy).toBeNull();
    expect(updateCall[0].data.status).toBe(1);
    expect(updateCall[0].data.updatedBy).toBe(BigInt(1));
    // 断言 auditLog.create 被调用（事务内） — action: 'restore' + targetType
    const auditCall = prisma.auditLog.create.mock.calls[0];
    expect(auditCall[0].data.action).toBe('restore');
    expect(auditCall[0].data.targetType).toBe('announcement');
    expect(auditCall[0].data.targetId).toBe(BigInt(1));
    expect(r).toEqual({ id: '1', restored: true });
  });

  // ===== update 写 updatedBy（T-019）=====
  it('16. update 含 status → 写 updatedBy（破坏性字段）', async () => {
    prisma.announcement.findFirst.mockResolvedValue(makeRow());
    prisma.announcement.update.mockResolvedValue(makeRow());
    await service.update(BigInt(1), BigInt(1), { status: 0 } as any);
    const data = prisma.announcement.update.mock.calls[0][0].data;
    expect(data.status).toBe(0);
    expect(data.updatedBy).toBe(BigInt(1));
  });
});
