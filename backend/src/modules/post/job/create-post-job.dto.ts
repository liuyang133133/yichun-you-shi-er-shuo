import {
  IsString, IsOptional, IsInt, IsNumber, IsIn, IsArray, Length, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export const JOB_TYPES = ['全职', '兼职', '实习'] as const;
export const JOB_EDUCATIONS = ['不限', '高中', '大专', '本科', '硕士', '博士'] as const;
export const JOB_EXPERIENCES = ['不限', '1年以下', '1-3年', '3-5年', '5-10年', '10年以上'] as const;
export const SALARY_UNITS = ['元/月', '元/天', '元/时'] as const;

export class CreatePostJobDto {
  // [P0-fix] companyId 可选 — 普通个人招聘场景下不传，服务端自动给用户创建"个人招聘"公司
  // 保留 IsInt+Type 是为了在传值时仍做类型校验
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  companyId?: number;

  @IsString()
  @IsIn(JOB_TYPES as unknown as string[], {
    message: `jobType 必须是 ${JOB_TYPES.join('/')}`,
  })
  jobType!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  salaryMax?: number;

  @IsOptional()
  @IsString()
  @IsIn(SALARY_UNITS as unknown as string[])
  salaryUnit?: string;

  @IsOptional()
  @IsString()
  @IsIn(JOB_EDUCATIONS as unknown as string[])
  education?: string;

  @IsOptional()
  @IsString()
  @IsIn(JOB_EXPERIENCES as unknown as string[])
  experience?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  industry?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  welfare?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  @Type(() => Number)
  recruitCount?: number;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  workCity?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  workAddress?: string;
}
