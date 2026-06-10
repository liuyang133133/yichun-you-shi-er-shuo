'use client';

import Link from 'next/link';
import { MapPin, Eye, Heart, MessageCircle, Clock, Sparkles } from 'lucide-react';

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
}

const TYPE_META: Record<string, { label: string; gradient: string; emoji: string; tone: string }> = {
  house:       { label: '房屋',   gradient: 'from-blue-500 via-blue-600 to-indigo-700',     emoji: '🏠', tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  secondhand:  { label: '二手',   gradient: 'from-pink-500 via-rose-600 to-fuchsia-700',  emoji: '🛍️', tone: 'bg-pink-50 text-pink-700 ring-pink-200' },
  job:         { label: '招聘',   gradient: 'from-emerald-500 via-teal-600 to-cyan-700',  emoji: '💼', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  lifebiz:     { label: '便民',   gradient: 'from-amber-500 via-orange-600 to-red-600',     emoji: '📌', tone: 'bg-amber-50 text-orange-700 ring-amber-200' },
};

/** 时间相对化（"3 分钟前"） */
function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Math.floor((Date.now() - t) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
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
  const meta = TYPE_META[post.type] || TYPE_META.secondhand;
  const animDelay = `${Math.min(index, 12) * 40}ms`;
  return (
    <Link
      href={`/posts/${post.id}`}
      className="group block animate-slide-up"
      style={{ animationDelay: animDelay }}
    >
      <article className="relative overflow-hidden rounded-2xl border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-hover hover:border-primary/30">
        {/* 占位图（带渐变 + emoji）*/}
        <div className={`relative aspect-[16/9] bg-gradient-to-br ${meta.gradient} flex items-center justify-center overflow-hidden`}>
          {/* 装饰圆 */}
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative text-7xl drop-shadow-lg group-hover:scale-110 transition-transform duration-500">
            {meta.emoji}
          </div>
          {/* 类型 chip */}
          <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${meta.tone} ring-1`}>
            {meta.label}
          </span>
          {/* 价格（如有）*/}
          {post.price && (
            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-md">
              <span className="text-base font-bold text-orange-600">
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
                <Eye className="h-3 w-3" />{post.viewCount}
              </span>
              <span className="flex items-center gap-0.5" title="收藏">
                <Heart className="h-3 w-3" />{post.favoriteCount}
              </span>
              <span className="flex items-center gap-0.5" title="留言">
                <MessageCircle className="h-3 w-3" />{post.commentCount}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <Clock className="h-2.5 w-2.5" />
            {timeAgo(post.createdAt)}
          </div>
        </div>
      </article>
    </Link>
  );
}
