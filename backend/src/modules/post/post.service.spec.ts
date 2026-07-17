import { PostService } from './post.service';
import { ForbiddenException } from '@nestjs/common';

describe('PostService.create - 重复检测', () => {
  let service: PostService;
  let mockPrisma: any;
  let mockRedis: any;
  let mockViewLog: any;
  let mockRegisterThrottle: any;
  let mockAiService: any;
  let mockSeoService: any;

  beforeEach(() => {
    mockPrisma = {
      post: {
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({
          id: 1n,
          title: '新帖',
          user: { id: 1n, nickname: 'u', avatar: null },
          category: { id: 1n, name: 'c', code: 'house' },
          area: null,
          images: [],
          // T-013b: 关联 tags（create 回读 include postTags）
          postTags: [],
        }),
        create: jest.fn().mockResolvedValue({ id: 1n }),
        update: jest.fn().mockResolvedValue({ id: 1n }),
      },
      // [P0-001] 默认 user.status=0（正常），封禁测试单独覆盖
      user: {
        findUnique: jest.fn().mockResolvedValue({ status: 0 }),
      },
    };
    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      setEx: jest.fn().mockResolvedValue('OK'),
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
    };
    mockViewLog = {
      recordView: jest.fn().mockResolvedValue(undefined),
    };
    mockRegisterThrottle = {
      assertCanPost: jest.fn().mockResolvedValue(undefined),
      // T-013b: post.service.create 调用的方法（预存在 TS 错误，但代码实际有调用）
      checkPostEligibility: jest.fn().mockResolvedValue(undefined),
      recordPostAttempt: jest.fn().mockResolvedValue(undefined),
    };
    mockAiService = {
      score: jest.fn().mockResolvedValue({ score: 80 }),
    };
    mockSeoService = {
      generateSeoMeta: jest.fn().mockResolvedValue({ seoMeta: { metaTitle: 'test' } }),
    };
    service = new PostService(
      mockPrisma,
      mockRedis,
      mockViewLog,
      mockRegisterThrottle,
      mockAiService,
      mockSeoService,
      // T-013: TagService (attachToPost mock)
      { attachToPost: jest.fn().mockResolvedValue(undefined) } as any,
      // [B-P0-01] SensitiveWordService mock
      { assertClean: jest.fn().mockResolvedValue(undefined) } as any,
      // [T-024-q] SmsService mock
      { sendLoginCode: jest.fn(), verifyCode: jest.fn().mockResolvedValue(undefined) } as any,
    );
  });

  it('1 天内同 title → 抛 DUPLICATE_POST', async () => {
    mockPrisma.post.findFirst.mockResolvedValue({ id: 99n });
    mockPrisma.category = { findUnique: jest.fn().mockResolvedValue({ id: 1n, code: 'house' }) };
    mockPrisma.$transaction = jest.fn().mockImplementation(async (fn) => {
      // 事务内调 tx.post.findFirst 检测重复
      return fn({
        post: { findFirst: jest.fn().mockResolvedValue({ id: 99n }) },
      });
    });
    await expect(
      service.create(1n, { title: '重复帖', categoryId: 1, type: 'house' } as any),
    ).rejects.toMatchObject({
      response: { code: 'DUPLICATE_POST' },
    });
  });

  it('无重复 → 正常创建', async () => {
    mockPrisma.post.findFirst.mockResolvedValue(null);
    mockPrisma.category = { findUnique: jest.fn().mockResolvedValue({ id: 1n, code: 'house' }) };
    mockPrisma.$transaction = jest.fn().mockImplementation(async (fn) => {
      return fn({
        // [P1-007] 事务内重复检测要调 tx.post.findFirst
        post: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 1n }),
        },
        postHouse: { create: jest.fn().mockResolvedValue({}) },
        postImage: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      });
    });
    const dto: any = {
      title: '新帖',
      description: 'desc',
      type: 'house',
      categoryId: 1,
    };
    await expect(service.create(1n, dto)).resolves.toMatchObject({ id: 1n });
  });
});

describe('PostService.findOne - tags include (T-013b)', () => {
  let service: PostService;
  let mockPrisma: any;
  let mockRedis: any;
  let mockViewLog: any;

  beforeEach(() => {
    mockPrisma = {
      post: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1n,
          title: '房源',
          // [P0-AUDIT-2026-07-15] P0-4: findOne 加了 status/auditStatus 过滤,
          // mock 必须有这两个字段且值通过, 否则 404
          status: 'active',
          auditStatus: 'passed',
          userId: 999n, // 跟 viewer 不同, isOwner=false
          postTags: [
            { tag: { id: 1n, slug: 'shanye', name: '山野菜' } },
            { tag: { id: 2n, slug: 'bentechan', name: '本地特产' } },
          ],
        }),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      // [P0-001] 用户表 mock
      user: {
        findUnique: jest.fn().mockResolvedValue({ status: 0 }),
      },
    };
    mockRedis = { get: jest.fn().mockResolvedValue(null), setEx: jest.fn().mockResolvedValue('OK'), invalidatePattern: jest.fn() };
    mockViewLog = { recordView: jest.fn().mockResolvedValue(undefined) };
    service = new PostService(
      mockPrisma,
      mockRedis,
      mockViewLog,
      { assertCanPost: jest.fn() } as any,
      { score: jest.fn() } as any,
      { generateSeoMeta: jest.fn() } as any,
      { attachToPost: jest.fn() } as any,
      // [B-P0-01] SensitiveWordService mock
      { assertClean: jest.fn().mockResolvedValue(undefined) } as any,
      // [T-024-q] SmsService mock
      { sendLoginCode: jest.fn(), verifyCode: jest.fn().mockResolvedValue(undefined) } as any,
    );
  });

  it('findOne 应 include postTags 关联', async () => {
    const post = await service.findOne(1n);
    expect(post).toBeTruthy();
    expect(mockPrisma.post.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          postTags: expect.objectContaining({
            include: expect.objectContaining({
              tag: expect.objectContaining({
                select: { id: true, slug: true, name: true },
              }),
            }),
          }),
        }),
      }),
    );
  });
});

describe('PostService.findAll - tags include (T-013b)', () => {
  let service: PostService;
  let mockPrisma: any;
  let mockRedis: any;
  let mockViewLog: any;

  beforeEach(() => {
    mockPrisma = {
      post: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      // [P0-001] 用户表 mock
      user: {
        findUnique: jest.fn().mockResolvedValue({ status: 0 }),
      },
    };
    mockRedis = { get: jest.fn().mockResolvedValue(null), setEx: jest.fn().mockResolvedValue('OK'), invalidatePattern: jest.fn() };
    mockViewLog = { recordView: jest.fn() };
    service = new PostService(
      mockPrisma,
      mockRedis,
      mockViewLog,
      { assertCanPost: jest.fn() } as any,
      { score: jest.fn() } as any,
      { generateSeoMeta: jest.fn() } as any,
      { attachToPost: jest.fn() } as any,
      // [B-P0-01] SensitiveWordService mock
      { assertClean: jest.fn().mockResolvedValue(undefined) } as any,
      // [T-024-q] SmsService mock
      { sendLoginCode: jest.fn(), verifyCode: jest.fn().mockResolvedValue(undefined) } as any,
    );
  });

  it('findAll 默认分支应 include postTags', async () => {
    await service.findAll({ type: 'house', tagIds: [1] } as any);
    expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          postTags: expect.anything(),
        }),
      }),
    );
  });

  it('findAll + tagIds 过滤应构造 AND 子句', async () => {
    await service.findAll({ type: 'house', tagIds: [1, 2] } as any);
    const callArgs = mockPrisma.post.findMany.mock.calls[0]?.[0];
    expect(callArgs?.where?.AND).toBeDefined();
    expect(callArgs.where.AND.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// [P0-001] 封禁用户拦截 — 写入口（create/update/remove/changeStatus）
// ============================================================
describe('PostService 写入口 - 封禁用户拦截 (P0-001)', () => {
  let service: PostService;
  let mockPrisma: any;
  let mockRedis: any;
  let mockViewLog: any;
  let mockRegisterThrottle: any;
  let mockAiService: any;
  let mockSeoService: any;

  beforeEach(() => {
    mockPrisma = {
      post: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        // 默认模拟：封禁状态 = 1
        findUnique: jest.fn().mockResolvedValue({ status: 1 }),
      },
    };
    mockRedis = {
      get: jest.fn(),
      setEx: jest.fn(),
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
    };
    mockViewLog = { recordView: jest.fn() };
    mockRegisterThrottle = {
      checkPostEligibility: jest.fn(),
      recordPostAttempt: jest.fn(),
    };
    mockAiService = { score: jest.fn() };
    mockSeoService = { generateSeoMeta: jest.fn() };
    service = new PostService(
      mockPrisma,
      mockRedis,
      mockViewLog,
      mockRegisterThrottle,
      mockAiService,
      mockSeoService,
      { attachToPost: jest.fn() } as any,
      // [B-P0-01] SensitiveWordService mock
      { assertClean: jest.fn().mockResolvedValue(undefined) } as any,
      // [T-024-q] SmsService mock
      { sendLoginCode: jest.fn(), verifyCode: jest.fn().mockResolvedValue(undefined) } as any,
    );
  });

  it('create：封禁用户 → 抛 ForbiddenException', async () => {
    await expect(
      service.create(1n, { title: 't', categoryId: 1, type: 'house' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
    // 关键：后续业务逻辑不应触发（重复检测、事务、tag attach 等）
    expect(mockRegisterThrottle.checkPostEligibility).not.toHaveBeenCalled();
    expect(mockPrisma.post.create).not.toHaveBeenCalled();
  });

  it('update：封禁用户 → 抛 ForbiddenException', async () => {
    await expect(
      service.update(1n, 1n, { title: 't' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockPrisma.post.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.post.update).not.toHaveBeenCalled();
  });

  it('remove：封禁用户 → 抛 ForbiddenException', async () => {
    await expect(
      service.remove(1n, 1n),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockPrisma.post.findUnique).not.toHaveBeenCalled();
  });

  it('changeStatus：封禁用户 → 抛 ForbiddenException', async () => {
    await expect(
      service.changeStatus(1n, 1n, 'sold'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockPrisma.post.findUnique).not.toHaveBeenCalled();
  });

  it('create：正常用户 status=0 → 通过封禁检查（继续走到后续逻辑）', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ status: 0 });
    mockPrisma.post.findFirst.mockResolvedValue(null);
    mockPrisma.category = { findUnique: jest.fn().mockResolvedValue({ id: 1n, code: 'house' }) };
    mockPrisma.$transaction = jest.fn().mockImplementation(async (fn) =>
      fn({
        post: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 1n }),
        },
        postImage: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      }),
    );
    // post-transaction findUnique — 仿照已有 happy-path 测试给一个 mock 值
    mockPrisma.post.findUnique
      .mockResolvedValueOnce(null) // create 入口的重复检测
      .mockResolvedValueOnce({     // post-transaction findUnique 返回
        id: 1n,
        user: { id: 1n, nickname: 'u', avatar: null },
        category: { id: 1n, name: 'c', code: 'house' },
        area: null,
        images: [],
        postTags: [],
      });
    await service.create(1n, { title: 't', type: 'house', categoryId: 1 } as any);
    // 关键断言: 封禁检查通过 → 后续业务逻辑 (registerThrottle) 被调用
    expect(mockRegisterThrottle.checkPostEligibility).toHaveBeenCalledWith(1n);
  });
});

// ============================================================
// F-3: slug 生成 + 面包屑 + 相关推荐
// ============================================================

describe('PostService F-3 - slug 生成', () => {
  let service: PostService;
  let mockPrisma: any;
  let mockRedis: any;
  let mockViewLog: any;
  let mockRegisterThrottle: any;
  let mockAiService: any;
  let mockSeoService: any;

  beforeEach(() => {
    mockPrisma = {
      post: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 1n }),
        update: jest.fn().mockResolvedValue({ id: 1n }),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ status: 0 }) },
      category: { findUnique: jest.fn().mockResolvedValue({ id: 1n, code: 'house' }) },
    };
    mockRedis = {
      get: jest.fn(),
      setEx: jest.fn(),
      invalidatePattern: jest.fn().mockReturnValue({ catch: jest.fn() }),
    };
    mockViewLog = { recordView: jest.fn() };
    mockRegisterThrottle = {
      checkPostEligibility: jest.fn(),
      recordPostAttempt: jest.fn(),
    };
    mockAiService = { score: jest.fn() };
    mockSeoService = { generateSeoMeta: jest.fn() };
    service = new PostService(
      mockPrisma,
      mockRedis,
      mockViewLog,
      mockRegisterThrottle,
      mockAiService,
      mockSeoService,
      { attachToPost: jest.fn() } as any,
      // [B-P0-01] SensitiveWordService mock
      { assertClean: jest.fn().mockResolvedValue(undefined) } as any,
      // [T-024-q] SmsService mock
      { sendLoginCode: jest.fn(), verifyCode: jest.fn().mockResolvedValue(undefined) } as any,
    );
  });

  it('create 应自动生成 slug 并写入', async () => {
    let capturedSlug: string | undefined;
    mockPrisma.$transaction = jest.fn().mockImplementation(async (fn) => {
      return fn({
        post: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(({ data }) => {
            capturedSlug = data.slug;
            return { id: 1n };
          }),
        },
        postImage: { createMany: jest.fn() },
      });
    });
    mockPrisma.post.findUnique
      .mockResolvedValueOnce(null)        // create 入口重复检测
      .mockResolvedValueOnce(null)        // resolveSlugConflict 查询
      .mockResolvedValueOnce({ id: 1n }); // post-transaction 回读

    await service.create(1n, {
      title: '伊春市房屋出租',
      description: 'desc',
      type: 'house',
      categoryId: 1,
    } as any);

    expect(capturedSlug).toBeDefined();
    expect(capturedSlug).toMatch(/^yichun-shi-fangwu-chuzu-[a-z0-9]{4}$/);
  });

  it('slug 冲突时 -1 后缀', async () => {
    // 模拟：第一次查询 (base) 命中，第二次 (-1) 未命中
    mockPrisma.post.findFirst
      .mockResolvedValueOnce({ id: 99n }) // base 冲突
      .mockResolvedValueOnce(null);       // -1 不冲突
    const slug = await (service as any).resolveSlugConflict('伊春房屋出租');
    expect(slug).toMatch(/-1$/);
  });

  it('slug 冲突时 -2 后缀（连续冲突）', async () => {
    mockPrisma.post.findFirst
      .mockResolvedValueOnce({ id: 99n })  // base
      .mockResolvedValueOnce({ id: 99n })  // -1
      .mockResolvedValueOnce(null);        // -2
    const slug = await (service as any).resolveSlugConflict('伊春房屋出租');
    expect(slug).toMatch(/-2$/);
  });
});

describe('PostService F-3 - getBreadcrumb', () => {
  let service: PostService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      post: { findUnique: jest.fn() },
      category: { findUnique: jest.fn() },
    };
    mockPrisma.post.findUnique.mockResolvedValue({
      id: 1n,
      title: '整租伊春区',
      slug: 'zhengzu-yichun-a3f2',
      type: 'house',
      category: {
        id: 5n,
        name: '整租',
        code: 'house',
        slug: 'house-zhengzu',
        parentId: 1n,
      },
      area: { id: 2n, name: '伊春区', slug: 'yichun' },
    });
    mockPrisma.category.findUnique.mockResolvedValue({
      id: 1n,
      name: '房屋出租',
      code: 'house',
      slug: 'house',
    });
    service = new PostService(
      mockPrisma, { get: jest.fn(), setEx: jest.fn(), invalidatePattern: jest.fn() } as any,
      { recordView: jest.fn() } as any,
      { checkPostEligibility: jest.fn() } as any,
      { score: jest.fn() } as any,
      { generateSeoMeta: jest.fn() } as any,
      { attachToPost: jest.fn() } as any,
      // [B-P0-01] SensitiveWordService mock
      { assertClean: jest.fn().mockResolvedValue(undefined) } as any,
      // [T-024-q] SmsService mock
      { sendLoginCode: jest.fn(), verifyCode: jest.fn().mockResolvedValue(undefined) } as any,
    );
  });

  it('返回完整面包屑结构（home + category + subCategory + area + post）', async () => {
    const bc = await service.getBreadcrumb(1n);
    expect(bc.home).toBe('/');
    expect(bc.category?.name).toBe('房屋出租');
    expect(bc.category?.slug).toBe('house');
    expect(bc.subCategory?.name).toBe('整租');
    expect(bc.subCategory?.slug).toBe('house-zhengzu');
    expect(bc.area?.name).toBe('伊春区');
    expect(bc.post.title).toBe('整租伊春区');
    expect(bc.post.url).toBe('/posts/1-zhengzu-yichun-a3f2');
  });

  it('顶级分类时 subCategory 应为 null', async () => {
    mockPrisma.post.findUnique.mockResolvedValue({
      id: 2n,
      title: '二手本田',
      slug: 'ershou-bentian-7b9c',
      type: 'secondhand',
      category: { id: 2n, name: '二手交易', code: 'secondhand', slug: 'secondhand', parentId: null },
      area: null,
    });
    const bc = await service.getBreadcrumb(2n);
    expect(bc.subCategory).toBeNull();
    expect(bc.category?.name).toBe('二手交易');
    expect(bc.area).toBeNull();
    expect(bc.post.url).toBe('/posts/2-ershou-bentian-7b9c');
  });

  it('post 不存在 → 抛 NotFoundException', async () => {
    mockPrisma.post.findUnique.mockResolvedValue(null);
    await expect(service.getBreadcrumb(999n)).rejects.toMatchObject({ status: 404 });
  });
});

describe('PostService F-3 - getRelated', () => {
  let service: PostService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      post: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };
    service = new PostService(
      mockPrisma, { get: jest.fn(), setEx: jest.fn(), invalidatePattern: jest.fn() } as any,
      { recordView: jest.fn() } as any,
      { checkPostEligibility: jest.fn() } as any,
      { score: jest.fn() } as any,
      { generateSeoMeta: jest.fn() } as any,
      { attachToPost: jest.fn() } as any,
      // [B-P0-01] SensitiveWordService mock
      { assertClean: jest.fn().mockResolvedValue(undefined) } as any,
      // [T-024-q] SmsService mock
      { sendLoginCode: jest.fn(), verifyCode: jest.fn().mockResolvedValue(undefined) } as any,
    );
  });

  it('同分类/同区域/同标签任一匹配 → 排序按 matchScore DESC', async () => {
    mockPrisma.post.findUnique.mockResolvedValue({
      categoryId: 1n,
      areaId: 2n,
      postTags: [{ tagId: 10n }, { tagId: 11n }],
    });
    // 候选: a) 同分类+同区域+同标签, b) 同分类+同标签, c) 同区域, d) 都不匹配(不会被选因为OR不命中)
    mockPrisma.post.findMany.mockResolvedValue([
      {
        id: 100n, slug: 'a', title: 'a', price: 100, createdAt: new Date('2026-06-29T00:00:00Z'),
        categoryId: 1n, areaId: 2n,
        images: [], area: { name: '伊春区' }, postTags: [{ tagId: 10n }],
      },
      {
        id: 101n, slug: 'b', title: 'b', price: 200, createdAt: new Date('2026-06-29T01:00:00Z'),
        categoryId: 1n, areaId: 99n,
        images: [], area: { name: '其他' }, postTags: [{ tagId: 11n }],
      },
      {
        id: 102n, slug: 'c', title: 'c', price: 300, createdAt: new Date('2026-06-29T02:00:00Z'),
        categoryId: 99n, areaId: 2n,
        images: [], area: { name: '伊春区' }, postTags: [],
      },
    ]);

    const related = await service.getRelated(1n, 5);
    expect(related).toHaveLength(3);
    // a 匹配 3 维度 (cat+area+tag) → 排第一
    expect(related[0].id).toBe('100');
    expect(related[0].matchScore).toBe(3);
    // b 匹配 2 维度 (cat+tag) → 排第二
    expect(related[1].id).toBe('101');
    expect(related[1].matchScore).toBe(2);
    // c 匹配 1 维度 (area) → 排第三
    expect(related[2].id).toBe('102');
    expect(related[2].matchScore).toBe(1);
  });

  it('limit 限制最大 20', async () => {
    mockPrisma.post.findUnique.mockResolvedValue({ categoryId: 1n, areaId: null, postTags: [] });
    mockPrisma.post.findMany.mockResolvedValue([]);
    await service.getRelated(1n, 100);
    // 100 被 clamp 到 20；不影响 findMany 调用（take: 50），但结果 slice(0, 20)
    expect(mockPrisma.post.findMany).toHaveBeenCalled();
  });

  it('post 不存在 → 抛 NotFoundException', async () => {
    mockPrisma.post.findUnique.mockResolvedValue(null);
    await expect(service.getRelated(999n)).rejects.toMatchObject({ status: 404 });
  });
});

