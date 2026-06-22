import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HomeContent } from './home-content';
import { DEFAULT_TDK, TYPE_TDK, PostType } from '@/config/seo-tdk';
import { areaApi } from '@/lib/api';

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

  return {
    title: tdk.title,
    description: tdk.description,
    keywords: tdk.keywords.join(','),
  };
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <HomeContent />
    </Suspense>
  );
}