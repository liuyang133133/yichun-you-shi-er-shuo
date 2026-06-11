import type { Metadata } from 'next';
import { PostDetailContent } from './post-detail-content';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

const TYPE_NAMES: Record<string, string> = {
  house: '房屋',
  secondhand: '二手',
  job: '招聘',
  lifebiz: '便民',
};

/**
 * 服务端 metadata 注入（MUST-21）
 * - 标题/描述/OG/canonical 来自 post 详情
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
    const post = json?.data;
    if (!post) {
      return { title: '信息不存在 - 伊春有事儿说' };
    }
    const typeName = TYPE_NAMES[post.type] || '信息';
    const title = `${post.title} - ${typeName} | 伊春有事儿说`;
    const description = (post.description || post.title).slice(0, 160);
    const url = `${BASE}/posts/${id}`;

    return {
      title,
      description,
      keywords: [typeName, '伊春', '本地', '分类信息', post.title].filter(Boolean).join(','),
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
 * 服务端 JSON-LD 结构化数据（MUST-21）
 * - 百度/微信/神马 搜索结果中显示富媒体
 * - 4 大 type 对应不同 schema.org 类型
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
  const jsonLd = post ? buildJsonLd(post, id) : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PostDetailContent />
    </>
  );
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
