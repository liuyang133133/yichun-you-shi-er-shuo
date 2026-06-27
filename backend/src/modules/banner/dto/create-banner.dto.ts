import { IsString, IsOptional, IsIn, IsInt, IsDateString, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';

export const BANNER_POSITIONS = ['home_top', 'home_mid', 'list_top'] as const;
export const BANNER_LINK_TYPES = ['url', 'post', 'category', 'search'] as const;

/**
 * T-020: 创建 Banner DTO
 * - title/imageUrl 必填
 * - 其他字段可选 + 默认值在 service 内
 */
export class CreateBannerDto {
  @IsString()
  @Length(1, 100)
  title!: string;

  @IsString()
  @Length(1, 500)
  imageUrl!: string;

  @IsOptional()
  @IsString()
  @IsIn(BANNER_LINK_TYPES as unknown as string[])
  linkType?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  linkTarget?: string;

  @IsOptional()
  @IsString()
  @IsIn(BANNER_POSITIONS as unknown as string[])
  position?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  status?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
