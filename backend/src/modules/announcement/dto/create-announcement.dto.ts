import { IsString, IsOptional, IsInt, IsDateString, Length, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAnnouncementDto {
  @IsString()
  @Length(1, 100)
  title!: string;

  @IsString()
  @Length(1, 2000)
  content!: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  @Type(() => Number)
  status?: number = 1;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  @Type(() => Number)
  priority?: number = 0;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
