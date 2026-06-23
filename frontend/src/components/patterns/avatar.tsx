'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps {
  src?: string | null;
  name?: string;
  /** 自动生成的 fallback 字母 */
  fallback?: string;
  /** 头像尺寸 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** 自定义 className */
  className?: string;
}

const SIZE: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
  '2xl': 'h-24 w-24 text-4xl',
};

// 头像背景色 — 按 name 自动分配（确定性 hash）
const AVATAR_PALETTE = [
  'from-emerald-400 to-teal-600',
  'from-blue-400 to-indigo-600',
  'from-pink-400 to-rose-600',
  'from-amber-400 to-orange-600',
  'from-violet-400 to-purple-600',
  'from-cyan-400 to-sky-600',
  'from-fuchsia-400 to-pink-600',
  'from-lime-400 to-green-600',
];

function hashColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

/**
 * Avatar — 用户头像
 *
 * - 有 src 显示图片
 * - 无 src 显示 name/fallback 首字母 + 渐变背景（按 name 确定性 hash 颜色）
 *
 * 用法：
 * <Avatar src={user.avatar} name={user.nickname} size="lg" />
 */
export function Avatar({
  src,
  name,
  fallback,
  size = 'md',
  className,
}: AvatarProps) {
  const seed = name || fallback || '?';
  const initial = (fallback || name || '?').slice(0, 1).toUpperCase();

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden font-semibold text-white shadow-sm ring-2 ring-background',
        `bg-gradient-to-br ${hashColor(seed)}`,
        SIZE[size],
        className,
      )}
      aria-label={name ? `${name} 的头像` : '匿名头像'}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name || 'avatar'}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span aria-hidden>{initial}</span>
      )}
    </div>
  );
}