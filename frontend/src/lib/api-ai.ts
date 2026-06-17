/**
 * AI 智能发布 API 客户端
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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

export interface SuggestTitleResponse {
  titles: string[];
  cached: boolean;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('yichun_access_token') : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.code !== 0) {
    const err: any = new Error(json?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = json?.code;
    throw err;
  }
  return json.data as T;
}

export const aiApi = {
  extract: (rawText: string, typeHint?: AiPostType): Promise<ExtractResponse> =>
    request<ExtractResponse>('/ai/draft/extract', {
      method: 'POST',
      body: JSON.stringify({ rawText, typeHint }),
    }),
  suggestTitle: (fields: Record<string, any>, count = 3): Promise<SuggestTitleResponse> =>
    request<SuggestTitleResponse>('/ai/draft/suggest-title', {
      method: 'POST',
      body: JSON.stringify({ fields, count }),
    }),
  health: (): Promise<{ available: boolean; model: string; version: string }> =>
    request('/ai/health'),
};

/** 把数字 rawText 长度可视化 */
export const RAW_TEXT_MIN = 5;
export const RAW_TEXT_MAX = 500;
