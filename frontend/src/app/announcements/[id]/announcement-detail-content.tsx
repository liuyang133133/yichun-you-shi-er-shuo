'use client';

/**
 * T-017: 公告详情页 - client 渲染
 * - 服务端已注入 initial (避免闪烁)
 * - 顶部导航 Link 返回列表
 * - 标题 (h1) + priority badge + meta 行 + content + 最后更新
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Megaphone, Calendar, Clock, Pin, ChevronLeft } from 'lucide-react';
import { announcementApi, type Announcement } from '@/lib/api';
import { formatDateTime } from '@/lib/date';
import { Skeleton, EmptyState } from '@/components/patterns/empty-state';

export function AnnouncementDetailContent({
  id,
  initial,
}: {
  id: string;
  initial?: Announcement | null;
}) {
  const [a, setA] = useState<Announcement | null>(initial || null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (initial) return;
    setLoading(true);
    setError(false);
    announcementApi
      .detail(id)
      .then(setA)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id, initial]);

  if (loading) {
    return (
      <main className="container py-8 max-w-3xl space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (error || !a) {
    return (
      <main className="container py-20 text-center">
        <EmptyState
          title="加载失败"
          description="请稍后重试"
          action={{
            label: '重试',
            onClick: () => window.location.reload(),
          }}
        />
      </main>
    );
  }

  const isPinned = a.priority === 1;

  return (
    <main className="container py-8 max-w-3xl">
      {/* 顶部导航 */}
      <Link
        href="/announcements"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="h-4 w-4" />
        返回公告列表
      </Link>

      <article className="rounded-2xl border bg-card p-6 md:p-8 space-y-6">
        <header className="space-y-3 border-b pb-5">
          <div className="flex items-center gap-2">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                isPinned
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {isPinned ? <Pin className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
            </div>
            {isPinned && (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-semibold">
                置顶公告
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-black leading-tight">
            {a.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              发布于 {formatDateTime(a.createdAt)}
            </span>
            {a.startsAt && a.endsAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                生效 {formatDateTime(a.startsAt)} 至 {formatDateTime(a.endsAt)}
              </span>
            )}
          </div>
        </header>

        <div className="prose prose-sm md:prose-base max-w-none whitespace-pre-wrap text-foreground leading-relaxed">
          {a.content}
        </div>

        <footer className="border-t pt-5 text-xs text-muted-foreground">
          最后更新：{formatDateTime(a.updatedAt)}
        </footer>
      </article>
    </main>
  );
}
