/**
 * 全局 404 页面 — 独立于根 layout
 *
 * 不使用根 layout（Header 等含 useSearchParams 的客户端组件），
 * 避免 Next.js 15 prerender 阶段的 Suspense 错误。
 */

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <html lang="zh-CN">
      <body
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '6rem',
              fontWeight: 800,
              color: '#0f7a5e',
              margin: 0,
            }}
          >
            404
          </h1>
          <p
            style={{
              fontSize: '1.25rem',
              color: '#374151',
              margin: '1rem 0 2rem',
            }}
          >
            页面不存在
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.625rem 1.5rem',
              background: '#0f7a5e',
              color: 'white',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            返回首页
          </a>
        </div>
      </body>
    </html>
  );
}
