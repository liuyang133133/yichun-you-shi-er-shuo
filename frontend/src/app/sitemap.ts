import type { MetadataRoute } from 'next';
import { postApi, categoryApi, areaApi } from '@/lib/api';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: 'daily' | 'hourly' | 'monthly';
  priority: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 静态页
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/?type=house`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/?type=secondhand`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/?type=job`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/?type=lifebiz`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // 动态页: 调后端 sitemap-data
  let postPages: MetadataRoute.Sitemap = [];
  try {
    const data: any = await postApi.getSitemapData(50000);
    const list: SitemapEntry[] = Array.isArray(data) ? data : (data?.data || []);
    postPages = list.map((e) => ({
      url: e.loc,
      lastModified: new Date(e.lastmod),
      changeFrequency: e.changefreq as any,
      priority: parseFloat(e.priority),
    }));
  } catch {
    // 后端不可达时降级到原 100 条
    try {
      const r: any = await postApi.list({ pageSize: 100, sort: 'latest' } as any);
      const list = (r as any)?.data?.list || (r as any)?.list || [];
      postPages = list.map((p: any) => ({
        url: `${BASE}/posts/${p.id}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      }));
    } catch {}
  }

  return [...staticPages, ...postPages];
}
