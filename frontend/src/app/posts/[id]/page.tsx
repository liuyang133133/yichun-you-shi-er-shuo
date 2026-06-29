import { redirect } from 'next/navigation';

/**
 * F-3 V2: 兼容老 URL `/posts/[id]` → 重定向到 `/posts/[id]-[slug]`
 *
 * 行为：
 * - 调后端拿 post 的 slug（cache no-store，避免构建期脏数据）
 * - 拿不到 slug 或 post 不存在时，redirect 到 `/posts/[id]` 自身（让新路由兜底）
 * - 拿得到 slug 时，redirect 到 `/posts/[id]-[slug]`（SEO 友好）
 *
 * 备注：用 redirect（Next.js 抛 307）而不是 notFound()，让书签/外部链接平滑迁移。
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function fetchPostSlug(id: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/posts/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    const slug = json?.data?.slug;
    return typeof slug === 'string' && slug.trim() ? slug.trim() : null;
  } catch {
    return null;
  }
}

export default async function PostIdRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const slug = await fetchPostSlug(id);
  if (slug) {
    redirect(`/posts/${id}-${slug}`);
  }
  // 兜底：跳转首页（避免 /posts/[id] 自身无限循环）
  redirect('/');
}

// 不需要 generateMetadata — 这个页面只做 redirect
export const metadata = {
  title: '信息详情 - 伊春有事儿说',
  robots: { index: false, follow: true },
};