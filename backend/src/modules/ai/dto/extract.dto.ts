import { IsString, IsOptional, IsIn, MinLength, MaxLength } from 'class-validator';

export class ExtractRequestDto {
  @IsString()
  @MinLength(5, { message: 'TEXT_TOO_SHORT' })
  @MaxLength(500, { message: 'TEXT_TOO_LONG' })
  rawText!: string;

  @IsOptional()
  @IsIn(['house', 'job', 'secondhand', 'lifebiz'])
  typeHint?: 'house' | 'job' | 'secondhand' | 'lifebiz';
}

export type AiPostType = 'house' | 'job' | 'secondhand' | 'lifebiz';

export interface ExtractChip {
  label: string;
  value: string | number;
  confidence: number;
}

export interface ExtractResponse {
  type: AiPostType;
  typeConfidence: number;
  fields: Record<string, any>;
  fieldsConfidence: Record<string, number>;
  missingFields: string[];
  chips: ExtractChip[];
  suggestions: {
    titles: string[];
    tags: string[];
  };
  rawTextHash: string;
  durationMs: number;
  cached: boolean;
}
