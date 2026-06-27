/**
 * 独立 404 页面（T-010 + T-014 + T-018 build fix）
 *
 * 不放在 src/app/[locale]/(group)/not-found.tsx 这种层级下，避免被根 layout 强制 SSR
 * 触发 useSearchParams() CSR bailout。
 *
 * Next.js 自动 fallback 到此文件当路由不存在时。
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-6xl font-bold text-foreground">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">页面不存在</p>
      <a
        href="/"
        className="mt-8 inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        返回首页
      </a>
    </div>
  );
}
