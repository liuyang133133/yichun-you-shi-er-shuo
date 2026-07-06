/**
 * Server-side API base URL resolver
 *
 * Docker 部署时区分：
 * - API_URL（无 NEXT_PUBLIC_ 前缀）: 容器内 SSR 用，指向 Docker 服务名 `backend:3001`
 *   这样 SSR fetch 不会因为容器内 localhost 指向自己而失败
 * - NEXT_PUBLIC_API_URL: 浏览器端用，指向宿主机的 localhost:3001
 *
 * 本地开发（无 Docker）：API_URL 不存在，回退到 NEXT_PUBLIC_API_URL 或 localhost
 */
export function getServerApiUrl(): string {
  return (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001/api/v1'
  );
}
