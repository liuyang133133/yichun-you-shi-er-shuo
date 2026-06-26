/**
 * 全局 404 页面 — 独立于根 layout
 *
 * 不使用根 layout（Header 等含 useSearchParams 的客户端组件），
 * 避免 Next.js 15 prerender 阶段的 Suspense 错误。
 *
 * T-014: 与 T-018 一致的标准 404 页面。
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
              lineHeight: 1,
            }}
          >
            404
          </h1>
          <p
            style={{
              fontSize: '1.25rem',
              color: '#374151',
              marginTop: '1rem',
              marginBottom: '2rem',
            }}
          >
            页面不存在或已被删除
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: '#0f7a5e',
              color: 'white',
              borderRadius: '9999px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            返回首页
          </a>
        </div>
      </body>
    </html>
  );
}
