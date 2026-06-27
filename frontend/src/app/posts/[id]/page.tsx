import type { Metadata } from 'next';
import { PostDetailContent } from './post-detail-content';
import type { Post } from '@/lib/api';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

const TYPE_NAMES: Record<string, string> = {
  house: '房屋',
  secondhand: '二手',
  job: '招聘',
  lifebiz: '便民',
};

/**
 * 服务端 metadata 注入（MUST-21 + Phase 2.3）
 * - 优先级: Post.seoMeta (AI 生成) > 默认 fallback
 * - seoMeta 含 metaTitle / metaDescription / keywords / jsonLd
 * - 异步从后端拉数据（V1 简化：直接 fetch 一次）
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/posts/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return { title: '信息不存在 - 伊春有事儿说' };
    }
    const json = await res.json();
    const post: Post | undefined = json?.data;
    if (!post) {
      return { title: '信息不存在 - 伊春有事儿说' };
    }
    const typeName = TYPE_NAMES[post.type] || '信息';
    const url = `${BASE}/posts/${id}`;

    // Phase 2.3: 优先使用 AI 生成的 seoMeta（更高质量的搜索摘要）
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
  } catch {
    return { title: '伊春有事儿说' };
  }
}

/**
 * 服务端 JSON-LD 结构化数据（MUST-21 + Phase 2.3）
 * - 优先级: Post.seoMeta.jsonLd (AI 生成) > 默认 4-type schema.org 模板
 * - 百度/微信/神马 搜索结果中显示富媒体
 */
async function getPostForJsonLd(id: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/posts/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPostForJsonLd(id);
  // Phase 2.3: 优先使用 AI 生成的 jsonLd，否则 fallback 到 4-type 模板
  const aiJsonLd = post?.seoMeta?.jsonLd;
  const itemJsonLd = aiJsonLd && Object.keys(aiJsonLd).length > 0
    ? aiJsonLd
    : post
    ? buildJsonLd(post, id)
    : null;
  // T-P15-02 V1: BreadcrumbList JSON-LD（首页 → 分类 → 区县 → 帖子）
  const breadcrumbJsonLd = post ? buildBreadcrumbJsonLd(post, id) : null;

  // 合并到一个 @graph 数组里输出单一 script 节点（SEO 爬虫友好）
  const finalJsonLd = itemJsonLd || breadcrumbJsonLd
    ? {
        '@context': 'https://schema.org',
        '@graph': [
          ...(itemJsonLd ? [itemJsonLd] : []),
          ...(breadcrumbJsonLd ? [breadcrumbJsonLd] : []),
        ],
      }
    : null;

  return (
    <>
      {finalJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(finalJsonLd) }}
        />
      )}
      <PostDetailContent />
    </>
  );
}

/**
 * T-P15-02 V1: BreadcrumbList JSON-LD
 * 首页 → 分类过滤页 → 区县过滤页 → 帖子详情页
 */
function buildBreadcrumbJsonLd(post: any, id: string) {
  const url = `${BASE}/posts/${id}`;
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

function buildJsonLd(post: any, id: string) {
  const base: any = {
    '@context': 'https://schema.org',
    headline: post.title,
    description: (post.description || '').slice(0, 200),
    datePublished: post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    author: { '@type': 'Person', name: post.user?.nickname || '伊春有事儿说用户' },
    url: `${BASE}/posts/${id}`,
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
    default:
      return {
        ...base,
        '@type': 'Article',
      };
  }
}
