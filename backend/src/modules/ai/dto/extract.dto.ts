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
  // === 商家与林下经济识别 (Phase 2.2b 准备) ===
  isBusiness?: boolean;
  businessType?: 'recruiter' | 'agent' | 'wholesaler' | null;
  businessConfidence?: number;
  isForestEconomy?: boolean;
  forestCategory?: 'blueberry' | 'fungus' | 'pine-nut' | 'ginseng' | 'hazelnut' | 'honey' | null;
  forestConfidence?: number;
}
