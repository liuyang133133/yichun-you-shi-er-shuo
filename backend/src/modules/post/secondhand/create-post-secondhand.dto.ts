import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  Length,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 二手分类选项（V1 固定）
 * 数码电器 / 家居日用 / 服饰鞋包 / 图书音像 / 母婴玩具 / 其他
 */
export const SECONDHAND_CATEGORIES = [
  '数码电器',
  '家居日用',
  '服饰鞋包',
  '图书音像',
  '母婴玩具',
  '运动户外',
  '美妆护肤',
  '其他',
] as const;

export const SECONDHAND_CONDITIONS = [
  '全新',
  '9成新',
  '8成新',
  '7成新',
  '6成新',
  '5成新及以下',
] as const;

export const TRADE_METHODS = ['同城自提', '包邮', '均可'] as const;

export class CreatePostSecondhandDto {
  @IsString()
  @IsIn(SECONDHAND_CATEGORIES as unknown as string[], {
    message: `categoryName 必须是 ${SECONDHAND_CATEGORIES.join('/')}`,
  })
  categoryName!: string;

  @IsString()
  @IsIn(SECONDHAND_CONDITIONS as unknown as string[], {
    message: `condition 必须是 ${SECONDHAND_CONDITIONS.join('/')}`,
  })
  condition!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99999999.99)
  @Type(() => Number)
  originalPrice?: number;

  @IsOptional()
  @IsString()
  @IsIn(TRADE_METHODS as unknown as string[], {
    message: `tradeMethod 必须是 ${TRADE_METHODS.join('/')}`,
  })
  tradeMethod?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  usageDuration?: string;
}
