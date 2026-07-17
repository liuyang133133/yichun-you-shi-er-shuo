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
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

// [G-P1-02] P1 修复: 联系方式格式严格校验
// 中国大陆手机号: 11 位数字, 以 1[3-9] 开头
// 不允许填其他用户手机 (虽然技术可行, 但格式错误会被前端发现)
export const PHONE_REGEX = /^1[3-9]\d{9}$/;
// 微信号: 6-20 位字母/数字/下划线/减号 (官方规则)
export const WECHAT_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{4,19}$/;

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
  @IsIn(['出售', '整租', '合租', '短租', '日租'])
  rentalType?: '出售' | '整租' | '合租' | '短租' | '日租';

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
   * 4 大模块 type 枚举（V1.0 — house/secondhand/job/lifebiz）
   */
  @IsString()
  @IsIn(['house', 'secondhand', 'job', 'lifebiz'])
  type!: 'house' | 'secondhand' | 'job' | 'lifebiz';

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

  // [G-P1-02] P1 修复: 手机号格式严格校验 (11位 1[3-9]开头)
  // 原: 仅长度 11-20, 可填 "abcdefg" 或 "12345" 等任意字符串
  // 修复: 用 PHONE_REGEX 强制 11 位 1[3-9]\d{9}
  @IsOptional()
  @IsString()
  @Length(11, 11)
  @Matches(PHONE_REGEX, {
    message: '手机号格式不正确,需为 11 位 1[3-9] 开头的中国大陆手机号',
  })
  contactPhone?: string;

  /**
   * [T-024-q 2026-07-16] 代发 SMS 验证码 (可选)
   * - 默认流程 contactPhone = 当前登录用户手机号 → 不需要验证码, 此字段可省
   * - 代发流程 contactPhone ≠ 当前登录用户手机号 → 必须传此验证码 (已通过 SMS 验证机主同意)
   * - 后端在 service.create 里走 smsService.verifyCode(contactPhone, smsCode)
   */
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: '验证码必须是 6 位' })
  smsCode?: string;

  // [G-P1-02] P1 修复: 微信号格式校验 (字母开头 6-20 位字母数字_-)
  @IsOptional()
  @IsString()
  @Length(6, 20)
  @Matches(WECHAT_REGEX, {
    message: '微信号格式不正确,需以字母开头,共 6-20 位字母/数字/下划线/减号',
  })
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
