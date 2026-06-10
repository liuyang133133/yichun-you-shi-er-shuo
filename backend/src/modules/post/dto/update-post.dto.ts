import { IsString, IsOptional, IsInt, IsNumber, Min, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePostDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  areaId?: number;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  description?: string;

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
