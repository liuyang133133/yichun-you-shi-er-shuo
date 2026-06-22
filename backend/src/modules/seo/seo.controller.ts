import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/guards/admin-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SeoService } from './seo.service';

@Controller()
export class SeoController {
  constructor(private readonly service: SeoService) {}

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
