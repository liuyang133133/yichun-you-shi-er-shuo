import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiPostType } from './extract.dto';

export class RewriteRequestDto {
  @IsString()
  type: AiPostType;

  @IsIn(['title', 'description'])
  field: 'title' | 'description';

  @IsString()
  @MaxLength(2000)
  original: string;

  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}

export interface RewriteVersion {
  text: string;
  style: 'concise' | 'attractive' | 'seo';
  estimatedScoreGain: number;
}

export interface RewriteResponse {
  versions: RewriteVersion[];
  cached: boolean;
  durationMs: number;
}