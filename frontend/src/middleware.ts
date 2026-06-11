import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/me'];

/**
 * SHOULD-19 Middleware SSR 401 redirect
 * - Edge runtime: 只能读 cookie,不能读 localStorage
 * - /me/* 路径必须在 SSR 阶段就拦截,避免客户端组件渲染一闪
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
  if (!isProtected) {
    return NextResponse.next();
  }

  const access = req.cookies.get('access_token')?.value;
  if (access) {
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
  matcher: ['/me/:path*'],
};
