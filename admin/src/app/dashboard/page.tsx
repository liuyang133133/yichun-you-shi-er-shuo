'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { FileText, Users, Flag, Building2, MessageSquare, TrendingUp, Clock, Brain } from 'lucide-react';

// 修复: 后端返回嵌套结构 (与 admin-dashboard.service.ts 一致), 不是扁平字段
interface PostsBucket { total: number; today: number; pending: number; active: number; byType?: Record<string, number> }
interface UsersBucket { total: number; today: number }
interface ReportsBucket { total: number; pending: number }

interface DashboardData {
  users: UsersBucket;
  posts: PostsBucket;
  reports: ReportsBucket;
  companies: { total: number };
  resumes: { total: number };
  categories: { total: number };
  favorites: { total: number };
  comments: { total: number };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<DashboardData>('/admin/dashboard')
      .then(setData)
      .catch((e) => setError(e?.message || '加载失败'))
      .finally(() => setLoading(false));
  }, []);

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
  if (!data) return null;

  // 兼容字段: 后端用 today, 兜底用 total (历史快照回放场景)
  const cards = [
    { label: '今日新帖', value: data.posts?.today ?? 0, total: data.posts?.total ?? 0, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    { label: '待审核', value: data.posts?.pending ?? 0, total: data.posts?.total ?? 0, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: '今日新用户', value: data.users?.today ?? 0, total: data.users?.total ?? 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: '待处理举报', value: data.reports?.pending ?? 0, total: data.reports?.total ?? 0, icon: Flag, color: 'text-rose-600 bg-rose-50' },
  ];

  const totals = [
    { label: '信息总数', value: data.posts?.total ?? 0, icon: FileText, href: '/posts' },
    { label: '用户总数', value: data.users?.total ?? 0, icon: Users, href: '/users' },
    { label: '举报总数', value: data.reports?.total ?? 0, icon: Flag, href: '/reports' },
    { label: '公司总数', value: data.companies?.total ?? 0, icon: Building2, href: '/companies' },
    { label: '站内信总数', value: 0, icon: MessageSquare, href: '#' },
    { label: 'AI 调用看板', value: '查看 →', icon: Brain, href: '/ai-usage' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">数据看板</h1>
        <p className="text-sm text-muted-foreground mt-1">实时运营数据总览</p>
      </div>

      {/* 关键指标 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${c.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold">{c.value.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {c.label} · 累计 {c.total.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 累计统计 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">累计数据</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {totals.map((t) => {
            const Icon = t.icon;
            return (
              <Link key={t.label} href={t.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{t.label}</span>
                    </div>
                    <div className="text-xl font-bold">
                      {typeof t.value === 'number' ? t.value.toLocaleString() : t.value}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
