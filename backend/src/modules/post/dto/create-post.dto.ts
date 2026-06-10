import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  IsIn,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePostDto {
  @IsInt()
  @Type(() => Number)
  categoryId!: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  areaId?: number;

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

  @IsOptional()
  @IsString()
  @Length(11, 20)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  contactWechat?: string;
}
