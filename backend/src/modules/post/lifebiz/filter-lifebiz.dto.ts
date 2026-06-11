import { IsString, IsOptional, IsInt, IsNumber, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { LIFEBIZ_SUB_CATEGORIES, SERVICE_TYPES } from './create-post-lifebiz.dto';

export class FilterLifebizDto {
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
  subCategory?: string;

  @IsOptional()
  @IsString()
  serviceType?: string;

  /** 是否只查未过期的（默认 true） */
  @IsOptional()
  notExpired?: boolean;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  @IsIn(['latest', 'oldest'])
  sort?: 'latest' | 'oldest';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100) // SHOULD-11: 防 DoS
  @Type(() => Number)
  pageSize?: number = 20;
}
