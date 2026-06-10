import { IsString, IsOptional, IsIn, Length } from 'class-validator';

export const COMPANY_SCALES = [
  '1-20人', '20-99人', '100-499人', '500-999人', '1000-4999人', '5000人以上',
] as const;

export const COMPANY_NATURES = [
  '民营', '国企', '外资', '合资', '事业单位', '个体', '其他',
] as const;

export class CreateCompanyDto {
  @IsString()
  @Length(1, 100)
  name!: string;

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
}
