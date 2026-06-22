export interface RewriteRequestDto {
  type: 'house' | 'job' | 'secondhand' | 'lifebiz';
  field: 'title' | 'description';
  original: string;
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
