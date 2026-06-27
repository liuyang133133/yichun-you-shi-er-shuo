import { ApiProperty } from '@nestjs/swagger';

/**
 * T-P15-02 V1: 公开 SEO 端点 DTO
 */

/** sitemap.org 单条 entry */
export interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: number | string;
}

/** 分类 SEO 响应 */
export class CategorySeoResponseDto {
  @ApiProperty({ description: '分类 ID（bigint as string）', example: '1' })
  id: string;

  @ApiProperty({ description: 'URL slug', example: 'house' })
  slug: string;

  @ApiProperty({ description: '分类名', example: '房屋出租' })
  name: string;

  @ApiProperty({ description: '父分类 ID（顶级为 null）', example: null, nullable: true })
  parentId: string | null;

  @ApiProperty({ description: '图标', example: '🏠', nullable: true })
  icon: string | null;

  @ApiProperty({ description: 'SEO 标题', example: '伊春房屋出租 - 整租/合租/短租 | 伊春有事儿说' })
  seoTitle: string;

  @ApiProperty({ description: 'SEO 关键词数组', example: ['伊春租房', '伊春合租'] })
  seoKeywords: string[];

  @ApiProperty({ description: 'SEO 描述', example: '伊春本地房屋出租信息平台...' })
  seoDescription: string;

  @ApiProperty({ description: '通过审核的帖子数', example: 128 })
  postCount: number;
}

/** 区县 SEO 响应 */
export class AreaSeoResponseDto {
  @ApiProperty({ description: '区县 ID', example: '2' })
  id: string;

  @ApiProperty({ description: 'URL slug', example: 'yimei' })
  slug: string;

  @ApiProperty({ description: '区县名', example: '伊美区' })
  name: string;

  @ApiProperty({ description: '父区县 ID（区县为市级 id）', example: '1', nullable: true })
  parentId: string | null;

  @ApiProperty({ description: '层级（1=市，2=区县，3=街道）', example: 2 })
  level: number;

  @ApiProperty({ description: '行政区划代码', example: '230702', nullable: true })
  adCode: string | null;

  @ApiProperty({ description: 'SEO 标题' })
  seoTitle: string;

  @ApiProperty({ description: 'SEO 关键词数组' })
  seoKeywords: string[];

  @ApiProperty({ description: 'SEO 描述' })
  seoDescription: string;

  @ApiProperty({ description: '通过审核的帖子数', example: 86 })
  postCount: number;
}

/** sitemap.xml 响应（admin 调试用，前端 sitemap.ts 走 /posts/sitemap-full） */
export class SitemapXmlResponseDto {
  @ApiProperty({ description: 'sitemap.org XML 字符串' })
  xml: string;

  @ApiProperty({ description: 'entry 总数（posts + categories + areas）', example: 12543 })
  entryCount: number;
}