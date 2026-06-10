import { IsString, IsOptional, IsInt, Min, Max, Length } from 'class-validator';

export class CreateCategoryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  parentId?: number;

  @IsString()
  @Length(1, 30)
  code!: string;

  @IsString()
  @Length(1, 50)
  name!: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  status?: number;
}
