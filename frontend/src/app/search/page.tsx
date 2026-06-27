'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PostCard, type PostCardData } from '@/components/post/post-card';
import { postApi } from '@/lib/api';
import { Home, ShoppingBag, Briefcase, Megaphone, Search as SearchIcon, ArrowLeft } from 'lucide-react';

const TYPE_TABS: Array<{ code: string; label: string; icon: any } | null> = [
  null,
  { code: 'house', label: '房屋', icon: Home },
  { code: 'secondhand', label: '二手', icon: ShoppingBag },
  { code: 'job', label: '招聘', icon: Briefcase },
  { code: 'lifebiz', label: '便民', icon: Megaphone },
];

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center text-muted-foreground">加载中…</div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialQ = sp.get('q') || '';
  const initialType = (sp.get('type') as any) || '';

  const [q, setQ] = useState(initialQ);
  const [type, setType] = useState<string>(initialType);
  const [list, setList] = useState<PostCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hot, setHot] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 拉热门词（失败不致命）
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/search/hot?limit=10`)
      .then((r) => r.json())
      .then((j) => setHot(j?.data || []))
      .catch(() => setHot([]));
  }, []);

  function doSearch(nextQ?: string, nextType?: string) {
    const query = (nextQ ?? q).trim();
    const t = nextType ?? type;
    if (!query) {
      setList([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    params.set('q', query);
    if (t) params.set('type', t);
    router.replace(`/search?${params.toString()}`);
    postApi
      .search({ q: query, type: (t || undefined) as any, page: 1, pageSize: 24 })
      .then((r: any) => {
        setList(r?.list || []);
        setTotal(r?.total || 0);
      })
      .catch(() => {
        setList([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }

  // 初次进入时如有 q 自动搜索
  useEffect(() => {
    if (initialQ) doSearch(initialQ, initialType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    doSearch();
    setTimeout(() => setSubmitting(false), 300);
  }

  return (
    <main className="container py-6 space-y-6">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> 返回首页
      </Link>

      {/* 搜索框 */}
      <Card className="overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <form onSubmit={onSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索你感兴趣的信息（如：伊美区 二手房、餐饮服务员、顺风车）…"
                className="pl-10 h-12 text-base"
                autoFocus
              />
            </div>
            <Button type="submit" size="lg" className="rounded-full h-12 px-7 bg-gradient-to-r from-primary to-emerald-600">
              {submitting ? '搜索中…' : '搜索'}
            </Button>
          </form>

          {/* 类型 tab */}
          <div className="flex flex-wrap gap-2">
            {TYPE_TABS.map((t, i) => {
              const Icon = t?.icon;
              const active = (t?.code || '') === type;
              return (
                <button
                  key={t?.code || 'all'}
                  onClick={() => {
                    setType(t?.code || '');
                    if (q.trim()) doSearch(undefined, t?.code || '');
                  }}
                  className={`px-3.5 py-1.5 text-sm rounded-full font-medium transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-foreground text-background shadow-md'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {t?.label || '全部'}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 热门词 / 结果区 */}
      {q.trim() === '' ? (
        hot.length > 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-sm font-medium text-muted-foreground mb-3">🔥 大家都在搜</div>
              <div className="flex flex-wrap gap-2">
                {hot.map((kw, i) => (
                  <button
                    key={kw + i}
                    onClick={() => {
                      setQ(kw);
                      doSearch(kw, type);
                    }}
                    className="px-3.5 py-1.5 text-sm rounded-full bg-secondary hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {loading ? '搜索中…' : (
                <>
                  为你找到 <span className="font-bold text-foreground">{total}</span> 条
                  <span className="text-foreground/80">「{q}」</span>相关结果
                </>
              )}
            </span>
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
            <div className="text-center py-20 rounded-2xl border-2 border-dashed bg-muted/30">
              <div className="text-6xl mb-4 opacity-50">🔍</div>
              <p className="text-muted-foreground mb-2">没找到匹配「{q}」的信息</p>
              <p className="text-xs text-muted-foreground mb-4">换个关键词试试，或者直接<a className="text-primary underline" href={`/posts/publish`}>发布一条</a></p>
              <Link href="/"><Button variant="outline">返回首页</Button></Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {list.map((p, i) => (
                <PostCard key={p.id} post={p} index={i} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}