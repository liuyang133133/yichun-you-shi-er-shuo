'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { aiUsageApi, AiUsageStats, AiUsageRange } from '@/lib/api-ai-usage';
import { Brain } from 'lucide-react';

const RANGE_LABEL: Record<AiUsageRange, string> = {
  today: '今日',
  week: '本周',
  month: '本月',
};

const KIND_LABEL: Record<string, string> = {
  extract: '信息抽取',
  'suggest-title': '标题建议',
  score: '内容评分',
  rewrite: '内容改写',
  'seo-meta': 'SEO 元信息',
};

export default function AiUsagePage() {
  const [range, setRange] = useState<AiUsageRange>('today');
  const [stats, setStats] = useState<AiUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    aiUsageApi
      .getStats(range)
      .then(setStats)
      .catch((e) => setError(e?.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [range]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-destructive">加载失败：{error}</div>;
  }

  if (!stats) {
    return <div className="p-6 text-muted-foreground">暂无数据</div>;
  }

  const kindEntries = Object.entries(stats.byKind);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">AI 调用看板</h1>
          <p className="text-sm text-muted-foreground mt-1">
            统计 {RANGE_LABEL[range]} 内 GLM-4-Air 调用量、成功率、延迟与成本
          </p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as AiUsageRange)}>
          <TabsList>
            <TabsTrigger value="today">今日</TabsTrigger>
            <TabsTrigger value="week">本周</TabsTrigger>
            <TabsTrigger value="month">本月</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 关键指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="总调用"
          value={stats.totalCalls.toLocaleString()}
          icon={<Brain className="h-5 w-5" />}
          color="text-violet-600 bg-violet-50"
        />
        <StatCard
          label="成功率"
          value={`${(stats.successRate * 100).toFixed(1)}%`}
          color="text-emerald-600 bg-emerald-50"
        />
        <StatCard
          label="平均延迟"
          value={`${stats.avgLatencyMs.toFixed(0)} ms`}
          color="text-amber-600 bg-amber-50"
        />
        <StatCard
          label="估算成本"
          value={`¥${stats.totalCostCny.toFixed(2)}`}
          color="text-blue-600 bg-blue-50"
        />
      </div>

      {/* Phase 2.2: 内容质量指标 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="SEO 覆盖率"
          value={`${(stats.seoCoverageRate * 100).toFixed(0)}%`}
          color="text-indigo-600 bg-indigo-50"
        />
        <StatCard
          label="平均质量分"
          value={stats.avgQualityScore.toFixed(0)}
          color="text-rose-600 bg-rose-50"
        />
        <StatCard
          label="商家帖比例"
          value={`${(stats.businessPostRate * 100).toFixed(0)}%`}
          color="text-cyan-600 bg-cyan-50"
        />
      </div>

      {/* byKind + Top 用户 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>按 kind 分布</CardTitle>
          </CardHeader>
          <CardContent>
            {kindEntries.length === 0 ? (
              <div className="text-sm text-muted-foreground">暂无调用</div>
            ) : (
              <ul className="divide-y">
                {kindEntries.map(([k, v]) => (
                  <li key={k} className="flex justify-between py-2 text-sm">
                    <span>{KIND_LABEL[k] ?? k}</span>
                    <span className="font-mono">{v.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 用户</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topUsers.length === 0 ? (
              <div className="text-sm text-muted-foreground">暂无用户</div>
            ) : (
              <ul className="divide-y">
                {stats.topUsers.map((u) => (
                  <li
                    key={u.userId ?? `anon-${u.phone}`}
                    className="flex justify-between py-2 text-sm"
                  >
                    <span className="font-mono">{u.phone || '(匿名)'}</span>
                    <span className="font-mono text-muted-foreground">{u.calls} 次</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 错误分布 */}
      {stats.errorBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>错误分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {stats.errorBreakdown.map((e) => (
                <li key={e.code} className="flex justify-between py-2 text-sm">
                  <span className="text-rose-600 font-mono">{e.code}</span>
                  <span className="font-mono">{e.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        {icon && (
          <div className={`mb-3 h-10 w-10 rounded-lg flex items-center justify-center ${color ?? ''}`}>
            {icon}
          </div>
        )}
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}
