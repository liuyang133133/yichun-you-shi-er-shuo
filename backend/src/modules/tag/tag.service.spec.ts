/**
 * T-013 TagService 单测（RED）
 *
 * 行为：
 *   - findAll({ q?, limit?, offset? }) — 按 useCount desc 排序 + 名字搜索
 *   - findBySlug(slug) — 单个标签详情（含 useCount）
 *   - findHot(limit=20) — 前台首页/侧栏用，热门标签
 *   - create(input) — slug 必须 unique；同名 slug 自动加 -2 / -3 后缀
 *   - update(id, input) — 改 name/description；不允许改 slug
 *   - delete(id) — 软删除；PostTag 关联不删（保留 audit 链）
 *   - incrementUseCount(tagId) / decrementUseCount — PostService 调用，事务内
 *   - findPostsByTag(tagId, opts) — 返回关联帖子列表（带 PostService 同样的分页）
 *   - migrateFromJson() — 从 Post.tags JSON 字段读旧数据，upsert Tag + PostTag
 */
import { Test } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TagService } from './tag.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TagService (T-013)', () => {
  let service: TagService;
  let prisma: any;

  const makeTagRow = (over: any = {}) => ({
    id: BigInt(1),
    slug: 'shanlin',
    name: '山林',
    description: '伊春本地山林特产',
    useCount: 5,
    isHot: false,
    sortOrder: 0,
    createdBy: null,
    updatedBy: null,
    deletedBy: null,
    deletedAt: null,
    createdAt: new Date('2026-06-26'),
    updatedAt: new Date('2026-06-26'),
    ...over,
  });

  beforeEach(async () => {
    prisma = {
      tag: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      postTag: {
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      post: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) =>
        typeof cb === 'function' ? cb(prisma) : Promise.all(cb),
      ),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [TagService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(TagService);
  });

  // ===== findAll =====
  it('1. findAll 不带 q → 按 useCount desc + sortOrder asc + id asc 排序', async () => {
    prisma.tag.findMany.mockResolvedValue([makeTagRow({ id: BigInt(1) })]);
    await service.findAll({});
    const args = prisma.tag.findMany.mock.calls[0][0];
    expect(args.where.deletedAt).toBeNull();
    expect(args.orderBy).toEqual([
      { useCount: 'desc' },
      { sortOrder: 'asc' },
      { id: 'asc' },
    ]);
    expect(args.take).toBe(50); // 默认 limit
  });

  it('2. findAll 带 q → 加 name contains 过滤（不区分大小写）', async () => {
    prisma.tag.findMany.mockResolvedValue([]);
    await service.findAll({ q: '山林' });
    const args = prisma.tag.findMany.mock.calls[0][0];
    expect(args.where.name).toEqual({ contains: '山林' });
    // Prisma MySQL 默认 collation utf8mb4_unicode_ci 大小写不敏感
  });

  it('3. findAll 尊重 limit / offset', async () => {
    prisma.tag.findMany.mockResolvedValue([]);
    await service.findAll({ limit: 10, offset: 20 });
    const args = prisma.tag.findMany.mock.calls[0][0];
    expect(args.take).toBe(10);
    expect(args.skip).toBe(20);
  });

  // ===== findBySlug =====
  it('4. findBySlug 返回 tag + PostTag 关联数', async () => {
    prisma.tag.findFirst.mockResolvedValue(makeTagRow());
    const result = await service.findBySlug('shanlin');
    expect(result.slug).toBe('shanlin');
    expect(prisma.tag.findFirst).toHaveBeenCalledWith({
      where: { slug: 'shanlin', deletedAt: null },
    });
  });

  it('5. findBySlug 不存在 → 抛 NotFoundException', async () => {
    prisma.tag.findFirst.mockResolvedValue(null);
    await expect(service.findBySlug('nonexistent')).rejects.toThrow(NotFoundException);
  });

  // ===== findHot =====
  it('6. findHot(20) → 仅 isHot=true 或 useCount > 0 的标签', async () => {
    prisma.tag.findMany.mockResolvedValue([makeTagRow({ useCount: 10 })]);
    await service.findHot(20);
    const args = prisma.tag.findMany.mock.calls[0][0];
    expect(args.where.OR).toEqual([
      { isHot: true },
      { useCount: { gt: 0 } },
    ]);
    expect(args.take).toBe(20);
    expect(args.orderBy).toEqual([
      { useCount: 'desc' },
      { sortOrder: 'asc' },
    ]);
  });

  it('7. findHot 默认 limit=20', async () => {
    prisma.tag.findMany.mockResolvedValue([]);
    await service.findHot();
    expect(prisma.tag.findMany.mock.calls[0][0].take).toBe(20);
  });

  // ===== create =====
  it('8. create 必填字段校验 → slug unique 冲突抛 ConflictException', async () => {
    prisma.tag.create.mockRejectedValue({ code: 'P2002' });
    await expect(
      service.create({ slug: 'shanlin', name: '山林' }),
    ).rejects.toThrow(ConflictException);
  });

  it('9. create 成功 → 默认 isHot=false, sortOrder=0（useCount 由 DB 默认）', async () => {
    prisma.tag.create.mockResolvedValue(makeTagRow());
    await service.create({ slug: 'xueshan', name: '雪山' });
    const data = prisma.tag.create.mock.calls[0][0].data;
    // service 不显式设 useCount（让 Prisma schema default 0 生效）
    expect(data.useCount).toBeUndefined();
    expect(data.isHot).toBe(false);
    expect(data.sortOrder).toBe(0);
  });

  it('10. create 自动去重 slug — 同 slug 已存在时加 -2', async () => {
    prisma.tag.findFirst.mockResolvedValueOnce(makeTagRow({ slug: 'shanlin' }));
    prisma.tag.create.mockResolvedValue(makeTagRow({ slug: 'shanlin-2' }));
    const result = await service.create({ slug: 'shanlin', name: '山林 2' });
    expect(result.slug).toBe('shanlin-2');
    expect(prisma.tag.create.mock.calls[0][0].data.slug).toBe('shanlin-2');
  });

  // ===== update =====
  it('11. update 找不到 → NotFoundException', async () => {
    prisma.tag.update.mockRejectedValue({ code: 'P2025' });
    await expect(service.update(1n, { name: '新名' })).rejects.toThrow(NotFoundException);
  });

  it('12. update 成功 → 不允许改 slug（DTO 不暴露 slug 字段）', async () => {
    prisma.tag.update.mockResolvedValue(makeTagRow({ name: '改后' }));
    await service.update(1n, { name: '改后', description: 'desc' });
    const data = prisma.tag.update.mock.calls[0][0].data;
    expect(data.slug).toBeUndefined();
    expect(data.name).toBe('改后');
    expect(data.description).toBe('desc');
  });

  // ===== delete =====
  it('13. delete 软删除（写 deletedAt）', async () => {
    prisma.tag.updateMany.mockResolvedValue({ count: 1 });
    await service.delete(1n, 999n);
    const args = prisma.tag.updateMany.mock.calls[0][0];
    expect(args.where.id).toBe(1n);
    expect(args.where.deletedAt).toBeNull();
    expect(args.data.deletedAt).toBeInstanceOf(Date);
    expect(args.data.deletedBy).toBe(999n);
  });

  it('14. delete 已删过的 → 静默返回（不抛错，幂等）', async () => {
    prisma.tag.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.delete(1n, 999n)).resolves.toBeUndefined();
  });

  // ===== PostTag 关联 =====
  it('15. attachToPost 事务内：插入 PostTag + 增加 tag.useCount', async () => {
    prisma.postTag.create.mockResolvedValue({});
    prisma.tag.update.mockResolvedValue({});
    await service.attachToPost(10n, [1n, 2n]);
    // 事务应被调用
    expect(prisma.$transaction).toHaveBeenCalled();
    // 至少 2 次 postTag.create
    expect(prisma.postTag.create).toHaveBeenCalledTimes(2);
    // 2 次 tag.update（useCount +1）
    expect(prisma.tag.update).toHaveBeenCalledTimes(2);
  });

  it('16. attachToPost 重复 (postId, tagId) → 静默跳过（P2002 忽略）', async () => {
    prisma.postTag.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ code: 'P2002' });
    prisma.tag.update.mockResolvedValue({});
    await expect(service.attachToPost(10n, [1n, 2n])).resolves.toBeUndefined();
    // 第二次失败的 update 不应执行（因为 postTag 已存在）
    expect(prisma.tag.update).toHaveBeenCalledTimes(1);
  });

  it('17. detachFromPost 事务内：删除 PostTag + 减少 tag.useCount', async () => {
    prisma.postTag.deleteMany.mockResolvedValue({ count: 2 });
    prisma.tag.update.mockResolvedValue({});
    await service.detachFromPost(10n, [1n, 2n]);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.postTag.deleteMany).toHaveBeenCalledWith({
      where: { postId: 10n, tagId: { in: [1n, 2n] } },
    });
    // 2 次 useCount -1
    expect(prisma.tag.update).toHaveBeenCalledTimes(2);
  });

  // ===== findPostsByTag =====
  it('18. findPostsByTag(tagId, page=1, pageSize=20) — 通过 PostTag 关联查 post', async () => {
    prisma.postTag.findMany.mockResolvedValue([
      { postId: 100n, post: { id: 100n, title: 'A' } },
    ]);
    prisma.postTag.count.mockResolvedValue(1);
    await service.findPostsByTag(1n, { page: 1, pageSize: 20 });
    const args = prisma.postTag.findMany.mock.calls[0][0];
    expect(args.where.tagId).toBe(1n);
    expect(args.where.post.deletedAt).toBeNull();
    expect(args.skip).toBe(0);
    expect(args.take).toBe(20);
  });

  // ===== 数据迁移 =====
  it('19. migrateFromJson 遍历 Post.tags JSON → upsert Tag + PostTag', async () => {
    prisma.post.findMany.mockResolvedValue([
      { id: 10n, tags: ['山林', '雪地胎'] },
      { id: 11n, tags: ['避暑房', '山林'] }, // 山林 重复，应跳过
    ]);
    prisma.tag.findFirst.mockResolvedValue(null);
    prisma.tag.create.mockResolvedValue({});
    prisma.tag.update.mockResolvedValue({});
    prisma.postTag.create.mockResolvedValue({});

    const result = await service.migrateFromJson();

    // 期望：3 个唯一 tag（山林 / 雪地胎 / 避暑房）
    expect(result.tagCreated).toBeGreaterThanOrEqual(2);
    // 期望：3 个 PostTag（10-山林, 10-雪地胎, 11-避暑房, 11-山林）
    expect(result.postTagCreated).toBe(4);
  });

  it('20. migrateFromJson Post.tags 为 null/[] → 跳过', async () => {
    prisma.post.findMany.mockResolvedValue([
      { id: 10n, tags: null },
      { id: 11n, tags: [] },
    ]);
    prisma.tag.findFirst.mockResolvedValue(null);
    prisma.tag.create.mockResolvedValue({});

    const result = await service.migrateFromJson();
    expect(result.tagCreated).toBe(0);
    expect(result.postTagCreated).toBe(0);
  });
});