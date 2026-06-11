import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '伊春有事儿说',
    short_name: '伊春有事儿',
    description: '伊春本地生活信息平台 - 房屋出租 / 二手交易 / 招聘求职 / 便民信息',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f7a5e',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
