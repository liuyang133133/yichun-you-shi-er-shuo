import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HomeContent } from './home-content';
import { DEFAULT_TDK, TYPE_TDK, PostType } from '@/config/seo-tdk';
import { areaApi } from '@/lib/api';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ type?: string; area?: string }> }): Promise<Metadata> {
  const sp = await searchParams;
  const type = sp.type as PostType | undefined;
  const areaId = sp.area;

  let tdk = DEFAULT_TDK;
  if (type && TYPE_TDK[type]) {
    tdk = { ...TYPE_TDK[type] };
    if (areaId) {
      try {
        const area = await areaApi.findOne(parseInt(areaId));
        if (area) {
          tdk.title = `${area.name}${TYPE_TDK[type].title.split(' - ')[0]} | 伊春有事儿说`;
          tdk.description = `${area.name}本地${TYPE_TDK[type].description.replace('伊春', '')}`;
        }
      } catch {}
    }
  }

  const url = `${BASE}/`;

  return {
    title: tdk.title,
    description: tdk.description,
    keywords: tdk.keywords.join(','),
    alternates: { canonical: url },
    openGraph: {
      title: tdk.title,
      description: tdk.description,
      url,
      siteName: '伊春有事儿说',
      locale: 'zh_CN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: tdk.title,
      description: tdk.description,
    },
  };
}

export default function HomePage() {
  // T-P15-02 V1: 首页 JSON-LD（WebSite + Organization + 搜索 Action）
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${BASE}/#website`,
        url: BASE,
        name: '伊春有事儿说',
        description: '伊春本地生活信息平台 - 房屋出租/二手交易/招聘求职/便民信息',
        inLanguage: 'zh-CN',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${BASE}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${BASE}/#org`,
        name: '伊春有事儿说',
        url: BASE,
        logo: `${BASE}/icon.png`,
        foundingDate: '2026',
        address: {
          '@type': 'PostalAddress',
          addressRegion: '黑龙江省',
          addressLocality: '伊春市',
          addressCountry: 'CN',
        },
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'support@yichun.com',
          availableLanguage: ['zh-Hans'],
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">加载中...</div>}>
        <HomeContent />
      </Suspense>
    </>
  );
}