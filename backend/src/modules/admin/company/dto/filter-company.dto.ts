import { IsOptional, IsInt, IsIn, Min, Max, IsBooleanString, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * T-021: 过滤 Company DTO
 * - keyword / verified / page / pageSize + includeDeleted
 */
export class FilterCompanyDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  @Type(() => Number)
  verified?: number;

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
   * T-021: 是否包含已软删（仅 admin 视图）
   * 字符串 'true' / 'false'（与 T-019 announcement / T-020 banner DTO 模式一致）
   */
  @IsOptional()
  @IsBooleanString()
  includeDeleted?: string;
}