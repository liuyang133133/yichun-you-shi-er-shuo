/**
 * AI 用量看板 API 客户端
 * 复用 admin/src/lib/api.ts 的 apiFetch (自动带 Bearer token + 401 跳登录)
 */

import { apiFetch } from './api';

export type AiUsageRange = 'today' | 'week' | 'month';

export interface AiUsageTopUser {
  userId: number | null;
  phone: string;
  calls: number;
}

export interface AiUsageErrorItem {
  code: string;
  count: number;
}

export interface AiUsageStats {
  totalCalls: number;
  successRate: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  totalCostCny: number;
  byKind: Record<string, number>;
  byType: Record<string, number>;
  topUsers: AiUsageTopUser[];
  errorBreakdown: AiUsageErrorItem[];
  // Phase 2.2: 内容质量指标
  seoCoverageRate: number;
  avgQualityScore: number;
  businessPostRate: number;
}

export const aiUsageApi = {
  getStats: (range: AiUsageRange = 'today') =>
    apiFetch<AiUsageStats>('/admin/ai-usage/stats', { params: { range } }),
};
