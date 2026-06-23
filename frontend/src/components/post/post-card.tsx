'use client';

import Link from 'next/link';
import { MapPin, Eye, Heart, MessageCircle, Clock } from 'lucide-react';
import { formatRelative } from '@/lib/date';
import { MODULE_BY_CODE } from '@/config/modules';
import { cn } from '@/lib/utils';

export interface PostCardData {
  id: string;
  title: string;
  price: string;
  priceUnit?: string | null;
  type: string;
  area?: { name: string } | null;
  viewCount: number;
  favoriteCount: number;
  commentCount: number;
  createdAt: string;
  user?: { nickname?: string; avatar?: string | null } | null;
  category?: { name: string; code: string } | null;
  /** 封面图 URL（来自 post.images[0]） */
  coverImage?: string | null;
}

/**
 * PostCard - 列表卡片（精致版）
 *  - 顶部渐变占位图（type 颜色）+ emoji
 *  - 浮动类型 chip
 *  - 价格大字号暖橙
 *  - 标题 2 行截断
 *  - hover 上浮 + 阴影变化
 *  - 底部 meta 行
 */
export function PostCard({ post, index = 0 }: { post: PostCardData; index?: number }) {
  const meta = MODULE_BY_CODE[post.type as keyof typeof MODULE_BY_CODE] || MODULE_BY_CODE.secondhand;
  const animDelay = `${Math.min(index, 12) * 40}ms`;
  return (
    <Link
      href={`/posts/${post.id}`}
      className="group block animate-slide-up focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
      style={{ animationDelay: animDelay }}
    >
      <article className="relative overflow-hidden rounded-2xl border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-hover hover:border-primary/30">
        {/* 占位图：有封面用封面，没有则用渐变+emoji */}
        <div className={`relative aspect-[16/9] bg-gradient-to-br ${meta.cardGradient} flex items-center justify-center overflow-hidden`}>
          {post.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.coverImage}
              alt={post.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <>
              <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
              <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative text-7xl drop-shadow-lg group-hover:scale-110 transition-transform duration-500">
                {meta.emoji}
              </div>
            </>
          )}
          {/* 类型 chip */}
          <span
            className={cn(
              'absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md ring-1',
              meta.chipTone,
            )}
          >
            {meta.title.replace(/(出租|交易|求职|信息)/, '')}
          </span>
          {/* 价格（如有）*/}
          {post.price && (
            <div className="absolute bottom-3 right-3 bg-white/95 dark:bg-black/85 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-md">
              <span className="text-base font-bold text-orange-600 dark:text-orange-400">
                ¥{post.price}
              </span>
              {post.priceUnit && (
                <span className="text-[10px] text-muted-foreground ml-0.5">
                  /{post.priceUnit}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 内容 */}
        <div className="p-4 space-y-2.5">
          <h3 className="font-bold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors min-h-[2.75rem]">
            {post.title}
          </h3>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {post.category?.name && (
              <span className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                {post.category.name}
              </span>
            )}
            {post.area?.name && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {post.area.name}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-dashed text-xs text-muted-foreground">
            <span className="flex items-center gap-1 truncate max-w-[60%]">
              {post.user?.nickname || '匿名用户'}
            </span>
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-0.5" title="浏览">
                <Eye className="h-3 w-3" />
                {post.viewCount}
              </span>
              <span className="flex items-center gap-0.5" title="收藏">
                <Heart className="h-3 w-3" />
                {post.favoriteCount}
              </span>
              <span className="flex items-center gap-0.5" title="留言">
                <MessageCircle className="h-3 w-3" />
                {post.commentCount}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <Clock className="h-2.5 w-2.5" />
            {formatRelative(post.createdAt)}
          </div>
        </div>
      </article>
    </Link>
  );
}