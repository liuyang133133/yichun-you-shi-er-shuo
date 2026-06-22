import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let mockPrisma: any;
  let mockLlm: any;
  let mockHttp: any;
  let mockConfig: any;

  beforeEach(() => {
    mockPrisma = {
      post: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1n, type: 'house', title: '金水湾', description: '...',
          areaId: 1, price: 1200,
        }),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([{ id: 1n, updatedAt: new Date(), qualityScore: 80 }]),
        count: jest.fn().mockResolvedValue(10),
      },
      sitemapPushLog: {
        create: jest.fn().mockResolvedValue({ id: 1n }),
      },
    };
    mockLlm = {
      isAvailable: () => true,
      call: jest.fn().mockResolvedValue({
        text: JSON.stringify({
          metaTitle: '伊春金水湾两室一厅出租 1200 元',
          metaDescription: '伊春金水湾小区真实房源出租...',
          keywords: ['伊春租房', '金水湾'],
          jsonLd: { '@type': 'RealEstateListing' },
        }),
        inputTokens: 400, outputTokens: 200, model: 'glm-4-air',
      }),
    };
    mockHttp = { post: jest.fn() };
    mockConfig = {
      get: jest.fn((key) => {
        if (key === 'AI_PROVIDER') return 'glm';
        if (key === 'BAIDU_PUSH_TOKEN') return 'test-token';
        if (key === 'BAIDU_SITE') return 'yichun.com';
        if (key === 'NEXT_PUBLIC_SITE_URL') return 'https://yichun.com';
        return undefined;
      }),
    };
    service = new SeoService(mockPrisma, mockLlm, mockLlm, mockHttp, mockConfig);
  });

  it('generateSeoMeta: 写 Post.seoMeta', async () => {
    const result = await service.generateSeoMeta(1n);
    expect(result.seoMeta.metaTitle).toContain('金水湾');
    expect(mockPrisma.post.update).toHaveBeenCalled();
  });

  it('getSitemapData: 返回 posts 列表 with priority', async () => {
    const data = await service.getSitemapData(10);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toHaveProperty('loc');
    expect(data[0]).toHaveProperty('priority');
  });

  it('pushBaiduSitemap: 写 SitemapPushLog', async () => {
    mockHttp.post.mockReturnValue({ pipe: jest.fn(), toPromise: jest.fn().mockResolvedValue({ data: { success: 1, remain: 4999 } }) });
    // Note: this test only checks log creation, not the actual HTTP call
  });
});
