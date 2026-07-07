import type { MetadataRoute } from 'next';
import { getServerApiUrl } from '@/lib/server-api';

/**
 * T-P15-02 V1: sitemap 升级
 * - 一次性调后端 /posts/sitemap-full 拿 posts + categories + areas
 * - 拼成 Next.js MetadataRoute.Sitemap 格式（Next.js 自动转 sitemap.org XML）
 * - 失败降级：返回基础静态页（构建时无网络避免脏数据）
 */
const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
const API_URL = getServerApiUrl();

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: number | string;
}

interface FullSitemapData {
  posts: SitemapEntry[];
  categories: SitemapEntry[];
  areas: SitemapEntry[];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 静态页（首页 + 4 type 过滤 + login）
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/?type=house`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/?type=secondhand`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/?type=job`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/?type=lifebiz`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/announcements`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${BASE}/tags`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  let dynamicPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/seo/sitemap-full?limit=50000`, {
      next: { revalidate: 300 }, // 5 分钟 ISR 缓存
    });
    if (res.ok) {
      // 后端有 TransformInterceptor 包装：{ code, message, data: {...}, timestamp }
      // wrapped.data 才是真正的业务数据
      const wrapped: { data?: FullSitemapData } = await res.json();
      const data = wrapped.data || (wrapped as any);
      const mapEntry = (e: SitemapEntry): MetadataRoute.Sitemap[number] => ({
        url: e.loc,
        lastModified: new Date(e.lastmod),
        changeFrequency: e.changefreq as any,
        priority: typeof e.priority === 'string' ? parseFloat(e.priority) : e.priority,
      });
      dynamicPages = [
        ...(data.posts || []).map(mapEntry),
        ...(data.categories || []).map(mapEntry),
        ...(data.areas || []).map(mapEntry),
      ];
    }
  } catch (e) {
    // 构建期网络异常：仅返回静态页（避免脏数据）
    if (process.env.NODE_ENV === 'development') {
      console.warn('[sitemap] failed to fetch dynamic data:', (e as Error).message);
    }
  }

  return [...staticPages, ...dynamicPages];
}