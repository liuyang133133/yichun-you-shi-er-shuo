import { IsObject, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { AiPostType } from './extract.dto';

export class SuggestTitleRequestDto {
  @IsIn(['house', 'job', 'secondhand', 'lifebiz'])
  type!: AiPostType;

  @IsObject()
  fields!: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  count?: number;
}

export interface SuggestTitleResponse {
  titles: string[];
  cached: boolean;
  durationMs: number;
}