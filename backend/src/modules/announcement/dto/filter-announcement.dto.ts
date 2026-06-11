import { IsOptional, IsInt, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterAnnouncementDto {
  @IsOptional() @IsInt() @IsIn([0, 1]) @Type(() => Number) status?: number;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) pageSize?: number = 20;
}
