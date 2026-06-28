import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminGuard } from '../admin/guards/admin-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { SeoService } from './seo.service';

@Controller()
export class SeoController {
  constructor(private readonly service: SeoService) {}

  // =====================================================
  // 公开 SEO 端点（前端 sitemap.ts / 爬虫 / 第三方 SEO 工具用）
  // =====================================================

  /**
   * 完整 sitemap 数据（posts + categories + areas）
   * - 前端 Next.js sitemap.ts 调用本端点拼 XML
   * - 公开端点，不需要鉴权
   */
  @Public()
  @Get('seo/sitemap-full')
  async getFullSitemapData(@Query('limit') limit = '50000') {
    return this.service.getFullSitemapData(parseInt(limit));
  }

  /**
   * sitemap.org 0.9 标准 XML
   * - 爬虫（百度 / Google）通过 /sitemap.xml 拉取
   * - Content-Type: application/xml; charset=utf-8
   * - Cache-Control: 5 分钟缓存
   */
  @Public()
  @Get('sitemap.xml')
  async sitemapXml(@Res() res: Response): Promise<void> {
    const { xml } = await this.service.getSitemapXml();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.send(xml);
  }

  /** 公开 SEO - 分类 by slug（前端 /c/[slug] 落地页 V2 接） */
  @Public()
  @Get('seo/categories/:slug')
  async categorySeo(@Param('slug') slug: string) {
    const dto = await this.service.getCategorySeo(slug);
    if (!dto) throw new NotFoundException(`分类 slug '${slug}' 不存在`);
    return dto;
  }

  /** 公开 SEO - 区县 by slug（前端 /a/[slug] 落地页 V2 接） */
  @Public()
  @Get('seo/areas/:slug')
  async areaSeo(@Param('slug') slug: string) {
    const dto = await this.service.getAreaSeo(slug);
    if (!dto) throw new NotFoundException(`区县 slug '${slug}' 不存在`);
    return dto;
  }

  // =====================================================
  // Admin 端点
  // =====================================================

  /** 旧 JSON sitemap（向后兼容） */
  @Public()
  @Get('posts/sitemap-data')
  async getSitemapData(@Query('limit') limit = '50000') {
    return this.service.getSitemapData(parseInt(limit));
  }

  @Post('admin/ai/regenerate-seo/:postId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async regenerateSeo(@Param('postId') postId: string) {
    return this.service.generateSeoMeta(BigInt(postId));
  }

  @Post('admin/ai/regenerate-seo-batch')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async batchRegenerate(@Body() body: { postIds: string[] }) {
    return this.service.batchGenerateSeoMeta(body.postIds?.length || 50);
  }

  @Post('admin/seo/push-baidu')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async pushBaidu(@Body() body: { postIds?: string[] }) {
    return this.service.pushBaiduSitemap(body.postIds?.map((id) => BigInt(id)));
  }
}