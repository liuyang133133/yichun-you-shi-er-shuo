/**
 * /posts 列表页
 *
 * [P1-03] V1.0 验收修复: 原版 /posts 重定向到 /?type=...
 *   问题: URL 不可分享 (用户分享 /posts?type=house 实际跳到 /?type=house)
 *   修复: /posts 渲染真实的列表页 (复用 HomeContent 的列表/分页/筛选逻辑)
 *         canonical 指向 /?type=... 避免重复内容 SEO 惩罚
 *
 * URL 兼容性:
 *   /posts            → 全部信息 (默认 type=secondhand)
 *   /posts?type=house → 房屋租售
 *   /posts?type=job&page=2 → 招聘 第2页
 */
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HomeContent } from '../home-content';
import { DEFAULT_TDK, TYPE_TDK, PostType } from '@/config/seo-tdk';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const type = (sp.type as PostType | undefined) || 'secondhand';
  const tdk = TYPE_TDK[type] || DEFAULT_TDK;
  // canonical 指向首页, 避免 /posts 与 / 重复内容
  const canonical = type ? `${BASE}/?type=${type}` : `${BASE}/`;

  return {
    title: tdk.title,
    description: tdk.description,
    keywords: tdk.keywords.join(','),
    alternates: { canonical },
    openGraph: {
      title: tdk.title,
      description: tdk.description,
      url: canonical,
      siteName: '伊春有事儿说',
      locale: 'zh_CN',
      type: 'website',
    },
  };
}

export default function PostsListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          加载中…
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
