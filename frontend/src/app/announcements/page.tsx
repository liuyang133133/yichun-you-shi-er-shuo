import type { Metadata } from 'next';
import { AnnouncementsContent } from './announcements-content';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

/**
 * T-017: 公告公开列表页 — server entry
 * - 仅负责 metadata + 渲染 client 组件
 * - 客户端组件内部用 Suspense + useSearchParams
 */
export const metadata: Metadata = {
  title: '平台公告 - 伊春有事儿说',
  description: '伊春有事儿说官方公告列表：平台规则、功能更新、活动通知。',
  keywords: ['伊春', '公告', '平台通知', '有事儿说', '官方公告'],
  alternates: { canonical: `${BASE}/announcements` },
  openGraph: {
    title: '平台公告 - 伊春有事儿说',
    description: '伊春有事儿说官方公告列表：平台规则、功能更新、活动通知。',
    type: 'website',
    locale: 'zh_CN',
    siteName: '伊春有事儿说',
    url: `${BASE}/announcements`,
  },
  twitter: {
    card: 'summary',
    title: '平台公告 - 伊春有事儿说',
    description: '伊春有事儿说官方公告列表：平台规则、功能更新、活动通知。',
  },
};

export default function AnnouncementsPage() {
  return <AnnouncementsContent />;
}
