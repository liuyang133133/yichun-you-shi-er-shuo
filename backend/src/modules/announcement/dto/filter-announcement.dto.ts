import { IsOptional, IsInt, IsIn, Min, Max, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterAnnouncementDto {
  @IsOptional() @IsInt() @IsIn([0, 1]) @Type(() => Number) status?: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) pageSize?: number = 20;
  /**
   * T-019: 是否包含已软删（仅 admin 视图）
   * 字符串 'true'/'false'（与 T-015 tag DTO 模式一致）
   */
  @IsOptional() @IsBooleanString() includeDeleted?: string;
}
