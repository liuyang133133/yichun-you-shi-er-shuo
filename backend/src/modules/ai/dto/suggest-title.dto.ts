import { IsObject, IsOptional, IsInt, Min, Max } from 'class-validator';

export class SuggestTitleRequestDto {
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
}
