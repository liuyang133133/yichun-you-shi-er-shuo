import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsArray,
  Length,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 创建/更新房屋详情
 * POST /api/v1/posts/:id/house
 * PATCH /api/v1/posts/:id/house
 */
export class CreatePostHouseDto {
  @IsString()
  @IsIn(['整租', '合租', '短租', '日租'], {
    message: 'rentalType 必须是 整租/合租/短租/日租',
  })
  rentalType!: '整租' | '合租' | '短租' | '日租';

  @IsString()
  @IsIn(['小区', '公寓', '民房', '商铺', '写字楼', '其他'], {
    message: 'propertyType 必须是 小区/公寓/民房/商铺/写字楼/其他',
  })
  propertyType!: '小区' | '公寓' | '民房' | '商铺' | '写字楼' | '其他';

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

  /** 配套设施：空调/洗衣机/冰箱/热水器/床/衣柜/宽带/电视/沙发/... */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  facilities?: string[];
}
