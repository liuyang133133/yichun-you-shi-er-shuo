import { IsString, IsOptional, IsInt, IsDateString, Length, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAnnouncementDto {
  @IsOptional() @IsString() @Length(1, 100) title?: string;
  @IsOptional() @IsString() @Length(1, 2000) content?: string;
  @IsOptional() @IsInt() @IsIn([0, 1]) @Type(() => Number) status?: number;
  @IsOptional() @IsInt() @IsIn([0, 1]) @Type(() => Number) priority?: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
}
