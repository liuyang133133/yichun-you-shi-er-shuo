'use client';

/**
 * T-010: 前端 WebSocket 客户端（封装 socket.io-client）
 *
 * 用法：
 *   const { connected, subscribe } = useWs({
 *     onMessage: (data) => { ... },
 *   });
 *
 * 设计要点：
 *   - 单例 socket：每个浏览器 tab 一个连接，namespace='/ws'
 *   - 自动从 auth.ts 取 token（handshake.auth.token）
 *   - 401 时静默关闭（不在 console 喷错）
 *   - 自动重连：socket.io 内置 reconnect，默认 1s 起，5s 上限
 *   - 卸载时断开
 *   - 切换 token（如登入登出）通过 key 强制重连
 */
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './auth';

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':3001') : '');

export interface WsMessage<T = unknown> {
  event: string;
  data: T;
}

export interface UseWsOptions<T = unknown> {
  /** 收到任意消息时回调 */
  onMessage?: (msg: WsMessage<T>) => void;
  /** 连接成功时回调 */
  onConnected?: (userId: string) => void;
  /** 断开时回调 */
  onDisconnected?: () => void;
}

export function useWs<T = unknown>(opts: UseWsOptions<T> = {}) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const token = getAccessToken();

  useEffect(() => {
    if (!token) {
      // 未登录：清理旧 socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      return;
    }

    const socket = io(`${WS_URL}/ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      opts.onDisconnected?.();
    });

    socket.on('connected', (payload: { userId: string; ts: number }) => {
      opts.onConnected?.(payload.userId);
    });

    socket.on('notification', (msg: WsMessage<T>) => {
      opts.onMessage?.(msg);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return {
    connected,
    /** 手动 emit 消息给服务端 */
    send: (event: string, payload?: unknown) => socketRef.current?.emit(event, payload),
    /** 主动断开 */
    disconnect: () => socketRef.current?.disconnect(),
  };
}