import { IsString, IsOptional, IsInt, Min, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReportDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  postId!: number;

  @IsString()
  @Length(1, 50)
  reason!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}
