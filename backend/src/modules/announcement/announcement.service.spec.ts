/**
 * T-016 AnnouncementService 单测
 *
 * 行为：
 *   - findActive() — 公开 API：当前生效集合 (status=1 + time window)
 *   - findAll(query) — admin: 分页列表（status 过滤）
 *   - create(adminId, dto) — 默认 status=1, priority=0, createdBy=adminId
 *   - update(id, dto) — 部分更新；startsAt/endsAt 转 Date
 *   - remove(id) — 调用 prisma.announcement.delete（注：T-016 不修硬删问题）
 */
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AnnouncementService (T-016)', () => {
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
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
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
    // startsAt: null OR <= now
    expect(args.where.OR).toBeDefined();
    // endsAt: null OR >= now 嵌在 AND 里
    expect(args.where.AND).toBeDefined();
    expect(args.orderBy).toEqual([{ priority: 'desc' }, { createdAt: 'desc' }]);
    expect(args.take).toBe(5);
  });

  it('2. findActive → 不依赖当前时间（只传时间窗条件）', async () => {
    prisma.announcement.findMany.mockResolvedValue([]);
    await service.findActive();
    const args = prisma.announcement.findMany.mock.calls[0][0];
    // 仅 status + time window，无 status 之外的 admin 字段
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

  it('4. findAll 带 status=0 → where.status === 0（admin 看停用列表）', async () => {
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
      // 不传 status/priority, 应默认 1/0
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
    prisma.announcement.findUnique.mockResolvedValue(null);
    await expect(service.update(BigInt(99), { title: 'x' } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('9. update 成功 → startsAt 转 Date；DTO 未提供 endsAt 时不写入 data（保留 DB 原值）', async () => {
    prisma.announcement.findUnique.mockResolvedValue(makeRow());
    prisma.announcement.update.mockResolvedValue(makeRow());
    await service.update(BigInt(1), {
      title: '新标题',
      startsAt: '2026-06-26T00:00:00.000Z',
      // 不传 endsAt → data 中不写入（spread undefined + !undefined 守卫）
    } as any);
    const data = prisma.announcement.update.mock.calls[0][0].data;
    expect(data.title).toBe('新标题');
    expect(data.startsAt).toBeInstanceOf(Date);
    expect(data.endsAt).toBeUndefined();
  });

  it('10. update 只改 title → 其他字段不被覆盖', async () => {
    prisma.announcement.findUnique.mockResolvedValue(makeRow());
    prisma.announcement.update.mockResolvedValue(makeRow());
    await service.update(BigInt(1), { title: '仅改标题' } as any);
    const data = prisma.announcement.update.mock.calls[0][0].data;
    expect(data.title).toBe('仅改标题');
    // status/priority/content 未在 DTO 出现 → 不写入 data
    expect(data.status).toBeUndefined();
    expect(data.priority).toBeUndefined();
    expect(data.content).toBeUndefined();
  });

  // ===== remove =====
  it('11. remove 找不到 → NotFoundException', async () => {
    prisma.announcement.findUnique.mockResolvedValue(null);
    await expect(service.remove(BigInt(99))).rejects.toThrow(NotFoundException);
  });

  it('12. remove 成功 → 调用 prisma.announcement.delete（注：T-016 不修硬删问题）', async () => {
    prisma.announcement.findUnique.mockResolvedValue(makeRow());
    prisma.announcement.delete.mockResolvedValue(makeRow());
    const r = await service.remove(BigInt(1));
    expect(prisma.announcement.delete).toHaveBeenCalledWith({ where: { id: BigInt(1) } });
    expect(r).toEqual({ id: '1', deleted: true });
    // Known issue: 当前硬删，与 T-001 软删规范不一致（独立任务修）
  });
});
