'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { Hash, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { tagApi, type Tag } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function TagsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          加载中…
        </div>
      }
    >
      <TagsContent />
    </Suspense>
  );
}

function TagsContent() {
  const [hotTags, setHotTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      tagApi.hot(20).catch(() => []),
      tagApi.list({ pageSize: 100 }).then((r) => r?.list || []).catch(() => []),
    ]).then(([hot, list]) => {
      setHotTags(hot);
      setAllTags(list.sort((a, b) => b.useCount - a.useCount));
    }).finally(() => setLoading(false));
  }, []);

  // 客户端搜索过滤
  const filteredTags = keyword
    ? allTags.filter(
        (t) =>
          t.name.includes(keyword) ||
          t.slug.toLowerCase().includes(keyword.toLowerCase()),
      )
    : allTags;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 to-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-4 py-12 md:py-16">
          <div className="flex items-center gap-3 mb-3">
            <Hash className="h-8 w-8 md:h-10 md:w-10" />
            <h1 className="text-3xl md:text-4xl font-bold">全部标签</h1>
          </div>
          <p className="text-white/85 text-sm md:text-base max-w-2xl">
            浏览伊春本地热门分类标签 — 季节特产、房屋租售、二手交易、招聘便民，一键直达
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* 热门标签云 */}
        {hotTags.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold">热门标签</h2>
              <span className="text-sm text-muted-foreground">({hotTags.length})</span>
            </div>
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-wrap gap-2.5 justify-center">
                  {hotTags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/tags/${tag.slug}`}
                      className="group relative inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 ring-1 ring-emerald-200 hover:from-emerald-100 hover:to-teal-100 hover:ring-emerald-300 transition-all hover:shadow-sm"
                    >
                      <Hash className="h-3.5 w-3.5 mr-0.5" />
                      {tag.name}
                      {tag.useCount > 0 && (
                        <span className="ml-1.5 text-[10px] text-emerald-500">
                          {tag.useCount}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* 全部标签 + 搜索 */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-emerald-600" />
              <h2 className="text-xl font-bold">全部标签</h2>
              <span className="text-sm text-muted-foreground">
                ({filteredTags.length})
              </span>
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索标签名或 slug…"
              className="px-3 py-1.5 text-sm border rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
              加载中…
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              没有匹配的标签
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tags/${tag.slug}`}
                  className={cn(
                    'group block p-4 rounded-xl border bg-card hover:border-emerald-300 hover:shadow-sm transition-all',
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <Hash className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="font-bold text-sm truncate group-hover:text-emerald-700">
                        {tag.name}
                      </span>
                    </div>
                    {tag.isHot && (
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mb-2 truncate">
                    {tag.slug}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {tag.useCount} 帖子
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
