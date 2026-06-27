import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, Megaphone } from 'lucide-react';
import { AnnouncementDetailContent } from './announcement-detail-content';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function fetchOne(id: string) {
  try {
    const res = await fetch(`${API}/announcements/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
}

/**
 * T-017: 公告详情页 - server entry
 * - generateMetadata + Article JSON-LD + 404 fallback
 * - 不 throw（参考 posts/[id]/page.tsx）
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const a = await fetchOne(id);
  if (!a) {
    return {
      title: '公告不存在 - 伊春有事儿说',
      description: '该公告可能已过期、已下架或链接错误',
      robots: { index: false, follow: true },
    };
  }
  const title = `${a.title} - 平台公告 | 伊春有事儿说`;
  const description = (a.content || a.title || '').slice(0, 160);
  const url = `${BASE}/announcements/${id}`;
  return {
    title,
    description,
    keywords: ['伊春', '公告', '平台通知', a.title].filter(Boolean).join(','),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      siteName: '伊春有事儿说',
      locale: 'zh_CN',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await fetchOne(id);

  if (!a) {
    return <AnnouncementNotFound />;
  }

  // JSON-LD: schema.org/Article (兼容性最广)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: (a.content || '').slice(0, 200),
    datePublished: a.createdAt,
    dateModified: a.updatedAt || a.createdAt,
    author: { '@type': 'Organization', name: '伊春有事儿说' },
    publisher: {
      '@type': 'Organization',
      name: '伊春有事儿说',
      logo: { '@type': 'ImageObject', url: `${BASE}/icon.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE}/announcements/${id}` },
    url: `${BASE}/announcements/${id}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AnnouncementDetailContent id={id} initial={a} />
    </>
  );
}

function AnnouncementNotFound() {
  return (
    <main className="container py-20 text-center space-y-4">
      <div className="text-6xl">📭</div>
      <h1 className="font-display text-2xl font-bold">公告不存在或已下架</h1>
      <p className="text-muted-foreground">该公告可能已过期、已下架或链接错误</p>
      <Link
        href="/announcements"
        className="inline-flex h-10 px-5 rounded-full bg-primary text-primary-foreground items-center gap-1"
      >
        <ChevronLeft className="h-4 w-4" /> 返回公告列表
      </Link>
    </main>
  );
}
