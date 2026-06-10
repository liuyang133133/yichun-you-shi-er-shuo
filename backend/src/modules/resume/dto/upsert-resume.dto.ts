import { IsString, IsOptional, IsInt, IsNumber, IsIn, Length, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export const RESUME_EDUCATIONS = ['不限', '高中', '中专', '大专', '本科', '硕士', '博士'] as const;
export const RESUME_EXPERIENCES = ['应届生', '1年以下', '1-3年', '3-5年', '5-10年', '10年以上'] as const;

export class UpsertResumeDto {
  @IsString()
  @Length(1, 50)
  name!: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1, 2])
  @Type(() => Number)
  gender?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  @Type(() => Number)
  age?: number;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  email?: string;

  @IsOptional()
  @IsString()
  @IsIn(RESUME_EDUCATIONS as unknown as string[])
  education?: string;

  @IsOptional()
  @IsString()
  @IsIn(RESUME_EXPERIENCES as unknown as string[])
  experience?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  expectedPosition?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  expectedSalary?: number;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  expectedCity?: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  selfIntro?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  @Type(() => Number)
  isPublic?: number;
}
