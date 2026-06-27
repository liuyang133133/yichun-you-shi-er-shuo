/**
 * T-017 AnnouncementService 公开 list/detail 单测
 *
 * 行为：
 *   - findList(query) — 公开分页：status=1 + 时间窗 + 软删过滤 + select 裁剪（无 content）
 *   - findOne(id) — 公开详情：status=1 + 时间窗 + 软删过滤；不命中抛 NotFoundException
 *
 * 模式：mock PrismaService（worktree 无 DB，与 T-016 spec.ts 一致）
 */
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AnnouncementService (T-017 公开 list/detail)', () => {
  let service: AnnouncementService;
  let prisma: any;

  // list 项不返回 content（select 裁剪）
  const makeListRow = (over: any = {}) => ({
    id: BigInt(1),
    title: '系统升级通知',
    status: 1,
    priority: 0,
    startsAt: null,
    endsAt: null,
    createdAt: new Date('2026-06-26'),
    ...over,
  });

  // 详情项包含 content
  const makeDetailRow = (over: any = {}) => ({
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
        findFirst: jest.fn(),
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

  // ===== findList =====
  it('1. findList → where 含 status=1 + deletedAt=null + 时间窗 OR/AND', async () => {
    prisma.announcement.findMany.mockResolvedValue([makeListRow()]);
    prisma.announcement.count.mockResolvedValue(1);
    await service.findList({});
    const args = prisma.announcement.findMany.mock.calls[0][0];
    expect(args.where.status).toBe(1);
    expect(args.where.deletedAt).toBeNull();
    expect(args.where.OR).toBeDefined(); // startsAt: null OR <= now
    expect(args.where.AND).toBeDefined(); // endsAt: null OR >= now
  });

  it('2. findList → orderBy priority desc + createdAt desc', async () => {
    prisma.announcement.findMany.mockResolvedValue([]);
    prisma.announcement.count.mockResolvedValue(0);
    await service.findList({});
    const args = prisma.announcement.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual([{ priority: 'desc' }, { createdAt: 'desc' }]);
  });

  it('3. findList → select 裁剪：不返回 content 字段', async () => {
    prisma.announcement.findMany.mockResolvedValue([makeListRow()]);
    prisma.announcement.count.mockResolvedValue(1);
    await service.findList({});
    const args = prisma.announcement.findMany.mock.calls[0][0];
    expect(args.select).toBeDefined();
    expect(args.select.content).toBeUndefined();
    expect(args.select.title).toBe(true);
    expect(args.select.id).toBe(true);
  });

  it('4. findList → 分页 page=2, pageSize=10 → skip=10, take=10', async () => {
    prisma.announcement.findMany.mockResolvedValue([]);
    prisma.announcement.count.mockResolvedValue(0);
    await service.findList({ page: 2, pageSize: 10 });
    const args = prisma.announcement.findMany.mock.calls[0][0];
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
  });

  // ===== findOne =====
  it('5. findOne 命中生效中 → 返回完整字段（含 content）', async () => {
    prisma.announcement.findFirst.mockResolvedValue(makeDetailRow());
    const r = await service.findOne(BigInt(1));
    expect(r.title).toBe('系统升级通知');
    expect(r.content).toBe('今晚 22:00-23:00 维护');
    const args = prisma.announcement.findFirst.mock.calls[0][0];
    expect(args.where.status).toBe(1);
    expect(args.where.deletedAt).toBeNull();
    expect(args.where.id).toBe(BigInt(1));
  });

  it('6. findOne 已过期 → NotFoundException', async () => {
    prisma.announcement.findFirst.mockResolvedValue(null);
    await expect(service.findOne(BigInt(2))).rejects.toThrow(NotFoundException);
  });

  it('7. findOne 已下架 (status=0) → NotFoundException', async () => {
    // where.status=1 过滤后 findFirst 返回 null
    prisma.announcement.findFirst.mockResolvedValue(null);
    await expect(service.findOne(BigInt(3))).rejects.toThrow(NotFoundException);
    // 验证 where 中包含 status=1
    const args = prisma.announcement.findFirst.mock.calls[0][0];
    expect(args.where.status).toBe(1);
  });

  it('8. findOne 不存在 id → NotFoundException', async () => {
    prisma.announcement.findFirst.mockResolvedValue(null);
    await expect(service.findOne(BigInt(999999))).rejects.toThrow(NotFoundException);
  });
});
