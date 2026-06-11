import { IsString, IsOptional, IsInt, IsNumber, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 列表查询参数
 * GET /api/v1/posts?type=...&categoryId=...&areaId=...&keyword=...&minPrice=...&maxPrice=...&sort=...&page=...&pageSize=...
 */
export class ListPostQueryDto {
  @IsString()
  @IsIn(['house', 'secondhand', 'job', 'lifebiz'])
  type!: 'house' | 'secondhand' | 'job' | 'lifebiz';

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
