'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Hash, ArrowLeft, FileX, Loader2 } from 'lucide-react';
import { tagApi, type Tag } from '@/lib/api';
import { PostCard, type PostCardData } from '@/components/post/post-card';
import {
  PostCardSkeleton,
  EmptyState,
  ErrorState,
} from '@/components/patterns/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  params: Promise<{ slug: string }>;
}

const PAGE_SIZE = 24;

export function TagDetailContent({ params }: Props) {
  const { slug } = use(params);
  const search = useSearchParams();
  const page = Number(search.get('page') || '1');

  const [tag, setTag] = useState<Tag | null>(null);
  const [list, setList] = useState<PostCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      tagApi.get(slug).catch((e) => {
        throw e;
      }),
      tagApi.posts(slug, { page, pageSize: PAGE_SIZE }),
    ])
      .then(([t, r]) => {
        setTag(t);
        // 后端 tag.posts 返回的 list 是带 user/category/area/images 的 post，
        // 与 PostCardData 字段兼容（多字段忽略）
        // T-014: 同样把 postTags → tags 规整
        const normalized = (r?.list || []).map((p: any) => ({
          ...p,
          tags: Array.isArray(p.postTags)
            ? p.postTags.map((pt: any) => pt.tag).filter(Boolean)
            : [],
        }));
        setList(normalized as PostCardData[]);
        setTotal(r?.total || 0);
      })
      .catch((e) => setError(e?.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [slug, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 to-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-4 py-10 md:py-14">
          <Link
            href="/tags"
            className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回全部标签
          </Link>
          {loading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>加载中…</span>
            </div>
          ) : tag ? (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Hash className="h-8 w-8 md:h-10 md:w-10" />
                <h1 className="text-3xl md:text-4xl font-bold">{tag.name}</h1>
              </div>
              {tag.description && (
                <p className="text-white/85 text-sm md:text-base max-w-2xl mb-2">
                  {tag.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-white/80 text-sm">
                <span>{tag.useCount} 帖子</span>
                <span>·</span>
                <span className="text-white/60">#{tag.slug}</span>
              </div>
            </div>
          ) : (
            <h1 className="text-2xl font-bold">标签 #{slug}</h1>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {error ? (
          <ErrorState
            title="加载失败"
            message={error}
            onRetry={() => window.location.reload()}
          />
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<FileX className="h-12 w-12 mx-auto text-muted-foreground/50" />}
            title="还没有帖子使用此标签"
            description="成为第一个使用此标签的人"
            action={{ label: '立即发布', href: '/posts/publish' }}
            secondaryAction={{ label: '浏览全部标签', href: '/tags' }}
          />
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              共 {total} 条结果
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {list.map((post, idx) => (
                <PostCard key={post.id} post={post} index={idx} />
              ))}
            </div>

            {/* 简单分页 */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  return (
                    <Link
                      key={p}
                      href={`/tags/${slug}${p === 1 ? '' : `?page=${p}`}`}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        p === page
                          ? 'bg-emerald-600 text-white'
                          : 'bg-secondary text-secondary-foreground hover:bg-emerald-100'
                      }`}
                    >
                      {p}
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
