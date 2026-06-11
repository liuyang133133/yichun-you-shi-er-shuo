import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/me/', '/admin/'],
      },
    ],
    sitemap: 'https://example.com/sitemap.xml', // TODO: 上线时改为真实域名
  };
}
