/**
 * T-008: 通知 API 客户端
 */
import { api } from './api';

export type NotificationEvent =
  | 'comment' | 'audit' | 'order' | 'auth'
  | 'system' | 'appeal' | 'follow' | 'invite';

export interface NotificationItem {
  id: string;
  userId: string;
  event: NotificationEvent;
  channel: string;
  title: string;
  body: string;
  payload: any;
  priority: number;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationSetting {
  event: NotificationEvent;
  enabled: boolean;
  quietHours: { start: string; end: string; timezone?: string } | null;
}

export interface ListNotificationsResp {
  list: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
}

export const notificationsApi = {
  /** 列表 */
  list: (params?: { unreadOnly?: boolean; page?: number; pageSize?: number }) =>
    api.get<ListNotificationsResp>('/notifications/me', {
      unreadOnly: params?.unreadOnly ? 'true' : undefined,
      page: params?.page,
      pageSize: params?.pageSize,
    } as Record<string, string | number | undefined>),

  /** 未读数 */
  unreadCount: async (): Promise<number> => {
    const r = await api.get<{ count: number }>('/notifications/unread-count');
    return r?.count ?? 0;
  },

  /** 标记单条已读 */
  markRead: (id: string) =>
    api.post<{ updated: number }>(`/notifications/${id}/read`),

  /** 全部已读 */
  markAllRead: () =>
    api.post<{ updated: number }>('/notifications/read-all'),

  /** 软删通知 */
  remove: (id: string) =>
    api.delete<{ updated: number }>(`/notifications/${id}`),

  /** 通知偏好列表 */
  listSettings: () =>
    api.get<NotificationSetting[]>('/notifications/settings'),

  /** 更新某类事件偏好 */
  upsertSetting: (event: NotificationEvent, data: { enabled?: boolean; quietHours?: any }) =>
    api.put<NotificationSetting>(`/notifications/settings/${event}`, data),

  /** 注册推送 Token */
  registerDevice: (data: { platform: 'ios' | 'android' | 'web'; token: string; deviceId?: string }) =>
    api.post('/devices/register', data),

  /** 注销推送 Token */
  unregisterDevice: (token: string) =>
    api.delete(`/devices/${encodeURIComponent(token)}`),
};