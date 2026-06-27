import { IsOptional, IsInt, IsIn, Min, Max, IsBooleanString, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { BANNER_POSITIONS } from './create-banner.dto';

/**
 * T-020: 过滤 Banner DTO
 * - position/status/page/pageSize + includeDeleted
 */
export class FilterBannerDto {
  @IsOptional()
  @IsString()
  @IsIn(BANNER_POSITIONS as unknown as string[])
  position?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  @Type(() => Number)
  status?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20;

  /**
   * T-020: 是否包含已软删（仅 admin 视图）
   * 字符串 'true' / 'false'（与 T-019 announcement DTO 模式一致）
   */
  @IsOptional()
  @IsBooleanString()
  includeDeleted?: string;
}
