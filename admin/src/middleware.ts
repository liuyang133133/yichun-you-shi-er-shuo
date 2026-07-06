import { NextRequest, NextResponse } from 'next/server';

/**
 * V1.0 验收 BUG-4 修复: Admin Middleware SSR 401 redirect
 * - Edge runtime: 只能读 cookie
 * - 登录页 login/page.tsx 写 `admin_token` cookie 同步 (与 localStorage 双写)
 * - 登出时清 cookie
 * - 拦截所有非 /login 路径,未登录直接 302 → /login?redirect=<原路径>
 * - 与 frontend/src/middleware.ts (Sprint 4 SHOULD-19) 模式对齐
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 公开路径: 登录页 + 静态资源放行
  if (
    pathname === '/login' ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.webmanifest'
  ) {
    return NextResponse.next();
  }

  // 兼容旧 cookie 命名: 前端用 access_token, 后台用 admin_token
  const token =
    req.cookies.get('admin_token')?.value || req.cookies.get('access_token')?.value;

  if (token) {
    return NextResponse.next();
  }

  // 未登录: 302 跳 /login?redirect=<原路径>
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // 匹配所有路径 (排除 _next 和 api 内部)
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};