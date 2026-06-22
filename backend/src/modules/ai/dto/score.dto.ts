import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiPostType } from './extract.dto';

export class ScoreRequestDto {
  @IsString()
  type: AiPostType;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsObject()
  @IsOptional()
  fields?: Record<string, any>;

  @IsString()
  @IsOptional()
  contactPhone?: string;
}

export interface ScoreBreakdown {
  title: number;
  description: number;
  completeness: number;
  contact: number;
}

export interface ScoreResponse {
  score: number;
  breakdown: ScoreBreakdown;
  suggestions: string[];
  cached: boolean;
  durationMs: number;
}