'use client';

/**
 * T-010: 实时通知 Hook
 *
 * - 自动建立 ws 连接（包装 useWs）
 * - 收到 notification 事件时调用 refresh() 立即拉最新未读数
 * - 同时通知 Bell 组件 setUnread(c+1) 即时红点
 *
 * 用法：在 Header / 全局 LayoutProvider 调用一次，
 *       NotificationBell 通过 useUnreadCount 拿未读数
 */
import { useEffect, useState, useCallback } from 'react';
import { useWs } from './use-ws';

export interface RealtimeNotificationPayload {
  id: string;
  event: string;
  title: string;
  body: string;
  priority?: number;
  payload?: Record<string, any>;
  createdAt: string;
}

export function useRealtimeNotifications(opts: {
  /** 收到新通知时回调（用于 +1 / 弹 toast） */
  onNew?: (n: RealtimeNotificationPayload) => void;
  /** 已登录时才连接（外部传入） */
  enabled: boolean;
}) {
  const { enabled, onNew } = opts;
  const [lastNotification, setLastNotification] = useState<RealtimeNotificationPayload | null>(null);

  const handleMessage = useCallback(
    (msg: { event: string; data: unknown }) => {
      if (msg.event !== 'notification') return;
      const data = msg.data as RealtimeNotificationPayload;
      setLastNotification(data);
      onNew?.(data);
    },
    [onNew],
  );

  const { connected } = useWs<RealtimeNotificationPayload>({
    onMessage: handleMessage,
  });

  useEffect(() => {
    if (!enabled) setLastNotification(null);
  }, [enabled]);

  return { connected, lastNotification };
}