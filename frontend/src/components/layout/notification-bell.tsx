'use client';

/**
 * T-008 + T-010: Header 通知铃铛 + 未读红点
 *
 * T-008 实现：30s 轮询
 * T-010 升级：
 *   - 接入 useRealtimeNotifications：收到 ws 推送立即 +1 + 闪烁动画
 *   - ws 未连接时降级到 30s 轮询
 *   - 显示连接状态（右下次圆点）
 */
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useEffect } from 'react';
import { useUnreadCount } from '@/lib/use-unread-count';
import { useRealtimeNotifications } from '@/lib/use-realtime-notifications';
import { getAccessToken } from '@/lib/auth';
import { clsx } from 'clsx';

export function NotificationBell() {
  const token = getAccessToken();
  const { unread, setUnread, refresh } = useUnreadCount({ intervalMs: 30_000 });

  // ws 实时通知：收到立即 +1 并触发刷新（保证与后端未读数一致）
  const { connected } = useRealtimeNotifications({
    enabled: !!token,
    onNew: () => {
      setUnread(unread + 1);
      // 同步拉一次，避免多端漏推导致数字偏低
      void refresh();
    },
  });

  // 路由切换立即刷新
  useEffect(() => {
    if (token) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const display = unread > 99 ? '99+' : String(unread);

  return (
    <Link
      href="/me/notifications"
      className="relative h-9 w-9 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center transition-colors"
      aria-label={`通知${unread > 0 ? `（${unread} 条未读）` : ''}`}
      title={
        unread > 0
          ? `${unread} 条未读通知${connected ? '（实时已连接）' : '（30s 轮询中）'}`
          : '通知'
      }
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
      {/* 连接状态指示：右下小圆点（绿=ws 已连） */}
      {token && (
        <span
          className={clsx(
            'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-background',
            connected ? 'bg-green-500' : 'bg-gray-400',
          )}
          aria-label={connected ? '实时已连接' : '实时未连接'}
        />
      )}
    </Link>
  );
}