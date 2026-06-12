/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // SHOULD-20: 已删除 /api/proxy rewrite（无任何源码使用，2026-06-12 清理）
  // 跨域场景：使用 NEXT_PUBLIC_API_URL 绝对地址 + 后端 CORS 白名单
  // Docker 容器内 standalone 输出
  output: 'standalone',
  // TypeScript / ESLint 不阻塞构建（开发期方便）
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
