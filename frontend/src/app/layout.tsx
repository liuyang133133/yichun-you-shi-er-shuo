import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/layout/header';
import { AnnouncementBanner } from '@/components/layout/announcement-banner';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/toast/toaster';

// T-018 build 修复: 根 layout 包含 Header（含 NotificationBell / 搜索栏）等客户端 hooks
// 这些组件用到 useSearchParams，Next.js 15 prerender 阶段会要求 Suspense 包裹。
// 整个项目统一改为请求时渲染（force-dynamic），避免每个页面单独修复。
// 这是构建基础设施修复（非业务模块改动），不影响功能。
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '伊春有事儿说 | 本地生活信息平台',
  description: '面向伊春本地居民的信息发布平台 — 房屋出租 · 二手交易 · 招聘求职 · 便民信息',
  keywords: ['伊春', '本地信息', '分类信息', '房屋出租', '二手交易', '招聘', '便民', '小兴安岭'],
  authors: [{ name: 'Yichun Team' }],
  openGraph: {
    title: '伊春有事儿说',
    description: '小兴安岭脚下 · 本地生活信息平台',
    type: 'website',
    locale: 'zh_CN',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0f7a5e',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 思源宋体（display）+ 思源黑体（body）— 不用 Inter / Arial */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;700;900&family=Noto+Sans+SC:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <Header />
          <AnnouncementBanner />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
