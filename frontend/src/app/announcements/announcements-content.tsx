'use client';

/**
 * T-017: 公告公开列表页 - client 组件
 * 路径: /announcements
 * 功能: Hero + 粘性搜索 + 公告卡列表 + 分页
 *
 * 设计要点:
 * - client-side 搜索（不发请求，公告数量小）
 * - 三态分支: loading / error / empty / list
 * - 公告卡整卡可点击进详情
 */
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { Megaphone, Calendar, Clock, Pin, ChevronLeft, Search } from 'lucide-react';
import { announcementApi, type Announcement } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Skeleton, EmptyState } from '@/components/patterns/empty-state';
import { formatDateTime } from '@/lib/date';

const PAGE_SIZE = 20;

export function AnnouncementsContent() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          加载中…
        </div>
      }
    >
      <AnnouncementsContentInner />
    </Suspense>
  );
}

function AnnouncementsContentInner() {
  const [list, setList] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(p: number) {
    setLoading(true);
    setLoadError(false);
    try {
      const r = await announcementApi.listPublic({ page: p, pageSize: PAGE_SIZE });
      setList(r.list);
      setTotal(r.total);
      setPage(p);
    } catch {
      setList([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  // client-side 搜索：匹配 title + content
  const filtered = keyword.trim()
    ? list.filter((a) => {
        const kw = keyword.trim().toLowerCase();
        return (
          a.title.toLowerCase().includes(kw) ||
          (a.content || '').toLowerCase().includes(kw)
        );
      })
    : list;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <main className="container py-8 space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-100 via-orange-50 to-amber-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/20 p-8 md:p-10 border">
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400 text-xs font-semibold uppercase tracking-widest">
              <Megaphone className="h-4 w-4" /> 官方公告
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">
              平台公告
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              规则变更 · 功能更新 · 活动通知
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              共{' '}
              <span className="font-bold text-foreground">{total}</span>{' '}
              条公告
            </span>
          </div>
        </div>
      </section>

      {/* 粘性搜索条 */}
      <div className="sticky top-16 z-30 -mx-4 px-4 py-3 bg-background/85 backdrop-blur-md border-b">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索公告标题或内容…"
            className="pl-9 rounded-full"
          />
        </div>
      </div>

      {/* 三态分支 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-5">
              <Skeleton className="h-5 w-2/3 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <EmptyState
          title="加载失败"
          description="请检查网络后重试"
          action={{ label: '重新加载', onClick: () => load(1) }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-16 w-16" strokeWidth={1.2} />}
          title={keyword ? '没有匹配的公告' : '暂无公告'}
          description={keyword ? '试试调整关键词' : '这里还很安静'}
          action={
            keyword
              ? { label: '清除搜索', onClick: () => setKeyword('') }
              : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {filtered.map((a) => (
              <AnnouncementCard key={a.id} a={a} />
            ))}
          </div>

          {/* 分页：简单 prev/next（> 1 页才显示） */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1 || loading}
                className="h-9 px-4 rounded-full border bg-card text-sm disabled:opacity-50 hover:bg-secondary"
              >
                <ChevronLeft className="inline h-4 w-4 mr-1" />
                上一页
              </button>
              <span className="text-sm text-muted-foreground px-2">
                第 {page} / {totalPages} 页
              </span>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= totalPages || loading}
                className="h-9 px-4 rounded-full border bg-card text-sm disabled:opacity-50 hover:bg-secondary"
              >
                下一页 →
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function AnnouncementCard({ a }: { a: Announcement }) {
  const isPinned = a.priority === 1;
  return (
    <Link
      href={`/announcements/${a.id}`}
      className="block rounded-2xl border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${
            isPinned
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
              : 'bg-primary/10 text-primary'
          }`}
        >
          {isPinned ? <Pin className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base md:text-lg line-clamp-1">
              {a.title}
            </h3>
            {isPinned && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-semibold">
                置顶
              </span>
            )}
          </div>
          {a.content && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {a.content}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateTime(a.createdAt)}
            </span>
            {a.startsAt && a.endsAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                生效至 {formatDateTime(a.endsAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
