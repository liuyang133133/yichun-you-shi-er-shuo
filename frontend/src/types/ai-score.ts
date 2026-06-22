export interface ScoreRequestDto {
  type: 'house' | 'job' | 'secondhand' | 'lifebiz';
  title: string;
  description?: string;
  fields?: Record<string, any>;
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