import { IsString, IsOptional, IsInt, IsNumber, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 房屋特色筛选
 * GET /api/v1/houses?type=house&areaId=...&rentalType=...&minPrice=...&maxPrice=...
 */
export class FilterHouseDto {
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
  @IsIn(['出售', '整租', '合租', '短租', '日租'])
  rentalType?: '出售' | '整租' | '合租' | '短租' | '日租';

  @IsOptional()
  @IsString()
  @IsIn(['小区', '公寓', '民房', '商铺', '写字楼', '其他'])
  propertyType?: '小区' | '公寓' | '民房' | '商铺' | '写字楼' | '其他';

  @IsOptional()
  @IsString()
  @IsIn(['精装', '简装', '毛坯', '豪装'])
  decoration?: '精装' | '简装' | '毛坯' | '豪装';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  rooms?: number;

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

  @IsOptional()
  @IsString()
  keyword?: string;

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
  @Max(100) // SHOULD-11: 防 DoS
  @Type(() => Number)
  pageSize?: number = 20;
}
