'use client';

/**
 * 简化版鉴权工具（V1）
 * - accessToken 存 localStorage（V1.1 改 httpOnly cookie）
 * - 同步写入同名 cookie，供 Next.js Middleware (Edge runtime) 读取
 * - 不引入 zustand / react-hook-form 等额外依赖
 * - 提供 useAuth() hook + 工具函数
 */

export const ACCESS_TOKEN_KEY = 'yichun_access_token';
const USER_INFO_KEY = 'yichun_user';

// 与 Next.js Middleware 共享的 cookie 名（SHOULD-19）
const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 86400_000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export interface AuthUser {
  id: string;
  phone: string;
  nickname?: string;
  avatar?: string | null;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  // 同步写入 cookie,让 Next.js Middleware (Edge runtime) 能在 SSR 阶段读到
  setCookie(ACCESS_COOKIE, token, 7);
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
  clearCookie(ACCESS_COOKIE);
  clearCookie(REFRESH_COOKIE);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_INFO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
}
