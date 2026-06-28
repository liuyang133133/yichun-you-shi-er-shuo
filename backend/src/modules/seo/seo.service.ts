import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SEO_META_SYSTEM_PROMPT, buildSeoMetaUserPrompt } from '../ai/llm/prompts/seo-meta';
import { ClaudeClient } from '../ai/llm/claude.client';
import { GlmClient } from '../ai/llm/glm.client';
import { BaiduHttpClient } from './baidu-http.client';
import {
  CategorySeoResponseDto,
  AreaSeoResponseDto,
  SitemapEntry,
} from './dto/seo-meta.dto';

interface SeoMetaResult {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  jsonLd: Record<string, any>;
}

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);
  private readonly llm: any;
  private readonly baiduPushToken: string;

  constructor(
    private readonly prisma: PrismaService,
    claude: ClaudeClient,
    glm: GlmClient,
    private readonly http: BaiduHttpClient,
    private readonly config: ConfigService,
  ) {
    const provider = (this.config.get<string>('AI_PROVIDER') || 'glm').toLowerCase();
    this.llm = provider === 'claude' ? claude : glm;
    this.baiduPushToken = this.config.get<string>('BAIDU_PUSH_TOKEN') || '';
  }

  async generateSeoMeta(postId: bigint): Promise<{ postId: bigint; seoMeta: any; durationMs: number }> {
    const start = Date.now();
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { area: true },
    });
    if (!post) throw new Error('Post not found');

    if (!this.llm.isAvailable()) {
      throw new Error('AI 暂不可用');
    }

    const fields: Record<string, any> = {
      title: post.title,
      description: post.description,
    };
    if (post.price) fields.price = Number(post.price);
    if (post.area) fields.areaName = post.area.name;

    const llmResult = await this.llm.call({
      system: SEO_META_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildSeoMetaUserPrompt(post.type as any, fields) }],
      maxTokens: 1000,
      temperature: 0.2,
      timeoutMs: 30000,
    });

    const parsed = this.parseSeoJson(llmResult.text);
    const seoMeta = {
      ...parsed,
      generatedAt: new Date().toISOString(),
      modelUsed: llmResult.model,
    };

    await this.prisma.post.update({
      where: { id: postId },
      data: { seoMeta, seoMetaUpdatedAt: new Date() },
    });

    return { postId, seoMeta, durationMs: Date.now() - start };
  }

  async batchGenerateSeoMeta(limit = 100) {
    const posts = await this.prisma.post.findMany({
      where: { seoMetaUpdatedAt: null, status: 'passed' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true },
    });
    let success = 0, failed = 0;
    const results: Array<{ postId: bigint; ok: boolean; error?: string }> = [];
    for (const p of posts) {
      try {
        await this.generateSeoMeta(p.id);
        success++;
        results.push({ postId: p.id, ok: true });
        if (success % 5 === 0) await new Promise((r) => setTimeout(r, 1000));
      } catch (e: any) {
        failed++;
        results.push({ postId: p.id, ok: false, error: e?.message });
      }
    }
    return { success, failed, results };
  }

  async getSitemapData(limit = 50000) {
    const baseUrl = this.config.get<string>('NEXT_PUBLIC_SITE_URL') || 'https://example.com';
    const posts = await this.prisma.post.findMany({
      where: { status: 'passed' },
      orderBy: [{ qualityScore: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: { id: true, updatedAt: true, qualityScore: true },
    });
    return posts.map((p) => {
      const priority = p.qualityScore ? Math.max(0.4, Math.min(1.0, p.qualityScore / 100)) : 0.5;
      return {
        loc: `${baseUrl}/posts/${p.id}`,
        lastmod: p.updatedAt.toISOString(),
        changefreq: 'daily',
        priority: priority.toFixed(1),
      };
    });
  }

  // =====================================================
  // T-P15-02 V1: 公开 SEO 端点
  // =====================================================

  /**
   * 完整 sitemap 数据（posts + categories + areas）
   * 前端 Next.js sitemap.ts 通过 /posts/sitemap-full 一次性 fetch
   */
  async getFullSitemapData(limit = 50000): Promise<{
    posts: SitemapEntry[];
    categories: SitemapEntry[];
    areas: SitemapEntry[];
  }> {
    const baseUrl = this.config.get<string>('NEXT_PUBLIC_SITE_URL') || 'https://example.com';

    const [posts, categories, areas] = await Promise.all([
      this.getSitemapData(limit),
      this.prisma.category.findMany({
        where: { status: 1, deletedAt: null, slug: { not: null } },
        select: { slug: true, updatedAt: true },
      }),
      this.prisma.area.findMany({
        where: { level: { in: [1, 2] }, deletedAt: null, slug: { not: null } },
        // Area model 没有 updatedAt 字段（pre-existing schema），用 createdAt 兜底
        select: { slug: true, createdAt: true },
      }),
    ]);

    return {
      posts,
      categories: categories.map((c) => ({
        loc: `${baseUrl}/c/${c.slug}`,
        lastmod: c.updatedAt.toISOString(),
        changefreq: 'weekly',
        priority: 0.7,
      })),
      areas: areas.map((a) => ({
        loc: `${baseUrl}/a/${a.slug}`,
        lastmod: a.createdAt.toISOString(),
        changefreq: 'weekly',
        priority: 0.7,
      })),
    };
  }

  /**
   * 生成 sitemap.org 0.9 标准 XML
   * - 用 getFullSitemapData() 拉数据
   * - XML escape 函数处理 <, >, &, ", '
   * - 返回 { xml, entryCount }
   */
  async getSitemapXml(): Promise<{ xml: string; entryCount: number }> {
    const data = await this.getFullSitemapData();
    const allEntries: SitemapEntry[] = [...data.posts, ...data.categories, ...data.areas];

    const urls = allEntries
      .map((e) => {
        const priority = typeof e.priority === 'string' ? e.priority : e.priority.toFixed(1);
        return `  <url>
    <loc>${this.escapeXml(e.loc)}</loc>
    <lastmod>${this.escapeXml(e.lastmod)}</lastmod>
    <changefreq>${this.escapeXml(e.changefreq)}</changefreq>
    <priority>${priority}</priority>
  </url>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemapindex.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    return { xml, entryCount: allEntries.length };
  }

  /** 公开 SEO - 分类 by slug */
  async getCategorySeo(slug: string): Promise<CategorySeoResponseDto | null> {
    const cat = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { posts: { where: { status: 'passed' } } },
        },
      },
    });
    if (!cat) return null;

    const seoTitle = cat.seoTitle || `伊春${cat.name} - 伊春有事儿说`;
    const seoKeywords = (cat.seoKeywords || `伊春${cat.name},伊春分类信息`)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const seoDescription =
      cat.seoDescription || `伊春本地${cat.name}分类信息频道，每日更新。`;

    return {
      id: cat.id.toString(),
      slug: cat.slug || '',
      name: cat.name,
      parentId: cat.parentId ? cat.parentId.toString() : null,
      icon: cat.icon,
      seoTitle,
      seoKeywords,
      seoDescription,
      postCount: (cat as any)._count?.posts ?? 0,
    };
  }

  /** 公开 SEO - 区县 by slug */
  async getAreaSeo(slug: string): Promise<AreaSeoResponseDto | null> {
    const area = await this.prisma.area.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { posts: { where: { status: 'passed' } } },
        },
      },
    });
    if (!area) return null;

    const seoTitle = area.seoTitle || `${area.name} - 伊春有事儿说`;
    const seoKeywords = (area.seoKeywords || `${area.name}信息`)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const seoDescription =
      area.seoDescription || `伊春${area.name}本地分类信息平台，每日更新。`;

    return {
      id: area.id.toString(),
      slug: area.slug || '',
      name: area.name,
      parentId: area.parentId ? area.parentId.toString() : null,
      level: area.level,
      adCode: area.adCode,
      seoTitle,
      seoKeywords,
      seoDescription,
      postCount: (area as any)._count?.posts ?? 0,
    };
  }

  /** XML 字符转义 */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async pushBaiduSitemap(postIds?: bigint[]) {
    if (!this.baiduPushToken) {
      throw new Error('BAIDU_PUSH_TOKEN 未配置');
    }
    let ids = postIds;
    if (!ids || ids.length === 0) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const posts = await this.prisma.post.findMany({
        where: { seoMetaUpdatedAt: { gte: sevenDaysAgo }, status: 'passed' },
        select: { id: true },
        take: 5000,
      });
      ids = posts.map((p) => p.id);
    }
    if (ids.length === 0) {
      return { pushed: 0, baiduResponse: { success: 0, remain: 0 }, logId: 0n };
    }

    const baseUrl = this.config.get<string>('NEXT_PUBLIC_SITE_URL') || 'https://example.com';
    const urls = ids.map((id) => `${baseUrl}/posts/${id}`);

    const resp = await this.http.post(
      `http://data.zz.baidu.com/urls?site=${this.config.get('BAIDU_SITE') || 'yichun.com'}&token=${this.baiduPushToken}`,
      urls.join('\n'),
      { 'Content-Type': 'text/plain' },
    );

    const data = resp.data as any;
    const log = await this.prisma.sitemapPushLog.create({
      data: {
        target: 'baidu',
        postIds: ids.map((id) => id.toString()),
        status: data?.error ? 'failed' : 'success',
        response: JSON.stringify(data),
      },
    });

    return {
      pushed: ids.length,
      baiduResponse: { success: data?.success ?? 0, remain: data?.remain ?? 0 },
      logId: log.id,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyBatch() {
    this.logger.log('开始每日 SEO batch');
    const r = await this.batchGenerateSeoMeta(100);
    this.logger.log(`每日 SEO 完成: ${r.success} 成功, ${r.failed} 失败`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async dailyBaiduPush() {
    if (!this.baiduPushToken) return;
    this.logger.log('开始每日百度推送');
    try {
      const r = await this.pushBaiduSitemap();
      this.logger.log(`百度推送: ${r.pushed} 条`);
    } catch (e: any) {
      this.logger.warn(`百度推送失败: ${e?.message}`);
    }
  }

  private parseSeoJson(text: string): SeoMetaResult {
    try {
      const obj = JSON.parse(text);
      if (obj.metaTitle && obj.metaDescription) return obj;
    } catch {}
    const m = text.match(/```(?:json)?\s*(\{[\s\S]+?\})\s*```/);
    if (m) {
      try {
        const obj = JSON.parse(m[1]);
        if (obj.metaTitle && obj.metaDescription) return obj;
      } catch {}
    }
    return { metaTitle: '', metaDescription: '', keywords: [], jsonLd: {} };
  }
}
