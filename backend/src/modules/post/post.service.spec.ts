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

