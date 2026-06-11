'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PostCard, type PostCardData } from '@/components/post/post-card';
import { postApi } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { ArrowLeft, Plus, FileText } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700' },
  pending: { label: '待审核', color: 'bg-amber-100 text-amber-700' },
  active: { label: '已发布', color: 'bg-emerald-100 text-emerald-700' },
  sold: { label: '已成交', color: 'bg-blue-100 text-blue-700' },
  expired: { label: '已过期', color: 'bg-orange-100 text-orange-700' },
  deleted: { label: '已删除', color: 'bg-red-100 text-red-700' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700' },
};

const TYPE_TABS = [
  { value: '', label: '全部' },
  { value: 'house', label: '房屋' },
  { value: 'secondhand', label: '二手' },
  { value: 'job', label: '招聘' },
  { value: 'lifebiz', label: '便民' },
];

export default function MyPostsPage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center text-muted-foreground">加载中…</div>}>
      <MyPostsContent />
    </Suspense>
  );
}

function MyPostsContent() {
  const router = useRouter();
  const [list, setList] = useState<PostCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    setLoading(true);
    postApi
      .list({ type: activeTab || undefined, pageSize: 50 })
      .then((r: any) => {
        // 后端 /posts/me 返回自己的全部 posts
        setList(r?.list || []);
        setTotal(r?.total || 0);
      })
      .catch(() => {
        setList([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [activeTab, router]);

  return (
    <main className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/me" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回个人中心
        </Link>
        <Link href="/posts/publish">
          <Button size="sm" className="rounded-full">
            <Plus className="h-4 w-4 mr-1" /> 发布新信息
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <FileText className="h-7 w-7 text-primary" /> 我的发布
        </h1>
        <p className="text-sm text-muted-foreground mt-1">管理你发布的所有信息（共 {total} 条）</p>
      </div>

      {/* 类型 Tab */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TYPE_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`px-4 py-1.5 text-sm rounded-full font-medium whitespace-nowrap transition-all ${
              activeTab === t.value
                ? 'bg-foreground text-background shadow-md'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card overflow-hidden">
              <div className="aspect-[16/9] bg-muted animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-muted-foreground mb-4">还没有发布过信息</p>
            <Link href="/posts/publish">
              <Button>立即发布</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {list.map((p, i) => (
            <div key={p.id} className="relative">
              <PostCard post={p} index={i} />
              {(p as any).status && STATUS_LABELS[(p as any).status] && (
                <span
                  className={`absolute top-2 right-2 px-2 py-0.5 text-[10px] rounded-full font-medium ${
                    STATUS_LABELS[(p as any).status].color
                  }`}
                >
                  {STATUS_LABELS[(p as any).status].label}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
