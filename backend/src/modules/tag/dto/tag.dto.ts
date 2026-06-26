import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, Length, Matches } from 'class-validator';

/**
 * 标签 slug 规则：小写字母/数字/中划线，1-50 字符
 */
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,49}$/;

export class CreateTagDto {
  @IsString()
  @Matches(SLUG_REGEX, { message: 'slug 必须是小写字母/数字/中划线，1-50 字符' })
  slug!: string;

  @IsString()
  @Length(1, 50)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isHot?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
}

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isHot?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
}

export class FindAllTagDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class FindHotTagDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}