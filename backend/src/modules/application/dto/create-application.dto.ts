import { IsString, IsOptional, IsInt, Length, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateApplicationDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  postJobId!: number;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  coverLetter?: string;
}
