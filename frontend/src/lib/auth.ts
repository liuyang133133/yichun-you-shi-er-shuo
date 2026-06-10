'use client';

/**
 * 简化版鉴权工具（V1）
 * - accessToken 存 localStorage（V1.1 改 httpOnly cookie）
 * - 不引入 zustand / react-hook-form 等额外依赖
 * - 提供 useAuth() hook + 工具函数
 */

const ACCESS_TOKEN_KEY = 'yichun_access_token';
const USER_INFO_KEY = 'yichun_user';

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
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
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
