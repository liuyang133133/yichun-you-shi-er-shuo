'use client';

/**
 * T-008: Header 通知铃铛 + 未读红点
 *
 * - 显示未读数（>99 显示 99+）
 * - 30s 自动轮询
 * - 点击跳 /me/notifications
 */
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useUnreadCount } from '@/lib/use-unread-count';
import { clsx } from 'clsx';

export function NotificationBell() {
  const { unread } = useUnreadCount({ intervalMs: 30_000 });

  const display = unread > 99 ? '99+' : String(unread);

  return (
    <Link
      href="/me/notifications"
      className="relative h-9 w-9 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center transition-colors"
      aria-label={`通知${unread > 0 ? `（${unread} 条未读）` : ''}`}
      title={unread > 0 ? `${unread} 条未读通知` : '通知'}
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span
          className={clsx(
            'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full',
            'bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center',
            'ring-2 ring-background',
            'animate-pulse-once',
          )}
        >
          {display}
        </span>
      )}
    </Link>
  );
}