/**
 * API 客户端封装
 * 浏览器端 fetch，Next.js 15 客户端组件使用
 */

import { ACCESS_TOKEN_KEY, clearAuth } from './auth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp?: string;
}

export class ApiError extends Error {
  code: number;
  status: number;
  data: unknown;

  constructor(message: string, code: number, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

/**
 * [Bug fix] 401 集中处理：清除本地 token + 跳登录页 + 中文提示
 * 触发场景：token 过期/无效/被加入黑名单时，后端返回 401 + 英文 message="Unauthorized"
 * 之前：toast 显示 "Unauthorized" 用户看不懂
 * 现在：toast 显示 "登录已过期，请重新登录" + 跳登录页
 *
 * 注意：用模块级 _401Handled 防止一次 token 过期导致大量并发请求全部触发 redirect
 */
let _401Handled = false;
function handle401(): void {
  if (typeof window === 'undefined') return;
  if (_401Handled) return;
  _401Handled = true;
  clearAuth();
  // 用 setTimeout 0 把跳转推到下一个 tick，避免覆盖当前 toast
  setTimeout(() => {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
    window.location.href = `/login?redirect=${redirect}&expired=1`;
  }, 50);
  // 5s 后允许再次触发（应对登录页刷新回来又遇到 401 的情况）
  setTimeout(() => { _401Handled = false; }, 5000);
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // 注入 token（如果有）
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  let json: ApiResponse<T>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(
      `响应解析失败 (${res.status})`,
      res.status,
      res.status,
      null
    );
  }

  if (!res.ok || json.code !== 0) {
    // [Bug fix] 401 特殊处理：转中文 + 自动跳登录
    if (res.status === 401) {
      handle401();
      throw new ApiError('登录已过期，请重新登录', 401, 401, json.data);
    }
    throw new ApiError(
      json.message || `请求失败 (${res.status})`,
      json.code,
      res.status,
      json.data
    );
  }

  return json.data;
}

export const api = {
  get<T>(path: string, params?: Record<string, unknown>) {
    const search = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return request<T>(path + search, { method: 'GET' });
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string) {
    return request<T>(path, { method: 'DELETE' });
  },
};

// ============================================
// 业务 API 封装
// ============================================

// 区域
export const areaApi = {
  /** 获取完整区域树（市 + 区县 + 街道）*/
  findTree: () => api.get<any[]>('/areas'),
  /** 按 ID 查 */
  findOne: (id: string | number) => api.get<any>(`/areas/${id}`),
};

// 用户
export const userApi = {
  list: (page = 1, pageSize = 20) =>
    api.get<{ list: any[]; total: number; page: number; pageSize: number }>(
      '/users',
      { page, pageSize }
    ),
  get: (id: string | number) => api.get<any>(`/users/${id}`),
  count: () => api.get<number>('/users/count'),
};

// 分类
export const categoryApi = {
  list: (code?: string) =>
    api.get<any[]>('/categories' + (code ? `?code=${code}` : '')),
  tree: (code?: string) =>
    api.get<any[]>('/categories/tree' + (code ? `?code=${code}` : '')),
  count: () => api.get<number>('/categories/count'),
};

// 信息
export interface Post {
  id: string | number;
  title: string;
  description?: string;
  type: 'house' | 'secondhand' | 'job' | 'lifebiz';
  price?: number | string | null;
  /** Phase 2: AI 生成的 SEO meta（如未生成则为 null） */
  seoMeta?: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    jsonLd: Record<string, any>;
    generatedAt?: string;
    modelUsed?: string;
  } | null;
  /** Phase 2: 内容质量分（0-100，AI 评分） */
  qualityScore?: number | null;
}

export const postApi = {
  list: (params: {
    type?: string;
    categoryId?: number;
    areaId?: number;
    keyword?: string;
    sort?: 'latest' | 'oldest' | 'price_asc' | 'price_desc';
    page?: number;
    pageSize?: number;
  } = {}) => {
    const search = new URLSearchParams();
    if (params.type) search.set('type', params.type);
    if (params.categoryId) search.set('categoryId', String(params.categoryId));
    if (params.areaId) search.set('areaId', String(params.areaId));
    if (params.keyword) search.set('keyword', params.keyword);
    if (params.sort) search.set('sort', params.sort);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    return api.get<{ list: any[]; total: number; page: number; pageSize: number }>(
      `/posts?${search.toString()}`,
    );
  },
  /** [P1-010] 我的发布（需登录）；后端按 JWT.sub 过滤，与 /posts 公开列表区分 */
  myPosts: (params: { status?: string; type?: string; page?: number; pageSize?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.status) search.set('status', params.status);
    if (params.type) search.set('type', params.type);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    return api.get<{ list: any[]; total: number; page: number; pageSize: number }>(
      `/posts/me?${search.toString()}`,
    );
  },
  get: (id: string | number) => api.get<any>(`/posts/${id}`),
  /** T-P1-02: 获取联系方式(已登录,个保法) */
  getContact: (id: string | number) => api.get<any>(`/posts/${id}/contact`),
  /** Phase 2: 全量 sitemap 数据 (公开，无需鉴权) */
  getSitemapData: (limit: number) =>
    api.get<any[]>(`/posts/sitemap-data?limit=${limit}`),
  count: (type?: string) =>
    api.get<number>('/posts/count' + (type ? `?type=${type}` : '')),
  create: (data: any) => api.post<any>('/posts', data),
  /** 全文搜索（V1 简化版：LIKE 多字段） */
  search: (params: {
    q: string;
    type?: 'house' | 'secondhand' | 'job' | 'lifebiz';
    areaId?: number;
    categoryId?: number;
    page?: number;
    pageSize?: number;
  }) => {
    const search = new URLSearchParams();
    search.set('q', params.q);
    if (params.type) search.set('type', params.type);
    if (params.areaId) search.set('areaId', String(params.areaId));
    if (params.categoryId) search.set('categoryId', String(params.categoryId));
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    return api.get<{ list: any[]; total: number; page: number; pageSize: number; query: string }>(
      `/search?${search.toString()}`,
    );
  },
};

// 鉴权
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface MeDetail {
  sub: string;
  phone: string;
  role: string;
}

export interface AuthLoginUser {
  id: string;
  phone: string;
  nickname: string;
  role: string;
  avatar: string | null;
}

export const authApi = {
  /** 发送短信验证码 */
  sendSmsCode: (phone: string) =>
    api.post<{ cooldown: number }>('/auth/sms-code', { phone }),

  /** 短信验证码登录（自动注册） */
  loginBySms: (phone: string, code: string) =>
    api.post<TokenPair & { user: AuthLoginUser }>('/auth/login-sms', { phone, code }),

  /** 密码登录 */
  loginByPassword: (phone: string, password: string) =>
    api.post<TokenPair & { user: AuthLoginUser }>('/auth/login-password', { phone, password }),

  /** 刷新 token */
  refresh: (refreshToken: string) =>
    api.post<TokenPair>('/auth/refresh', { refreshToken }),

  /** 登出 */
  logout: () => api.post<{ ok: boolean }>('/auth/logout', {}),

  /** 当前用户 */
  me: () => api.get<MeDetail>('/auth/me'),
};

// 我的（统计 / 资料）
export const meApi = {
  /** 我的发布数（用 /posts/me 拿 total） */
  postsCount: async (): Promise<number> => {
    const r = await api.get<{ list: any[]; total: number }>('/posts/me', { page: 1, pageSize: 1 });
    return r?.total || 0;
  },
  /** 我的收藏数（/favorites/count 直接返回数字） */
  favoritesCount: () => api.get<number>('/favorites/count'),
  /** [P1-005/P1-013] 我的留言数 — 用后端聚合统计，避免 pageSize:100 漏算 */
  commentsCount: async (): Promise<number> => {
    try {
      const r = await api.get<{ postsCount: number; commentsCount: number }>('/posts/me/stats');
      return r?.commentsCount || 0;
    } catch {
      return 0;
    }
  },
};

// 上传图片
export const uploadApi = {
  /** 单图上传 (FormData 字段名: file)，返回 { url, size, mimeType, filename } */
  image: async (file: File): Promise<{ url: string; size: number; mimeType: string; filename: string }> => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    const fd = new FormData();
    fd.append('file', file);
    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE_URL}/upload/image`, { method: 'POST', body: fd, headers });
    const json = await res.json();
    if (!res.ok || json.code !== 0) {
      throw new ApiError(json.message || `上传失败 (${res.status})`, json.code, res.status, json.data);
    }
    return json.data;
  },
};

// 站内信
export interface MessageItem {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: number;
  createdAt: string;
  sender?: { id: string; nickname: string; avatar?: string };
  receiver?: { id: string; nickname: string; avatar?: string };
}

export interface MessageListResp {
  list: MessageItem[];
  total: number;
  unreadCount?: number;
}

export const messagesApi = {
  inbox: (params?: { page?: number; pageSize?: number }) =>
    api.get<MessageListResp>('/messages/inbox', params),
  outbox: (params?: { page?: number; pageSize?: number }) =>
    api.get<MessageListResp>('/messages/outbox', params),
  send: (data: { receiverId: string | number; content: string }) =>
    api.post<MessageItem>('/messages', data),
  readAll: () => api.post<{ ok: boolean }>('/messages/read-all', {}),
};

// Banner（运营位）
export interface BannerItem {
  id: string;
  title: string;
  imageUrl: string;
  linkType: 'post' | 'url' | 'category' | 'search';
  linkTarget: string;
  position: 'home_top' | 'home_mid' | 'list_top';
  sortOrder: number;
  status: number;
  startsAt: string | null;
  endsAt: string | null;
}

export const bannerApi = {
  /** 获取生效中的 banner 列表（按 position 过滤） */
  active: (position?: BannerItem['position']) =>
    api.get<BannerItem[]>('/banners/active' + (position ? `?position=${position}` : '')),
};

// 用户搜索（按手机号）
export interface UserListItem {
  id: string;
  phone: string;
  nickname: string;
  avatar?: string;
}

export const usersApi = {
  search: (keyword: string) =>
    api.get<{ list: UserListItem[]; total: number }>('/users', { keyword }),
};

// 收藏
export const favoriteApi = {
  list: () => api.get<any[]>('/favorites'),
  add: (data: { postId: string | number }) => api.post<any>('/favorites', data),
  remove: (postId: string | number) => api.delete<any>(`/favorites/${postId}`),
};

// 评论
export const commentApi = {
  list: (postId: string | number) => api.get<any[]>(`/posts/${postId}/comments`),
  create: (postId: string | number, data: { content: string; parentId?: string | number }) =>
    api.post<any>(`/posts/${postId}/comments`, data),
  remove: (commentId: string | number) => api.delete<any>(`/comments/${commentId}`),
};

// 举报
export const reportApi = {
  create: (data: { postId: string | number; reason: string; description?: string }) =>
    api.post<any>('/reports', data),
};

// ===== Announcements =====

export interface Announcement {
  id: string;
  title: string;
  content: string;
  status: 0 | 1;
  priority: 0 | 1;
  startsAt: string | null;
  endsAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  status?: 0 | 1;
  priority?: 0 | 1;
  startsAt?: string;
  endsAt?: string;
}

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;

export const announcementApi = {
  /** 公开:获取当前生效公告 */
  active: () => api.get<Announcement[]>('/announcements/active'),
  /** admin:分页列表 */
  list: (params?: { status?: 0 | 1; page?: number; pageSize?: number }) =>
    api.get<{ list: Announcement[]; total: number; page: number; pageSize: number }>(
      '/admin/announcements',
      params,
    ),
  create: (data: CreateAnnouncementInput) =>
    api.post<Announcement>('/admin/announcements', data),
  update: (id: string, data: UpdateAnnouncementInput) =>
    api.patch<Announcement>(`/admin/announcements/${id}`, data),
  remove: (id: string) => api.delete<{ id: string; deleted: boolean }>(`/admin/announcements/${id}`),
};
