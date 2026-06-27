import { IsOptional, IsString, IsIn, IsInt, Length, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { COMPANY_SCALES, COMPANY_NATURES } from '../../../company/dto/create-company.dto';

/**
 * T-021: 更新 Company DTO（admin 端）
 * - 全部字段 Optional
 * - scale / nature 用 @IsIn 验证（沿用 public 模块的常量）
 * - verified 用 @IsInt + @IsIn([0, 1])
 *
 * T-021 仅在 DTO 层暴露完整字段（便于 T-022+ 加编辑模态时直接复用），
 * 本任务 controller / UI 不接 update 端点。
 */
export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  logo?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  industry?: string;

  @IsOptional()
  @IsString()
  @IsIn(COMPANY_SCALES as unknown as string[])
  scale?: string;

  @IsOptional()
  @IsString()
  @IsIn(COMPANY_NATURES as unknown as string[])
  nature?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  address?: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  description?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  @Type(() => Number)
  verified?: number;
}