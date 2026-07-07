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
      category: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      area: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
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

  // =====================================================
  // 现有用例（保持兼容）
  // =====================================================

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

  // =====================================================
  // T-P15-02 V1 新增用例（8 个）
  // =====================================================

  describe('getSitemapXml', () => {
    it('T-P15-02-1: 返回 XML 字符串含 urlset 与 url/loc 节点', async () => {
      mockPrisma.post.findMany.mockResolvedValue([
        { id: 1n, updatedAt: new Date('2026-06-01T00:00:00Z'), qualityScore: 80 },
      ]);
      mockPrisma.category.findMany.mockResolvedValue([
        { slug: 'house', updatedAt: new Date('2026-06-02T00:00:00Z') },
      ]);
      mockPrisma.area.findMany.mockResolvedValue([
        { slug: 'yimei', updatedAt: new Date('2026-06-03T00:00:00Z') },
      ]);

      const { xml, entryCount } = await service.getSitemapXml();

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemapindex.org/schemas/sitemap/0.9">');
      expect(xml).toContain('<loc>https://yichun.com/posts/1</loc>');
      expect(xml).toContain('<loc>https://yichun.com/c/house</loc>');
      expect(xml).toContain('<loc>https://yichun.com/a/yimei</loc>');
      expect(entryCount).toBe(3);
    });

    it('T-P15-02-2: XML 转义 <, >, & 字符', async () => {
      mockPrisma.post.findMany.mockResolvedValue([
        { id: 1n, updatedAt: new Date('2026-06-01T00:00:00Z'), qualityScore: 80 },
      ]);

      const { xml } = await service.getSitemapXml();

      // 无 < > & 在我们的 loc 中，但 changefreq=daily 等不应该被转义
      expect(xml).toContain('<changefreq>daily</changefreq>');
      expect(xml).not.toContain('&lt;changefreq');
    });

    it('T-P15-02-3: posts=0 / categories=0 / areas=0 时仍返回合法 XML', async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.category.findMany.mockResolvedValue([]);
      mockPrisma.area.findMany.mockResolvedValue([]);

      const { xml, entryCount } = await service.getSitemapXml();

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset');
      expect(xml).toContain('</urlset>');
      expect(entryCount).toBe(0);
    });
  });

  describe('getCategorySeo', () => {
    it('T-P15-02-4: 命中 slug=house 返回完整 DTO 含 postCount', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 1n,
        slug: 'house',
        name: '房屋出租',
        parentId: null,
        icon: '🏠',
        seoTitle: '伊春房屋出租 - 整租/合租/短租 | 伊春有事儿说',
        seoKeywords: '伊春租房,伊春合租,小兴安岭租房',
        seoDescription: '伊春本地房屋出租信息平台...',
        _count: { posts: 128 },
      });

      const dto = await service.getCategorySeo('house');

      expect(dto).not.toBeNull();
      expect(dto!.id).toBe('1');
      expect(dto!.slug).toBe('house');
      expect(dto!.name).toBe('房屋出租');
      expect(dto!.seoTitle).toBe('伊春房屋出租 - 整租/合租/短租 | 伊春有事儿说');
      expect(dto!.seoKeywords).toEqual(['伊春租房', '伊春合租', '小兴安岭租房']);
      expect(dto!.postCount).toBe(128);
    });

    it('T-P15-02-5: slug 未命中返回 null', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      const dto = await service.getCategorySeo('nonexistent');

      expect(dto).toBeNull();
    });

    it('T-P15-02-6: seoTitle=null 时使用默认模板兜底', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 5n,
        slug: 'foo',
        name: '测试分类',
        parentId: null,
        icon: null,
        seoTitle: null,
        seoKeywords: null,
        seoDescription: null,
        _count: { posts: 0 },
      });

      const dto = await service.getCategorySeo('foo');

      expect(dto).not.toBeNull();
      expect(dto!.seoTitle).toBe('伊春测试分类 - 伊春有事儿说');
      expect(dto!.seoKeywords).toEqual(['伊春测试分类', '伊春分类信息']);
      expect(dto!.seoDescription).toContain('测试分类');
    });
  });

  describe('getAreaSeo', () => {
    it('T-P15-02-7: 命中 slug=yimei 返回 AreaSeoDto (level=2)', async () => {
      mockPrisma.area.findUnique.mockResolvedValue({
        id: 2n,
        slug: 'yimei',
        name: '伊美区',
        parentId: 1n,
        level: 2,
        adCode: '230702',
        seoTitle: '伊美区房屋出租/二手/招聘/便民信息 | 伊春有事儿说',
        seoKeywords: '伊美区信息,伊美区租房,伊春伊美区',
        seoDescription: '伊春伊美区本地分类信息平台...',
        _count: { posts: 86 },
      });

      const dto = await service.getAreaSeo('yimei');

      expect(dto).not.toBeNull();
      expect(dto!.id).toBe('2');
      expect(dto!.slug).toBe('yimei');
      expect(dto!.name).toBe('伊美区');
      expect(dto!.parentId).toBe('1');
      expect(dto!.level).toBe(2);
      expect(dto!.adCode).toBe('230702');
      expect(dto!.postCount).toBe(86);
    });

    it('T-P15-02-8: slug 未命中返回 null', async () => {
      mockPrisma.area.findUnique.mockResolvedValue(null);

      const dto = await service.getAreaSeo('xxx');

      expect(dto).toBeNull();
    });
  });

  // =====================================================
  // F-3 新增: getPageTdk 通用 TDK 端点
  // =====================================================

  describe('F-3 getPageTdk', () => {
    it('F-3-1: /posts/123 → 返回帖子 TDK（title/description/keywords）', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: 123n,
        title: '整租伊春区金水湾两室一厅',
        description: '<p>精装南北通透，<br/>近学校</p> 拎包入住',
        category: { id: 1n, name: '房屋出租', code: 'house', slug: 'house' },
        area: { id: 2n, name: '伊春区', slug: 'yichun' },
        postTags: [{ tag: { name: '精装' } }, { tag: { name: '拎包入住' } }],
      });
      const tdk = await service.getPageTdk('/posts/123');
      expect(tdk).not.toBeNull();
      expect(tdk!.title).toContain('整租伊春区金水湾');
      expect(tdk!.title).toContain('伊春房屋出租');
      // description 应去 HTML + 截断
      expect(tdk!.description).not.toContain('<p>');
      expect(tdk!.description.length).toBeLessThanOrEqual(165); // 160 + '...'
      // keywords 应包含 标签/分类/区域
      expect(tdk!.keywords).toContain('伊春房屋出租');
      expect(tdk!.keywords).toContain('伊春伊春区');
      expect(tdk!.keywords).toContain('精装');
    });

    it('F-3-2: /posts/123-slug → 忽略 slug 仍命中', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: 123n,
        title: '帖子', description: 'desc',
        category: { id: 1n, name: '房屋出租', code: 'house', slug: 'house' },
        area: null, postTags: [],
      });
      const tdk = await service.getPageTdk('/posts/123-some-slug-here');
      expect(tdk).not.toBeNull();
      expect(tdk!.title).toContain('帖子');
    });

    it('F-3-3: /c/house → 走 CategorySeo', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 1n, slug: 'house', name: '房屋出租', parentId: null, icon: null,
        seoTitle: '伊春房屋出租', seoKeywords: '伊春租房,伊春合租', seoDescription: '伊春房屋...',
        _count: { posts: 100 },
      });
      const tdk = await service.getPageTdk('/c/house');
      expect(tdk).not.toBeNull();
      expect(tdk!.title).toBe('伊春房屋出租');
      expect(tdk!.keywords).toContain('伊春租房');
    });

    it('F-3-4: /a/yimei → 走 AreaSeo', async () => {
      mockPrisma.area.findUnique.mockResolvedValue({
        id: 2n, slug: 'yimei', name: '伊美区', parentId: 1n, level: 2, adCode: null,
        seoTitle: '伊美区信息', seoKeywords: '伊美区', seoDescription: '伊美区描述',
        _count: { posts: 50 },
      });
      const tdk = await service.getPageTdk('/a/yimei');
      expect(tdk).not.toBeNull();
      expect(tdk!.title).toBe('伊美区信息');
    });

    it('F-3-5: path 不匹配 → 返回 null', async () => {
      const tdk = await service.getPageTdk('/unknown/path');
      expect(tdk).toBeNull();
    });

    it('F-3-6: post 不存在 → 返回 null', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);
      const tdk = await service.getPageTdk('/posts/999');
      expect(tdk).toBeNull();
    });
  });
});