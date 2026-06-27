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
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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
    aliases: null,
    useCount: 5,
    isHot: false,
    sortOrder: 0,
    status: 1,
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
    expect(args.where.status).toBe(1); // T-015: 排除停用
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
      where: { slug: 'shanlin', deletedAt: null, status: 1 },
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
    expect(args.where.status).toBe(1); // T-015: 排除停用
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

  it('9. create 成功 → 默认 isHot=false, sortOrder=0, status=1（useCount 由 DB 默认）', async () => {
    prisma.tag.create.mockResolvedValue(makeTagRow());
    await service.create({ slug: 'xueshan', name: '雪山' });
    const data = prisma.tag.create.mock.calls[0][0].data;
    // service 不显式设 useCount（让 Prisma schema default 0 生效）
    expect(data.useCount).toBeUndefined();
    expect(data.isHot).toBe(false);
    expect(data.sortOrder).toBe(0);
    expect(data.status).toBe(1); // T-015: 默认启用
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

  // ===== T-015: findAllForAdmin =====
  it('21. findAllForAdmin 默认 includeDeleted=false, includeDisabled=true', async () => {
    prisma.tag.findMany.mockResolvedValue([makeTagRow()]);
    prisma.tag.count.mockResolvedValue(1);
    await service.findAllForAdmin({});
    const args = prisma.tag.findMany.mock.calls[0][0];
    expect(args.where.deletedAt).toBeNull();
    expect(args.where.status).toBeUndefined(); // includeDisabled=true (默认) → 不加 status 过滤
  });

  it('22. findAllForAdmin includeDeleted=true + includeDisabled=false → 不加 deletedAt 过滤, 加 status: 1 过滤', async () => {
    prisma.tag.findMany.mockResolvedValue([makeTagRow({ status: 0, deletedAt: new Date() })]);
    prisma.tag.count.mockResolvedValue(1);
    await service.findAllForAdmin({ includeDeleted: true, includeDisabled: false });
    const args = prisma.tag.findMany.mock.calls[0][0];
    // includeDeleted=true: 不加 deletedAt 过滤
    expect(args.where.deletedAt).toBeUndefined();
    // includeDisabled=false: 加 status: 1 过滤（仅启用）
    expect(args.where.status).toBe(1);
  });

  it('23. findAllForAdmin q → OR(name, slug, aliases) contains 三字段', async () => {
    prisma.tag.findMany.mockResolvedValue([]);
    prisma.tag.count.mockResolvedValue(0);
    await service.findAllForAdmin({ q: '山' });
    const args = prisma.tag.findMany.mock.calls[0][0];
    expect(args.where.OR).toEqual([
      { name: { contains: '山' } },
      { slug: { contains: '山' } },
      { aliases: { contains: '山' } },
    ]);
  });

  it('24. findAllForAdmin 分页 skip/take 正确', async () => {
    prisma.tag.findMany.mockResolvedValue([]);
    prisma.tag.count.mockResolvedValue(0);
    await service.findAllForAdmin({ page: 3, pageSize: 10 });
    const args = prisma.tag.findMany.mock.calls[0][0];
    expect(args.skip).toBe(20); // (3-1)*10
    expect(args.take).toBe(10);
  });

  // ===== T-015: merge =====
  it('25. merge 自身合并 → BadRequestException', async () => {
    await expect(service.merge(1n, 1n)).rejects.toThrow(BadRequestException);
  });

  it('26. merge 源标签不存在 → NotFoundException', async () => {
    prisma.tag.findUnique
      .mockResolvedValueOnce(null) // source
      .mockResolvedValueOnce(null);
    await expect(service.merge(1n, 2n)).rejects.toThrow(NotFoundException);
  });

  it('27. merge 源标签已软删 → NotFoundException', async () => {
    prisma.tag.findUnique
      .mockResolvedValueOnce(makeTagRow({ deletedAt: new Date() })) // source 已删
      .mockResolvedValueOnce(makeTagRow({ id: 2n }));
    await expect(service.merge(1n, 2n)).rejects.toThrow(NotFoundException);
  });

  it('28. merge 目标标签已软删 → NotFoundException', async () => {
    prisma.tag.findUnique
      .mockResolvedValueOnce(makeTagRow())
      .mockResolvedValueOnce(makeTagRow({ id: 2n, deletedAt: new Date() }));
    await expect(service.merge(1n, 2n)).rejects.toThrow(NotFoundException);
  });

  it('29. merge 正常 — 转移 PostTag + useCount 维护 + 软删 source', async () => {
    prisma.tag.findUnique
      .mockResolvedValueOnce(makeTagRow({ id: 1n })) // source
      .mockResolvedValueOnce(makeTagRow({ id: 2n })); // target
    prisma.postTag.findMany
      .mockResolvedValueOnce([{ postId: 10n }, { postId: 11n }]) // source 的 PostTag
      .mockResolvedValueOnce([]); // target 已存在的 (postId, targetId) — 没有
    prisma.postTag.createMany.mockResolvedValue({ count: 2 });
    prisma.postTag.deleteMany.mockResolvedValue({ count: 2 });
    prisma.tag.update.mockResolvedValue({});

    await service.merge(1n, 2n, 999n);

    // 1) source 的 PostTag 全部转移
    expect(prisma.postTag.createMany).toHaveBeenCalledWith({
      data: [
        { postId: 10n, tagId: 2n },
        { postId: 11n, tagId: 2n },
      ],
    });
    // 2) source 的 PostTag 全部删除
    expect(prisma.postTag.deleteMany).toHaveBeenCalledWith({
      where: { tagId: 1n },
    });
    // 3) source: useCount=0 + status=0 + deletedAt=now
    const sourceUpdate = prisma.tag.update.mock.calls[0][0];
    expect(sourceUpdate.where.id).toBe(1n);
    expect(sourceUpdate.data.useCount).toBe(0);
    expect(sourceUpdate.data.status).toBe(0);
    expect(sourceUpdate.data.deletedAt).toBeInstanceOf(Date);
    expect(sourceUpdate.data.deletedBy).toBe(999n);
    // 4) target: useCount += 2
    const targetUpdate = prisma.tag.update.mock.calls[1][0];
    expect(targetUpdate.where.id).toBe(2n);
    expect(targetUpdate.data.useCount).toEqual({ increment: 2 });
  });

  it('30. merge 同 post 已关联 target → createMany 跳过该 post (unique 防重复)', async () => {
    prisma.tag.findUnique
      .mockResolvedValueOnce(makeTagRow({ id: 1n }))
      .mockResolvedValueOnce(makeTagRow({ id: 2n }));
    prisma.postTag.findMany
      .mockResolvedValueOnce([{ postId: 10n }, { postId: 11n }])
      .mockResolvedValueOnce([{ postId: 10n }]); // 10 已关联 target，跳过
    prisma.postTag.createMany.mockResolvedValue({ count: 1 });
    prisma.postTag.deleteMany.mockResolvedValue({ count: 2 });
    prisma.tag.update.mockResolvedValue({});

    await service.merge(1n, 2n);

    // createMany 只插 11（10 已存在）
    expect(prisma.postTag.createMany).toHaveBeenCalledWith({
      data: [{ postId: 11n, tagId: 2n }],
    });
    // target useCount += 2（含已存在的 10）
    const targetUpdate = prisma.tag.update.mock.calls[1][0];
    expect(targetUpdate.data.useCount).toEqual({ increment: 2 });
  });
});