'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { FileText, Users, Flag, Building2, MessageSquare, TrendingUp, Clock } from 'lucide-react';

interface DashboardData {
  totalPosts: number;
  totalUsers: number;
  totalReports: number;
  totalCompanies: number;
  totalMessages: number;
  pendingPosts: number;
  pendingReports: number;
  newUsersToday: number;
  newPostsToday: number;
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

  const cards = [
    { label: '今日新帖', value: data.newPostsToday, total: data.totalPosts, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    { label: '待审核', value: data.pendingPosts, total: data.totalPosts, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: '今日新用户', value: data.newUsersToday, total: data.totalUsers, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: '待处理举报', value: data.pendingReports, total: data.totalReports, icon: Flag, color: 'text-rose-600 bg-rose-50' },
  ];

  const totals = [
    { label: '信息总数', value: data.totalPosts, icon: FileText, href: '/posts' },
    { label: '用户总数', value: data.totalUsers, icon: Users, href: '/users' },
    { label: '举报总数', value: data.totalReports, icon: Flag, href: '/reports' },
    { label: '公司总数', value: data.totalCompanies, icon: Building2, href: '/companies' },
    { label: '站内信总数', value: data.totalMessages, icon: MessageSquare, href: '#' },
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                    <div className="text-xl font-bold">{t.value.toLocaleString()}</div>
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
