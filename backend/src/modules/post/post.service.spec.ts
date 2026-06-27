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
    await expect(
      service.create(1n, { title: '重复帖' } as any),
    ).rejects.toMatchObject({
      response: { code: 'DUPLICATE_POST' },
    });
  });

  it('无重复 → 正常创建', async () => {
    mockPrisma.post.findFirst.mockResolvedValue(null);
    mockPrisma.category = { findUnique: jest.fn().mockResolvedValue({ id: 1n, code: 'house' }) };
    mockPrisma.$transaction = jest.fn().mockImplementation(async (fn) => {
      return fn({
        post: { create: jest.fn().mockResolvedValue({ id: 1n }) },
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
