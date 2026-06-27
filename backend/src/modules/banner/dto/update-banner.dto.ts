import { IsString, IsOptional, IsIn, IsInt, IsDateString, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { BANNER_POSITIONS, BANNER_LINK_TYPES } from './create-banner.dto';

/**
 * T-020: 更新 Banner DTO（全字段 Optional）
 * - service 区分破坏性字段 (status/startsAt/endsAt) 写 updatedBy
 */
export class UpdateBannerDto {
  @IsOptional() @IsString() @Length(1, 100) title?: string;
  @IsOptional() @IsString() @Length(1, 500) imageUrl?: string;
  @IsOptional() @IsString() @IsIn(BANNER_LINK_TYPES as unknown as string[]) linkType?: string;
  @IsOptional() @IsString() @Length(0, 500) linkTarget?: string;
  @IsOptional() @IsString() @IsIn(BANNER_POSITIONS as unknown as string[]) position?: string;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) sortOrder?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1) @Type(() => Number) status?: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
}
