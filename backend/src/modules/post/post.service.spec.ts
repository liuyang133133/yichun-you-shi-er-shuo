import { PostService } from './post.service';

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
          postTags: [
            { tag: { id: 1n, slug: 'shanye', name: '山野菜' } },
            { tag: { id: 2n, slug: 'bentechan', name: '本地特产' } },
          ],
        }),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
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

