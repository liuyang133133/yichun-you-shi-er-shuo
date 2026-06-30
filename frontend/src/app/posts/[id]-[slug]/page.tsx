import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { PostDetailContent } from '../[id]/post-detail-content';
import { Breadcrumb } from '@/components/breadcrumb';
import { RelatedPosts } from '@/components/related-posts';
import { BreadcrumbItem } from '@/lib/api';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const TYPE_NAMES: Record<string, string> = {
  house: '房屋',
  secondhand: '二手',
  job: '招聘',
  lifebiz: '便民',
  // F-2: 5 个伊春本地刚需分类
  carpool: '拼车',
  lostfound: '失物',
  contact: '电话',
  forestry: '林下',
  dating: '交友',
};

/**
 * F-3 V2: 从后端拿 post（用于校验 slug + 生成 metadata + 面包屑数据）
 */
async function fetchPost(id: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_URL}/posts/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
}

/**
 * F-3 V2: SEO meta — 优先用 /seo/tdk 端点，fallback 用 post 数据拼接
 *
 * /seo/tdk 端点返回 { title, description, keywords }
 * - title/description 是后端已经按 Post.seoMeta 优先级生成的
 * - 失败时回退到原来的拼接逻辑
 */
async function fetchTdk(path: string): Promise<{ title: string; description: string; keywords: string } | null> {
  try {
    const res = await fetch(`${API_URL}/seo/tdk?path=${encodeURIComponent(path)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
}

/**
 * F-3 V2: 动态路由参数
 * - 路径段格式：`{id}-{slug}`（如 `123-my-post-title`）
 * - slug 中可能含 '-'（pinyin），用 split('-', 1) 只切第一个
 */
interface PageParams {
  /** 完整 segment，如 "123-my-post-title" */
  id?: string;
  /** slug 部分（路由层会按 [id]-[slug] 拆分，但 slug 中仍可能含 '-'） */
  slug?: string;
}

/**
 * F-3 V2: 拆出真正的 id（segment 中第一个 '-' 之前的部分）
 */
function extractId(combined: string): string {
  if (!combined) return combined;
  const idx = combined.indexOf('-');
  if (idx === -1) return combined;
  return combined.slice(0, idx);
}

/**
 * F-3 V2: 拼出 slug 剩余部分（id 之后的全部）
 */
function extractSlug(combined: string, id: string): string {
  if (!combined || combined === id) return '';
  return combined.slice(id.length + 1);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id?: string; slug?: string }>;
}): Promise<Metadata> {
  const resolved = await params;
  // Next.js 把 [id]-[slug] 拆成 id + slug，所以 id 已是纯数字
  const id = resolved.id || '';
  const slug = resolved.slug || '';
  const path = `/posts/${id}`;
  const url = `${BASE}/posts/${id}${slug ? `-${slug}` : ''}`;

  // 1. 优先 /seo/tdk
  const tdk = await fetchTdk(path);
  if (tdk) {
    return {
      title: tdk.title,
      description: tdk.description,
      keywords: tdk.keywords,
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

  // 2. fallback：直接读 post 拼接
  const post = await fetchPost(id);
  if (!post) {
    return { title: '信息不存在 - 伊春有事儿说' };
  }
  const typeName = TYPE_NAMES[post.type] || '信息';
  const seo = post.seoMeta;
  const hasAiSeo = !!(seo && seo.metaTitle && seo.metaDescription);
  const title = hasAiSeo
    ? `${seo!.metaTitle} | 伊春有事儿说`
    : `${post.title} - ${typeName} | 伊春有事儿说`;
  const description = hasAiSeo
    ? seo!.metaDescription
    : (post.description || post.title).slice(0, 160);
  const keywords = hasAiSeo
    ? (seo!.keywords || []).join(',')
    : [typeName, '伊春', '本地', '分类信息', post.title].filter(Boolean).join(',');
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: '伊春有事儿说',
      locale: 'zh_CN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

/**
 * 服务端 JSON-LD 结构化数据
 * - 优先 Post.seoMeta.jsonLd (AI 生成)，fallback 到 4-type schema.org 模板
 * - 同时附加 BreadcrumbList JSON-LD
 */
async function getPostForJsonLd(id: string) {
  return await fetchPost(id);
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id?: string; slug?: string }>;
}) {
  const resolved = await params;
  // Next.js 路由层会按 [id]-[slug] 拆，所以 id 已是纯数字
  // 但如果 slug 中还含 '-'（少见但合法），slug 字段就是剩余部分
  const id = resolved.id || '';
  const slugFromRoute = resolved.slug || '';

  if (!id) {
    redirect('/');
  }

  const post = await getPostForJsonLd(id);

  // 404 兜底
  if (!post) {
    return (
      <main className="container max-w-3xl py-20 text-center">
        <div className="text-6xl mb-4">😶</div>
        <h1 className="font-display text-2xl font-bold mb-2">信息不存在</h1>
        <p className="text-sm text-muted-foreground">该信息可能已被删除或链接错误</p>
        <a
          href="/"
          className="inline-block mt-6 px-5 h-10 leading-10 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          返回首页
        </a>
      </main>
    );
  }

  // slug 校验：URL 上的 slug 必须和后端 post.slug 一致，否则重定向到正确 URL
  const expectedSlug = post.slug || '';
  const expectedUrl = `/posts/${id}${expectedSlug ? `-${expectedSlug}` : ''}`;
  const currentUrl = `/posts/${id}${slugFromRoute ? `-${slugFromRoute}` : ''}`;
  if (expectedSlug && slugFromRoute && slugFromRoute !== expectedSlug) {
    redirect(expectedUrl);
  }

  // 构造面包屑数据（服务端组件从 post 取）
  const breadcrumbItems: BreadcrumbItem[] = buildBreadcrumbFromPost(post, id);

  // JSON-LD
  const aiJsonLd = post?.seoMeta?.jsonLd;
  const itemJsonLd =
    aiJsonLd && Object.keys(aiJsonLd).length > 0
      ? aiJsonLd
      : post
      ? buildJsonLd(post, `${id}${expectedSlug ? `-${expectedSlug}` : ''}`)
      : null;
  const breadcrumbJsonLd = post
    ? buildBreadcrumbJsonLd(post, `${id}${expectedSlug ? `-${expectedSlug}` : ''}`)
    : null;

  const finalJsonLd = itemJsonLd || breadcrumbJsonLd
    ? {
        '@context': 'https://schema.org',
        '@graph': [
          ...(itemJsonLd ? [itemJsonLd] : []),
          ...(breadcrumbJsonLd ? [breadcrumbJsonLd] : []),
        ],
      }
    : null;

  // 防 unused 当前 url（用于规范 canonical 写入 metadata）
  void currentUrl;

  return (
    <>
      {/* 面包屑 — 详情页顶部 */}
      <div className="container max-w-6xl pt-4">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {finalJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(finalJsonLd) }}
        />
      )}
      {/* V1.0 验收 BUG-3: PostDetailContent 使用 useSearchParams, 必须包 Suspense 边界 */}
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">加载中...</div>}>
        <PostDetailContent />
      </Suspense>

      {/* 相关推荐 — 详情页底部 */}
      <RelatedPosts postId={id} limit={5} />
    </>
  );
}

/**
 * F-3 V2: 从 post 数据构造面包屑
 * - 首页 → 类型频道 → 分类（如有） → 区县（如有） → 帖子标题
 */
function buildBreadcrumbFromPost(post: any, id: string): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: '首页', href: '/' }];
  if (post.type) {
    const typeName = TYPE_NAMES[post.type] || '信息';
    items.push({
      label: typeName,
      href: `/?type=${post.type}`,
    });
  }
  if (post.category?.name) {
    items.push({
      label: post.category.name,
      href: post.category?.code
        ? `/?type=${post.type}&category=${post.category.id || ''}`
        : null,
    });
  }
  if (post.area?.name) {
    items.push({
      label: post.area.name,
      href: post.areaId ? `/?type=${post.type}&area=${post.areaId}` : null,
    });
  }
  items.push({ label: post.title || '信息详情', href: null });
  return items;
}

/**
 * T-P15-02 V1: BreadcrumbList JSON-LD（兼容 schema.org 旧版）
 */
function buildBreadcrumbJsonLd(post: any, idSlug: string) {
  const url = `${BASE}/posts/${idSlug}`;
  const items: Array<{ '@type': 'ListItem'; position: number; name: string; item: string }> = [
    { '@type': 'ListItem', position: 1, name: '首页', item: `${BASE}/` },
  ];
  let position = 2;
  if (post.type) {
    const typeName = TYPE_NAMES[post.type] || '信息';
    items.push({
      '@type': 'ListItem',
      position: position++,
      name: `${typeName}频道`,
      item: `${BASE}/?type=${post.type}`,
    });
  }
  if (post.area?.name) {
    items.push({
      '@type': 'ListItem',
      position: position++,
      name: post.area.name,
      item: `${BASE}/?area=${post.areaId || post.area.id}`,
    });
  }
  items.push({
    '@type': 'ListItem',
    position: position,
    name: post.title,
    item: url,
  });

  return {
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

function buildJsonLd(post: any, idSlug: string) {
  const base: any = {
    '@context': 'https://schema.org',
    headline: post.title,
    description: (post.description || '').slice(0, 200),
    datePublished: post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    author: { '@type': 'Person', name: post.user?.nickname || '伊春有事儿说用户' },
    url: `${BASE}/posts/${idSlug}`,
  };

  switch (post.type) {
    case 'house':
      return {
        ...base,
        '@type': 'RealEstateListing',
        name: post.title,
        price: post.price ? { '@type': 'PriceSpecification', price: post.price, priceCurrency: 'CNY' } : undefined,
        address: post.area?.name ? { '@type': 'PostalAddress', addressLocality: post.area.name, addressRegion: '伊春', addressCountry: 'CN' } : undefined,
      };
    case 'secondhand':
      return {
        ...base,
        '@type': 'Product',
        name: post.title,
        offers: post.price ? { '@type': 'Offer', price: post.price, priceCurrency: 'CNY', availability: 'https://schema.org/InStock' } : undefined,
      };
    case 'job':
      return {
        ...base,
        '@type': 'JobPosting',
        title: post.title,
        datePosted: post.createdAt,
        employmentType: post.job?.jobType,
        baseSalary: post.job?.salaryMin
          ? { '@type': 'MonetaryAmount', currency: 'CNY', value: { '@type': 'QuantitativeValue', minValue: Number(post.job.salaryMin), maxValue: Number(post.job.salaryMax || post.job.salaryMin), unitText: post.job.salaryUnit || '元/月' } }
          : undefined,
        jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: post.job?.workCity || '伊春', addressRegion: '黑龙江', addressCountry: 'CN' } },
      };
    // F-2: 5 个伊春本地刚需分类 — 暂都用 Article schema，后续按业务优化
    case 'carpool':
    case 'lostfound':
    case 'contact':
    case 'forestry':
    case 'dating':
    case 'lifebiz':
    default:
      return {
        ...base,
        '@type': 'Article',
      };
  }
}

// 仅作为 API 暴露，便于其它 server component 复用（暂未直接使用，保留扩展位）
export { extractId, extractSlug };