import { IsString, IsOptional, IsInt, IsNumber, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterJobDto {
  @IsOptional() @IsInt() @Type(() => Number) companyId?: number;
  @IsOptional() @IsInt() @Type(() => Number) areaId?: number;

  @IsOptional() @IsString() jobType?: string;
  @IsOptional() @IsString() education?: string;
  @IsOptional() @IsString() experience?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() workCity?: string;

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) minSalary?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) maxSalary?: number;

  @IsOptional() @IsString() keyword?: string;

  @IsOptional() @IsString() @IsIn(['latest', 'salary_asc', 'salary_desc'])
  sort?: 'latest' | 'salary_asc' | 'salary_desc';

  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number = 1;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) pageSize?: number = 20;
}
