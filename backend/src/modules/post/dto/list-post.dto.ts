import { IsString, IsOptional, IsInt, IsNumber, Min, Max, IsIn, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * 列表查询参数
 * GET /api/v1/posts?type=...&categoryId=...&areaId=...&keyword=...&minPrice=...&maxPrice=...&sort=...&page=...&pageSize=...
 *                            + &tagIds=1,2,3  + &tagSlugs=shanlin,xueshan
 */
export class ListPostQueryDto {
  /**
   * V1.0 验收 BUG-5 修复: type 改为可选
   * 业务背景: 首页"全部信息"混合流 + SEO sitemap 入口需要不带 type 的列表
   * 旧版必填导致 GET /api/v1/posts 一直 400, 整个首页推荐流不可用
   */
  @IsOptional()
  @IsString()
  @IsIn(['house', 'secondhand', 'job', 'lifebiz'])
  type?: 'house' | 'secondhand' | 'job' | 'lifebiz';

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  areaId?: number;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'pending', 'sold', 'expired', 'rejected'])
  status?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  /** 排序：latest（最新）/ oldest（最早）/ price_asc / price_desc */
  @IsOptional()
  @IsString()
  @IsIn(['latest', 'oldest', 'price_asc', 'price_desc'])
  sort?: 'latest' | 'oldest' | 'price_asc' | 'price_desc';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100) // SHOULD-11: 防 DoS,单次最多 100 条
  @Type(() => Number)
  pageSize?: number = 20;

  /**
   * T-013: 按标签 ID 过滤（逗号分隔，如 ?tagIds=1,2,3）
   * 命中规则：post 必须关联**所有**指定 tagId（AND 语义）
   */
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.split(',').map((v) => Number(v.trim())).filter((n) => !Number.isNaN(n))
      : value,
  )
  tagIds?: number[];

  /**
   * T-013: 按标签 slug 过滤（逗号分隔，如 ?tagSlugs=shanlin,xueshan）
   * 与 tagIds 二选一，同时传以 tagIds 为准
   */
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((v) => v.trim()).filter(Boolean) : value,
  )
  tagSlugs?: string[];
}

/**
 * 状态切换 DTO
 * POST /api/v1/posts/:id/status  body: { status: 'active' | 'sold' | 'expired' }
 */
export class ChangeStatusDto {
  @IsString()
  @IsIn(['active', 'sold', 'expired'])
  status!: 'active' | 'sold' | 'expired';
}
