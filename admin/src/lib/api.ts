/**
 * Admin API 客户端
 * 简化版：直接 fetch + Bearer token
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const TOKEN_KEY = 'yichun_admin_token';
const USER_KEY = 'yichun_admin_user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getUser(): { sub: string; phone: string; role: string } | null {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem(USER_KEY);
  return u ? JSON.parse(u) : null;
}

export function setUser(u: { sub: string; phone: string; role: string }) {
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiFetch<T = any>(
  path: string,
  options: { method?: string; body?: any; params?: Record<string, any> } = {},
): Promise<T> {
  const url = new URL(API_BASE + path);
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }
  const token = getToken();
  const res = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  // 401 自动跳登录: 避免"加载失败 / 没数据"这种迷惑状态
  // 触发场景: token 过期 / role 改了 / 后端 JWT_SECRET 轮换
  if (res.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?expired=1&next=${next}`;
    }
    throw new Error('登录已过期，请重新登录');
  }

  // T-003: 403 权限不足 — 抛带前缀的错误，让页面 .catch 显示
  // 不重定向（已登录用户仅缺权限）
  if (res.status === 403) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.message || '权限不足';
    throw new Error(`[403] ${msg}`);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data !== undefined ? json.data : json;
}

/**
 * T-015: admin 端标签管理 API 封装
 *  - list 支持 includeDeleted / includeDisabled / q / page / pageSize
 *  - merge 接收 sourceId (Path) + targetId (Body)
 */
export interface AdminTag {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  aliases: string | null;
  useCount: number;
  isHot: boolean;
  sortOrder: number;
  status: number; // 1=启用 0=禁用
  deletedAt: string | null;
  createdAt: string;
}

export const adminTagApi = {
  list: (params: {
    q?: string;
    includeDeleted?: boolean;
    includeDisabled?: boolean;
    page?: number;
    pageSize?: number;
  } = {}) =>
    apiFetch<{ list: AdminTag[]; total: number; page: number; pageSize: number }>(
      '/admin/tags',
      { params: params as any },
    ),
  create: (body: Partial<AdminTag>) =>
    apiFetch<AdminTag>('/admin/tags', { method: 'POST', body }),
  update: (id: string | number, body: Partial<AdminTag>) =>
    apiFetch<AdminTag>(`/admin/tags/${id}`, { method: 'PATCH', body }),
  remove: (id: string | number) =>
    apiFetch<{ id: number; deleted: true }>(`/admin/tags/${id}`, { method: 'DELETE' }),
  merge: (sourceId: string | number, targetId: string | number) =>
    apiFetch<{ sourceId: number; targetId: number; merged: true }>(
      `/admin/tags/${sourceId}/merge`,
      { method: 'POST', body: { targetId } },
    ),
};

// T-016: 公告后台管理
export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  status: number; // 1=启用 0=停用
  priority: number; // 1=置顶 0=普通
  startsAt: string | null;
  endsAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const adminAnnouncementApi = {
  list: (params: { status?: number; page?: number; pageSize?: number } = {}) =>
    apiFetch<{ list: AdminAnnouncement[]; total: number; page: number; pageSize: number }>(
      '/admin/announcements',
      { params: params as any },
    ),
  create: (body: Partial<AdminAnnouncement>) =>
    apiFetch<AdminAnnouncement>('/admin/announcements', { method: 'POST', body }),
  update: (id: string | number, body: Partial<AdminAnnouncement>) =>
    apiFetch<AdminAnnouncement>(`/admin/announcements/${id}`, { method: 'PATCH', body }),
  remove: (id: string | number) =>
    apiFetch<{ id: string; deleted: true }>(`/admin/announcements/${id}`, { method: 'DELETE' }),
};
