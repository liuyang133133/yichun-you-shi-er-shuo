'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Sparkles } from 'lucide-react';
import { postApi, buildPostUrl } from '@/lib/api';
import { MODULE_BY_CODE } from '@/config/modules';

interface RelatedPost {
  id: string | number;
  title: string;
  type: string;
  price?: number | string | null;
  priceUnit?: string | null;
  slug?: string | null;
  coverImage?: string | null;
  area?: { name: string } | null;
  category?: { name: string; code: string } | null;
}

export interface RelatedPostsProps {
  postId: string | number;
  /** 默认 5 */
  limit?: number;
  /** 自定义标题（默认"相关推荐"） */
  title?: string;
}

/**
 * RelatedPosts — 相关推荐
 *
 * - 调 GET /api/v1/posts/:id/related?limit=N 拿相关帖子
 * - 移动端 1 列、sm 2 列、md 3 列、lg 5 列（与首页列表风格一致）
 * - 每张卡片：封面图 + 类型 chip + 价格 + 标题 + 区域
 * - 链接：/posts/{id}-{slug}
 * - 加载态：5 个 skeleton；空态：「暂无相关推荐」
 */
export function RelatedPosts({
  postId,
  limit = 5,
  title = '相关推荐',
}: RelatedPostsProps) {
  const [list, setList] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    postApi
      .related(postId, limit)
      .then((r: any) => {
        if (cancelled) return;
        setList(Array.isArray(r) ? r : r?.list || []);
      })
      .catch(() => {
        if (!cancelled) setList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, limit]);

  return (
    <section className="mt-10 max-w-6xl mx-auto" aria-labelledby="related-posts-title">
      <header className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 id="related-posts-title" className="font-display text-xl font-bold">
          {title}
        </h2>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card overflow-hidden">
              <div className="aspect-[16/9] bg-muted animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 bg-muted rounded animate-pulse w-5/6" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground rounded-2xl border-2 border-dashed bg-muted/30">
          暂无相关推荐
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {list.map((p) => {
            const meta =
              MODULE_BY_CODE[p.type as keyof typeof MODULE_BY_CODE] || MODULE_BY_CODE.secondhand;
            return (
              <Link
                key={p.id}
                href={buildPostUrl(p)}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
              >
                <article className="relative overflow-hidden rounded-2xl border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-hover hover:border-primary/30">
                  {/* 封面图 */}
                  <div
                    className={`relative aspect-[16/9] bg-gradient-to-br ${meta.cardGradient} flex items-center justify-center overflow-hidden`}
                  >
                    {p.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.coverImage}
                        alt={p.title}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <span className="relative text-4xl drop-shadow-lg group-hover:scale-110 transition-transform duration-500">
                        {meta.emoji}
                      </span>
                    )}
                    {/* 类型 chip */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md ring-1 bg-white/90 text-foreground ring-white/40">
                      {meta.title.replace(/(出租|交易|求职|信息)/, '')}
                    </span>
                    {/* 价格 */}
                    {p.price && (
                      <div className="absolute bottom-2 right-2 bg-white/95 dark:bg-black/85 backdrop-blur-sm px-2 py-0.5 rounded shadow">
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                          ¥{p.price}
                        </span>
                        {p.priceUnit && (
                          <span className="text-[9px] text-muted-foreground ml-0.5">
                            /{p.priceUnit}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="p-3 space-y-1.5">
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
                      {p.title}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {p.area?.name && (
                        <span className="inline-flex items-center gap-0.5 truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {p.area.name}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}