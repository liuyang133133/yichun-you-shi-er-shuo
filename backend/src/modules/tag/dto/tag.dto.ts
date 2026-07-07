import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, Length, Matches, IsIn } from 'class-validator';

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

  /** T-015: 别名，逗号分隔 */
  @IsOptional()
  @IsString()
  @Length(0, 500)
  aliases?: string;

  @IsOptional()
  @IsBoolean()
  isHot?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;

  /** T-015: 1=启用 0=禁用，默认 1 */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  status?: number;
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

  /** T-015: 别名，逗号分隔 */
  @IsOptional()
  @IsString()
  @Length(0, 500)
  aliases?: string;

  @IsOptional()
  @IsBoolean()
  isHot?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;

  /** T-015: 1=启用 0=禁用 */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  status?: number;
}

export class FindAllTagDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  /**
   * [P1-04] V1.0 验收修复: 前端 tagApi.list({ pageSize: 100 }) 期望分页格式
   * 但 findAll 用的是 limit/offset;为兼容前端调用, 同时接受 pageSize
   * 后端服务实现时按 limit=Math.min(pageSize, 200) 处理
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;
}

export class FindHotTagDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /**
   * [P1-06] V1.0 验收修复: 热门标签按 type 过滤
   * 业务场景: 房屋租售页面只显示 house 标签, 不显示 lifebiz 标签
   */
  @IsOptional()
  @IsString()
  @IsIn(['house', 'secondhand', 'job', 'lifebiz'])
  type?: 'house' | 'secondhand' | 'job' | 'lifebiz';
}

/**
 * T-015: admin 端标签列表查询 DTO
 *  - includeDeleted / includeDisabled 是 'true' | 'false' 字符串（Query 全部是 string）
 */
export class AdminFindAllTagDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  includeDeleted?: string;

  @IsOptional()
  includeDisabled?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

/**
 * T-015: 合并标签 DTO — A → B
 */
export class MergeTagDto {
  @IsInt()
  @Min(1)
  targetId!: number;
}