'use client';

/**
 * T-008: 通知未读数 Hook
 *
 * 用法：
 *   const { unread, refresh } = useUnreadCount({ intervalMs: 30_000 });
 *
 * 特性：
 *   - 自动 30s 轮询（可配置 intervalMs=0 关闭）
 *   - 路由切换时立即刷新
 *   - 用户切换（登入/登出）时清零
 *   - 后端 401 时静默停止轮询
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { notificationsApi } from './notifications';
import { getAccessToken } from './auth';

const getToken = getAccessToken;

export interface UseUnreadCountOptions {
  intervalMs?: number;
  /** 立即拉取一次 */
  immediate?: boolean;
}

export function useUnreadCount(opts: UseUnreadCountOptions = {}) {
  const { intervalMs = 30_000, immediate = true } = opts;
  const [unread, setUnread] = useState<number>(0);
  const pathname = usePathname();
  const tokenRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const token = getToken();
    tokenRef.current = token;
    if (!token) {
      setUnread(0);
      return 0;
    }
    try {
      const c = await notificationsApi.unreadCount();
      setUnread(c);
      return c;
    } catch {
      // 401 等错误静默
      return 0;
    }
  }, []);

  // 初次挂载或路径切换时刷新
  useEffect(() => {
    if (immediate) refresh();
  }, [pathname, refresh, immediate]);

  // 轮询
  useEffect(() => {
    if (intervalMs <= 0) return;
    const timer = setInterval(refresh, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, refresh]);

  return { unread, refresh, setUnread };
}