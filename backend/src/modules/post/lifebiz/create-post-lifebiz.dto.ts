import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsDateString,
  Length,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 便民信息子分类（V1 固定）
 * 来自架构文档 1.2.4 + 实际伊春本地常见类型
 */
export const LIFEBIZ_SUB_CATEGORIES = [
  '顺风车',
  '打听事',
  '寻人寻物',
  '家政服务',
  '装修维修',
  '宠物',
  '婚恋交友',
  '教育',
  '二手回收',
  '其他',
] as const;

export const SERVICE_TYPES = ['提供', '需求'] as const;
export const VALIDITY_PERIODS = ['一天', '一周', '一个月', '长期'] as const;

export class CreatePostLifebizDto {
  @IsString()
  @IsIn(LIFEBIZ_SUB_CATEGORIES as unknown as string[], {
    message: `subCategory 必须是 ${LIFEBIZ_SUB_CATEGORIES.join('/')}`,
  })
  subCategory!: string;

  @IsString()
  @IsIn(SERVICE_TYPES as unknown as string[], {
    message: `serviceType 必须是 提供/需求`,
  })
  serviceType!: string;

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
  @IsIn(VALIDITY_PERIODS as unknown as string[], {
    message: `validityPeriod 必须是 ${VALIDITY_PERIODS.join('/')}`,
  })
  validityPeriod?: string;

  /**
   * 自动按 validityPeriod 计算的过期时间
   * - 一天：+1 天
   * - 一周：+7 天
   * - 一个月：+30 天
   * - 长期：null（不过期）
   */
  @IsOptional()
  @IsDateString()
  expireAt?: string;
}
