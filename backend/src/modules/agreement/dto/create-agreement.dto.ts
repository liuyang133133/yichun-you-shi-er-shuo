import { IsString, IsInt, IsDateString, IsOptional, IsBoolean, Min, MaxLength, MinLength } from 'class-validator';

export class CreateAgreementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  key!: 'terms' | 'privacy' | 'about' | string;

  @IsInt()
  @Min(1)
  version!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsDateString()
  effectiveAt!: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @IsOptional()
  createdBy?: bigint;
}
