import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SEO_META_SYSTEM_PROMPT, buildSeoMetaUserPrompt } from '../ai/llm/prompts/seo-meta';
import { ClaudeClient } from '../ai/llm/claude.client';
import { GlmClient } from '../ai/llm/glm.client';
import { BaiduHttpClient } from './baidu-http.client';

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
