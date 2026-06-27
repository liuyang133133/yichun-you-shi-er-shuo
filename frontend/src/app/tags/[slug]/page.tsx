import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TagDetailContent } from './content';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_BASE}/tags/${slug}`, { cache: 'no-store' });
    if (!res.ok) {
      return { title: '标签不存在 - 伊春有事儿说' };
    }
    const json = await res.json();
    const tag = json?.data;
    if (!tag) return { title: '标签不存在 - 伊春有事儿说' };
    return {
      title: `#${tag.name} - 标签详情 | 伊春有事儿说`,
      description:
        tag.description ||
        `浏览带有 #${tag.name} 标签的伊春本地信息，共 ${tag.useCount} 条相关帖子。`,
      keywords: [tag.name, '伊春', '标签', tag.slug].join(','),
      openGraph: {
        title: `#${tag.name} - 伊春有事儿说`,
        description: tag.description || `共 ${tag.useCount} 条相关帖子`,
        type: 'website',
        url: `${BASE}/tags/${tag.slug}`,
      },
    };
  } catch {
    return { title: '标签详情 - 伊春有事儿说' };
  }
}

export default function TagDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          加载中…
        </div>
      }
    >
      <TagDetailContent params={params} />
    </Suspense>
  );
}
