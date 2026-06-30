import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  Max,
  IsIn,
  IsArray,
  Length,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  JOB_TYPES,
  JOB_EDUCATIONS,
  JOB_EXPERIENCES,
  SALARY_UNITS,
} from '../job/create-post-job.dto';
import {
  LIFEBIZ_SUB_CATEGORIES,
  SERVICE_TYPES,
  VALIDITY_PERIODS,
} from '../lifebiz/create-post-lifebiz.dto';
import {
  SECONDHAND_CATEGORIES,
  SECONDHAND_CONDITIONS,
  TRADE_METHODS,
} from '../secondhand/create-post-secondhand.dto';

/**
 * 子表详情 DTO — 4 大模块的字段集合（所有字段都 IsOptional；
 * PostService.create 会根据 dto.type 走对应分支做必填校验）。
 *
 * 字段名/可选性以 backend/prisma/schema.prisma 为准：
 *   - PostHouse:       rentalType/propertyType 必填；其余可选
 *   - PostSecondhand:  categoryName/condition 必填
 *   - PostJob:         companyId/jobType 必填；其余可选
 *   - PostLifebiz:     subCategory/serviceType 必填
 */

// Error codes:
// - DUPLICATE_POST: 1 天内已发过相同标题的帖子 (400)
export class PostDetailDto {
  // ===== house =====
  @IsOptional()
  @IsString()
  @IsIn(['整租', '合租', '短租', '日租'])
  rentalType?: '整租' | '合租' | '短租' | '日租';

  @IsOptional()
  @IsString()
  @IsIn(['小区', '公寓', '民房', '商铺', '写字楼', '其他'])
  propertyType?: '小区' | '公寓' | '民房' | '商铺' | '写字楼' | '其他';

  @IsOptional()
  @IsString()
  @IsIn(['精装', '简装', '毛坯', '豪装'])
  decoration?: '精装' | '简装' | '毛坯' | '豪装';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99999.99)
  @Type(() => Number)
  areaSqm?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  @Type(() => Number)
  rooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  livingRooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  bathrooms?: number;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  floorInfo?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  orientation?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  @Type(() => Number)
  buildingYear?: number;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  communityName?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  address?: string;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];

  // ===== secondhand =====
  @IsOptional()
  @IsString()
  @IsIn(SECONDHAND_CATEGORIES as unknown as string[])
  categoryName?: string;

  @IsOptional()
  @IsString()
  @IsIn(SECONDHAND_CONDITIONS as unknown as string[])
  condition?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99999999.99)
  @Type(() => Number)
  originalPrice?: number;

  @IsOptional()
  @IsString()
  @IsIn(TRADE_METHODS as unknown as string[])
  tradeMethod?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  usageDuration?: string;

  // ===== job =====
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  companyId?: number;

  @IsOptional()
  @IsString()
  @IsIn(JOB_TYPES as unknown as string[])
  jobType?: string;

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

  // ===== lifebiz =====
  @IsOptional()
  @IsString()
  @IsIn(LIFEBIZ_SUB_CATEGORIES as unknown as string[])
  subCategory?: string;

  @IsOptional()
  @IsString()
  @IsIn(SERVICE_TYPES as unknown as string[])
  serviceType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99999999.99)
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  priceText?: string;

  @IsOptional()
  @IsString()
  @IsIn(VALIDITY_PERIODS as unknown as string[])
  validityPeriod?: string;

  @IsOptional()
  @IsDateString()
  expireAt?: string;
}

export class CreatePostDto {
  @IsInt()
  @Type(() => Number)
  categoryId!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  areaId?: number;

  /**
   * F-2: 9 个 type 枚举 — 4 大模块 + 5 个伊春本地刚需分类
   * carpool/lostfound/contact/forestry/dating 暂只走主表通用字段（description + contactPhone），
   * 无 type-specific 子表，简化发布流程
   */
  @IsString()
  @IsIn([
    'house',
    'secondhand',
    'job',
    'lifebiz',
    'carpool',
    'lostfound',
    'contact',
    'forestry',
    'dating',
  ])
  type!:
    | 'house'
    | 'secondhand'
    | 'job'
    | 'lifebiz'
    | 'carpool'
    | 'lostfound'
    | 'contact'
    | 'forestry'
    | 'dating';

  @IsString()
  @Length(1, 100)
  title!: string;

  @IsString()
  @Length(1, 5000)
  description!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  priceUnit?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  contactName?: string;

  @IsOptional()
  @IsString()
  @Length(11, 20)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  contactWechat?: string;

  /**
   * 子表详情（可选）
   * - 不传：保持向后兼容，前端可继续用旧的两次 HTTP 路径（POST /posts + POST /posts/:id/{type}）
   * - 传了：走单事务原子写入，主表 + 对应子表同时成功 / 失败
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => PostDetailDto)
  detail?: PostDetailDto;

  /**
   * 图片 URL 数组（可选，最多 9 张）
   * - 第一张自动设为封面（isCover=1）
   * - 后端会在主表事务内写入 post_images 表
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  /**
   * T-013: 标签 ID 数组（可选，最多 5 个）
   * 后端在主表创建后调用 TagService.attachToPost 同步 PostTag
   */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  @Max(5, { each: false })
  tagIds?: number[];
}
