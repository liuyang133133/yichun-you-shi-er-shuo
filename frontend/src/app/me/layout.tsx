/**
 * /me/* 路由分组 layout
 *
 * 目的: 用户中心页面使用 useSearchParams 等客户端 hooks，
 * 在 Next.js 15 prerender 阶段会因未包裹 Suspense 报错。
 * 整个 /me/* 分组强制 dynamic rendering (按用户请求渲染)。
 *
 * 这是构建基础设施修复（非业务模块改动），不影响功能。
 */
export const dynamic = 'force-dynamic';

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
